// ============================================
// SCHEDULED REPORT SERVICE
// PRO-Only Feature - Automated Report Generation
// ============================================

import { v4 as uuidv4 } from 'uuid'
import type {
  ScheduledReport,
  ScheduledReportCreateInput,
  ExportOptions,
  ScheduleFrequency,
} from '@/lib/types/export'
import type { PlanTier } from '@prisma/client'

// In-memory store for development (replace with database in production)
const scheduledReports = new Map<string, ScheduledReport>()

// Cron job handlers (to be initialized with node-cron)
const activeJobs = new Map<string, NodeJS.Timeout>()

interface DeliveryResult {
  success: boolean
  deliveredTo?: string
  error?: string
}

export class ScheduledReportService {
  /**
   * Create a new scheduled report
   */
  async createScheduledReport(
    input: ScheduledReportCreateInput,
    userPlan: PlanTier
  ): Promise<ScheduledReport> {
    // Validate PRO access
    if (userPlan === 'FREE') {
      throw new Error('Scheduled reports are a PRO-only feature')
    }

    // Validate frequency limits by plan
    const existingReports = await this.getUserScheduledReports(input.userId)
    const maxReports = userPlan === 'PRO' ? 10 : 3 // PRO gets more

    if (existingReports.length >= maxReports) {
      throw new Error(`Maximum ${maxReports} scheduled reports allowed for your plan`)
    }

    const report: ScheduledReport = {
      id: uuidv4(),
      userId: input.userId,
      name: input.name,
      description: input.description,
      frequency: input.frequency,
      dayOfWeek: input.dayOfWeek,
      dayOfMonth: input.dayOfMonth,
      hour: input.hour,
      minute: input.minute,
      timezone: input.timezone,
      format: input.format,
      options: input.options,
      deliveryMethod: input.deliveryMethod,
      deliveryConfig: input.deliveryConfig,
      isActive: true,
      runCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      nextRunAt: this.calculateNextRun(input),
    }

    scheduledReports.set(report.id, report)

    // Schedule the job
    this.scheduleJob(report)

    return report
  }

  /**
   * Get all scheduled reports for a user
   */
  async getUserScheduledReports(userId: string): Promise<ScheduledReport[]> {
    const reports: ScheduledReport[] = []
    for (const report of scheduledReports.values()) {
      if (report.userId === userId) {
        reports.push(report)
      }
    }
    return reports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  /**
   * Get a specific scheduled report
   */
  async getScheduledReport(reportId: string, userId: string): Promise<ScheduledReport | null> {
    const report = scheduledReports.get(reportId)
    if (!report || report.userId !== userId) {
      return null
    }
    return report
  }

  /**
   * Update a scheduled report
   */
  async updateScheduledReport(
    reportId: string,
    userId: string,
    updates: Partial<ScheduledReportCreateInput>
  ): Promise<ScheduledReport | null> {
    const report = scheduledReports.get(reportId)
    if (!report || report.userId !== userId) {
      return null
    }

    // Cancel existing job
    this.cancelJob(reportId)

    // Apply updates
    const updatedReport: ScheduledReport = {
      ...report,
      ...updates,
      updatedAt: new Date(),
      nextRunAt: this.calculateNextRun({
        frequency: updates.frequency || report.frequency,
        dayOfWeek: updates.dayOfWeek ?? report.dayOfWeek,
        dayOfMonth: updates.dayOfMonth ?? report.dayOfMonth,
        hour: updates.hour ?? report.hour,
        minute: updates.minute ?? report.minute,
        timezone: updates.timezone || report.timezone,
      } as ScheduledReportCreateInput),
    }

    scheduledReports.set(reportId, updatedReport)

    // Reschedule if active
    if (updatedReport.isActive) {
      this.scheduleJob(updatedReport)
    }

    return updatedReport
  }

  /**
   * Toggle report active status
   */
  async toggleReportStatus(reportId: string, userId: string): Promise<ScheduledReport | null> {
    const report = scheduledReports.get(reportId)
    if (!report || report.userId !== userId) {
      return null
    }

    report.isActive = !report.isActive
    report.updatedAt = new Date()

    if (report.isActive) {
      report.nextRunAt = this.calculateNextRun(report)
      this.scheduleJob(report)
    } else {
      this.cancelJob(reportId)
      report.nextRunAt = undefined
    }

    scheduledReports.set(reportId, report)
    return report
  }

  /**
   * Delete a scheduled report
   */
  async deleteScheduledReport(reportId: string, userId: string): Promise<boolean> {
    const report = scheduledReports.get(reportId)
    if (!report || report.userId !== userId) {
      return false
    }

    this.cancelJob(reportId)
    scheduledReports.delete(reportId)
    return true
  }

  /**
   * Calculate the next run time for a scheduled report
   */
  private calculateNextRun(
    config: Pick<
      ScheduledReportCreateInput,
      'frequency' | 'dayOfWeek' | 'dayOfMonth' | 'hour' | 'minute' | 'timezone'
    >
  ): Date {
    const now = new Date()
    let next = new Date(now)

    // Set the time
    next.setHours(config.hour, config.minute, 0, 0)

    // If already past today's time, move to next occurrence
    if (next <= now) {
      switch (config.frequency) {
        case 'daily':
          next.setDate(next.getDate() + 1)
          break
        case 'weekly':
          next.setDate(next.getDate() + 1)
          break
        case 'monthly':
          next.setMonth(next.getMonth() + 1)
          break
        case 'quarterly':
          next.setMonth(next.getMonth() + 3)
          break
      }
    }

    // Adjust for specific day of week (weekly reports)
    if (config.frequency === 'weekly' && config.dayOfWeek !== undefined) {
      const currentDay = next.getDay()
      const targetDay = config.dayOfWeek
      let daysToAdd = targetDay - currentDay
      if (daysToAdd <= 0) {
        daysToAdd += 7
      }
      if (daysToAdd > 0) {
        next.setDate(next.getDate() + daysToAdd)
      }
    }

    // Adjust for specific day of month (monthly/quarterly reports)
    if (
      (config.frequency === 'monthly' || config.frequency === 'quarterly') &&
      config.dayOfMonth !== undefined
    ) {
      next.setDate(config.dayOfMonth)
      if (next <= now) {
        const monthsToAdd = config.frequency === 'quarterly' ? 3 : 1
        next.setMonth(next.getMonth() + monthsToAdd)
      }
    }

    return next
  }

  /**
   * Schedule a job using setTimeout (for development)
   * In production, use node-cron or a job queue like Bull
   */
  private scheduleJob(report: ScheduledReport): void {
    if (!report.nextRunAt) return

    const now = new Date()
    const delay = report.nextRunAt.getTime() - now.getTime()

    if (delay <= 0) {
      // Run immediately if past due
      this.executeReport(report.id)
      return
    }

    // Use setTimeout for scheduling (max ~24 days due to 32-bit limit)
    // For longer delays, we'd need to reschedule periodically
    const maxDelay = 2147483647 // ~24.8 days
    const actualDelay = Math.min(delay, maxDelay)

    const timeout = setTimeout(() => {
      if (delay > maxDelay) {
        // Reschedule for remaining time
        this.scheduleJob(report)
      } else {
        this.executeReport(report.id)
      }
    }, actualDelay)

    activeJobs.set(report.id, timeout)
  }

  /**
   * Cancel a scheduled job
   */
  private cancelJob(reportId: string): void {
    const timeout = activeJobs.get(reportId)
    if (timeout) {
      clearTimeout(timeout)
      activeJobs.delete(reportId)
    }
  }

  /**
   * Execute a scheduled report
   */
  private async executeReport(reportId: string): Promise<void> {
    const report = scheduledReports.get(reportId)
    if (!report || !report.isActive) return

    console.log(`[ScheduledReportService] Executing report: ${report.name} (${reportId})`)

    try {
      // Generate the export
      const exportResult = await this.generateExport(report)

      // Deliver the export
      const deliveryResult = await this.deliverExport(report, exportResult)

      // Update report status
      report.lastRunAt = new Date()
      report.lastStatus = deliveryResult.success ? 'success' : 'failed'
      report.lastError = deliveryResult.error
      report.runCount++
      report.nextRunAt = this.calculateNextRun(report)
      report.updatedAt = new Date()

      scheduledReports.set(reportId, report)

      // Schedule next run
      this.scheduleJob(report)

      console.log(
        `[ScheduledReportService] Report ${reportId} completed: ${deliveryResult.success ? 'success' : 'failed'}`
      )
    } catch (error) {
      console.error(`[ScheduledReportService] Report ${reportId} failed:`, error)

      report.lastRunAt = new Date()
      report.lastStatus = 'failed'
      report.lastError = error instanceof Error ? error.message : 'Unknown error'
      report.runCount++
      report.nextRunAt = this.calculateNextRun(report)
      report.updatedAt = new Date()

      scheduledReports.set(reportId, report)

      // Schedule next run despite failure
      this.scheduleJob(report)
    }
  }

  /**
   * Generate the export file
   */
  private async generateExport(
    report: ScheduledReport
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    // Import services dynamically to avoid circular dependencies
    const { ExportService } = await import('./ExportService')
    const exportService = new ExportService()

    // Calculate date range based on frequency
    const dateRange = this.getReportDateRange(report.frequency)

    const options: ExportOptions = {
      ...report.options,
      filters: {
        ...report.options.filters,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
      },
    }

    // For now, we'll simulate the export
    // In production, this would use the actual export services
    const fileName = `${report.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}`

    // This is a placeholder - actual implementation would generate real files
    const buffer = Buffer.from(`Report: ${report.name}\nGenerated: ${new Date().toISOString()}`)

    const mimeTypes: Record<string, string> = {
      csv: 'text/csv',
      pdf: 'application/pdf',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }

    return {
      buffer,
      fileName: `${fileName}.${report.format}`,
      mimeType: mimeTypes[report.format] || 'application/octet-stream',
    }
  }

  /**
   * Get date range based on report frequency
   */
  private getReportDateRange(frequency: ScheduleFrequency): { from: Date; to: Date } {
    const to = new Date()
    const from = new Date()

    switch (frequency) {
      case 'daily':
        from.setDate(from.getDate() - 1)
        break
      case 'weekly':
        from.setDate(from.getDate() - 7)
        break
      case 'monthly':
        from.setMonth(from.getMonth() - 1)
        break
      case 'quarterly':
        from.setMonth(from.getMonth() - 3)
        break
    }

    return { from, to }
  }

  /**
   * Deliver the export based on delivery method
   */
  private async deliverExport(
    report: ScheduledReport,
    exportResult: { buffer: Buffer; fileName: string; mimeType: string }
  ): Promise<DeliveryResult> {
    switch (report.deliveryMethod) {
      case 'email':
        return this.deliverByEmail(report, exportResult)
      case 'webhook':
        return this.deliverByWebhook(report, exportResult)
      case 'google_drive':
        return this.deliverToGoogleDrive(report, exportResult)
      case 'download':
        // Store for user to download later
        return this.storeForDownload(report, exportResult)
      default:
        return { success: false, error: `Unknown delivery method: ${report.deliveryMethod}` }
    }
  }

  /**
   * Deliver report via email
   */
  private async deliverByEmail(
    report: ScheduledReport,
    exportResult: { buffer: Buffer; fileName: string; mimeType: string }
  ): Promise<DeliveryResult> {
    const emails = report.deliveryConfig.emails || []
    if (emails.length === 0) {
      return { success: false, error: 'No email addresses configured' }
    }

    // In production, use a real email service (SendGrid, AWS SES, etc.)
    console.log(`[Email] Would send ${exportResult.fileName} to: ${emails.join(', ')}`)

    // Simulate email sending
    // const emailService = new EmailService()
    // await emailService.sendWithAttachment({
    //   to: emails,
    //   subject: `Scheduled Report: ${report.name}`,
    //   body: `Your scheduled report "${report.name}" is attached.`,
    //   attachment: {
    //     filename: exportResult.fileName,
    //     content: exportResult.buffer,
    //     contentType: exportResult.mimeType,
    //   },
    // })

    return { success: true, deliveredTo: emails.join(', ') }
  }

  /**
   * Deliver report via webhook
   */
  private async deliverByWebhook(
    report: ScheduledReport,
    exportResult: { buffer: Buffer; fileName: string; mimeType: string }
  ): Promise<DeliveryResult> {
    const webhookUrl = report.deliveryConfig.webhookUrl
    if (!webhookUrl) {
      return { success: false, error: 'No webhook URL configured' }
    }

    try {
      // In production, make actual HTTP request
      console.log(`[Webhook] Would POST to: ${webhookUrl}`)

      // const response = await fetch(webhookUrl, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     reportId: report.id,
      //     reportName: report.name,
      //     fileName: exportResult.fileName,
      //     fileSize: exportResult.buffer.length,
      //     generatedAt: new Date().toISOString(),
      //     // Include download URL or base64 encoded content
      //   }),
      // })

      return { success: true, deliveredTo: webhookUrl }
    } catch (error) {
      return {
        success: false,
        error: `Webhook delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Deliver report to Google Drive
   */
  private async deliverToGoogleDrive(
    report: ScheduledReport,
    exportResult: { buffer: Buffer; fileName: string; mimeType: string }
  ): Promise<DeliveryResult> {
    const folderId = report.deliveryConfig.googleDriveFolderId
    if (!folderId) {
      return { success: false, error: 'No Google Drive folder configured' }
    }

    // In production, use Google Drive API
    console.log(`[Google Drive] Would upload ${exportResult.fileName} to folder: ${folderId}`)

    // const drive = google.drive({ version: 'v3', auth: oauth2Client })
    // await drive.files.create({
    //   requestBody: {
    //     name: exportResult.fileName,
    //     parents: [folderId],
    //   },
    //   media: {
    //     mimeType: exportResult.mimeType,
    //     body: Readable.from(exportResult.buffer),
    //   },
    // })

    return { success: true, deliveredTo: `Google Drive folder: ${folderId}` }
  }

  /**
   * Store report for later download
   */
  private async storeForDownload(
    report: ScheduledReport,
    exportResult: { buffer: Buffer; fileName: string; mimeType: string }
  ): Promise<DeliveryResult> {
    // In production, upload to cloud storage and store URL
    console.log(`[Storage] Would store ${exportResult.fileName} for download`)

    // const storage = new CloudStorageService()
    // const url = await storage.upload(exportResult.buffer, exportResult.fileName)
    // Store URL in database for user to access

    return { success: true, deliveredTo: 'Download center' }
  }

  /**
   * Get report run history
   */
  async getReportHistory(
    reportId: string,
    userId: string
  ): Promise<{ lastRun: Date | undefined; status: string; runCount: number } | null> {
    const report = scheduledReports.get(reportId)
    if (!report || report.userId !== userId) {
      return null
    }

    return {
      lastRun: report.lastRunAt,
      status: report.lastStatus || 'never_run',
      runCount: report.runCount,
    }
  }

  /**
   * Manually trigger a report (run now)
   */
  async runReportNow(reportId: string, userId: string): Promise<boolean> {
    const report = scheduledReports.get(reportId)
    if (!report || report.userId !== userId) {
      return false
    }

    // Execute immediately
    await this.executeReport(reportId)
    return true
  }
}

// Export singleton instance
export const scheduledReportService = new ScheduledReportService()
