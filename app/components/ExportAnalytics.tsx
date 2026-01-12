'use client'

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PlatformLogo, PLATFORM_NAMES } from './ui/PlatformLogo'
import type { SocialPlatform } from '@/lib/types/social'

// ============================================
// EXPORT ANALYTICS COMPONENT
// PRO-only feature for exporting analytics
// Supports CSV, PDF, Excel, and Google Sheets
// ============================================

type ExportFormat = 'csv' | 'pdf' | 'excel' | 'google_sheets'
type ExportStatus = 'idle' | 'preparing' | 'processing' | 'completed' | 'failed'

interface WhiteLabelOptions {
  enabled: boolean
  companyName?: string
  companyLogo?: string
  primaryColor?: string
  secondaryColor?: string
  hideReGenrBranding?: boolean
}

interface ExportOptions {
  format: ExportFormat
  platforms: string[]
  dateFrom: string
  dateTo: string
  includeCharts: boolean
  includeLocationData: boolean
  includeRetention: boolean
  // White-label options for PDF
  whiteLabel?: WhiteLabelOptions
}

interface ExportJob {
  id: string
  status: string
  progress: number
  error?: string
}

interface ExportAnalyticsProps {
  userId: string
  userPlan: 'free' | 'creator' | 'pro'
  availablePlatforms?: string[]
  onExportComplete?: (jobId: string, format: ExportFormat) => void
}

// Platform configuration using official brand logos
const DEFAULT_PLATFORMS: { id: SocialPlatform; name: string }[] = [
  { id: 'instagram', name: 'Instagram' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'twitter', name: 'X (Twitter)' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'snapchat', name: 'Snapchat' },
  { id: 'pinterest', name: 'Pinterest' },
  { id: 'discord', name: 'Discord' },
]

// Modal Portal Component - renders modal at document body level
function ModalPortal({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted || !isOpen) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      {children}
    </div>,
    document.body
  )
}

export function ExportAnalytics({
  userId,
  userPlan,
  availablePlatforms,
  onExportComplete,
}: ExportAnalyticsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<ExportStatus>('idle')
  const [currentJob, setCurrentJob] = useState<ExportJob | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Export options state
  const [options, setOptions] = useState<ExportOptions>({
    format: 'csv',
    platforms: [],
    dateFrom: getDefaultDateFrom(),
    dateTo: getDefaultDateTo(),
    includeCharts: true,
    includeLocationData: true,
    includeRetention: true,
  })

  // Filter available platforms
  const platforms = DEFAULT_PLATFORMS.filter(
    (p) => !availablePlatforms || availablePlatforms.includes(p.id)
  )

  // Check if user can export
  const canExport = userPlan === 'pro'

  // Poll for job status (only for job-based exports, not direct exports)
  useEffect(() => {
    if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') {
      return
    }

    // Skip polling for direct exports (they don't use job system)
    const directExportIds = ['direct', 'google_sheets', 'google_connect']
    if (directExportIds.includes(currentJob.id)) {
      return
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/analytics/export/status/${currentJob.id}?userId=${userId}&userPlan=${userPlan}`
        )
        const data = await response.json()

        if (data.success) {
          setCurrentJob(data.job)

          if (data.job.status === 'completed') {
            setStatus('completed')
            onExportComplete?.(data.job.id, options.format)
            clearInterval(pollInterval)
          } else if (data.job.status === 'failed') {
            setStatus('failed')
            setError(data.job.error || 'Export failed')
            clearInterval(pollInterval)
          }
        }
      } catch (err) {
        console.error('Failed to poll job status:', err)
      }
    }, 1000) // Poll every 1 second for faster response

    return () => clearInterval(pollInterval)
  }, [currentJob, userId, userPlan, options.format, onExportComplete])

  // Start export
  const handleExport = useCallback(async () => {
    if (!canExport) return

    setStatus('preparing')
    setError(null)

    try {
      // Calculate days from date range
      const fromDate = new Date(options.dateFrom)
      const toDate = new Date(options.dateTo)
      const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) || 30

      // For CSV, use the fast direct export endpoint
      if (options.format === 'csv') {
        setStatus('processing')
        setCurrentJob({ id: 'direct', status: 'processing', progress: 50 })

        // Build query params including platforms filter
        const csvParams = new URLSearchParams({
          format: 'csv',
          days: days.toString(),
        })
        if (options.platforms.length > 0) {
          csvParams.set('platforms', options.platforms.join(','))
        }

        const response = await fetch(`/api/analytics/export/direct?${csvParams.toString()}`)

        if (!response.ok) {
          const contentType = response.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Export failed')
          }
          throw new Error(`Export failed: ${response.statusText}`)
        }

        // Download the CSV directly
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `regen_analytics_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        setStatus('completed')
        setCurrentJob({ id: 'direct', status: 'completed', progress: 100 })
        onExportComplete?.('direct', 'csv')

        // Auto close after success
        setTimeout(() => {
          setIsOpen(false)
          resetState()
        }, 1500)
        return
      }

      // For PDF, open printable report in new tab
      if (options.format === 'pdf') {
        setStatus('processing')
        setCurrentJob({ id: 'direct', status: 'processing', progress: 50 })

        // Build URL with platforms and white-label options
        const params = new URLSearchParams({
          format: 'pdf',
          days: days.toString(),
        })

        // Add platforms filter if selected
        if (options.platforms.length > 0) {
          params.set('platforms', options.platforms.join(','))
        }

        // Add white-label options if enabled
        if (options.whiteLabel?.enabled) {
          params.set('whiteLabel', 'true')
          if (options.whiteLabel.companyName) {
            params.set('companyName', options.whiteLabel.companyName)
          }
          if (options.whiteLabel.primaryColor) {
            params.set('primaryColor', options.whiteLabel.primaryColor)
          }
          if (options.whiteLabel.secondaryColor) {
            params.set('secondaryColor', options.whiteLabel.secondaryColor)
          }
          if (options.whiteLabel.hideReGenrBranding) {
            params.set('hideBranding', 'true')
          }
        }

        // Open PDF report in new window for printing
        window.open(`/api/analytics/export/direct?${params.toString()}`, '_blank')

        setStatus('completed')
        setCurrentJob({ id: 'direct', status: 'completed', progress: 100 })
        onExportComplete?.('direct', 'pdf')

        // Auto close after success
        setTimeout(() => {
          setIsOpen(false)
          resetState()
        }, 1500)
        return
      }

      // For Excel, download directly
      if (options.format === 'excel') {
        setStatus('processing')
        setCurrentJob({ id: 'direct', status: 'processing', progress: 50 })

        const response = await fetch(`/api/analytics/export/excel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platforms: options.platforms.length > 0 ? options.platforms : undefined,
            dateFrom: options.dateFrom,
            dateTo: options.dateTo,
          }),
        })

        if (!response.ok) {
          // Try to get error message
          const contentType = response.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Export failed')
          }
          throw new Error('Export failed')
        }

        // Download the Excel file directly
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `regen_analytics_${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        setStatus('completed')
        setCurrentJob({ id: 'direct', status: 'completed', progress: 100 })
        onExportComplete?.('direct', 'excel')

        // Auto close after success
        setTimeout(() => {
          setIsOpen(false)
          resetState()
        }, 1500)
        return
      }

      // For Google Sheets, use the dedicated endpoint
      if (options.format === 'google_sheets') {
        setStatus('processing')
        setCurrentJob({ id: 'google_sheets', status: 'processing', progress: 50 })

        const response = await fetch('/api/analytics/export/google-sheets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            days,
            platforms: options.platforms.length > 0 ? options.platforms : undefined,
          }),
        })

        // Handle non-JSON responses
        const contentType = response.headers.get('content-type')
        if (!contentType?.includes('application/json')) {
          throw new Error('Server error. Please try again.')
        }

        const text = await response.text()
        if (!text || text.trim() === '') {
          throw new Error('Empty response from server. Please try again.')
        }

        let data
        try {
          data = JSON.parse(text)
        } catch {
          console.error('Failed to parse response:', text.substring(0, 200))
          throw new Error('Invalid response from server. Please try again.')
        }

        if (!data.success) {
          // Handle Google not connected
          if (data.code === 'GOOGLE_NOT_CONNECTED' || data.code === 'TOKEN_EXPIRED' || data.code === 'INSUFFICIENT_SCOPE') {
            setError(data.message || 'Please connect your Google account to export to Google Sheets.')
            setStatus('failed')
            // Store the connect URL for the retry button
            setCurrentJob({ id: 'google_connect', status: 'failed', progress: 0, error: data.connectUrl })
            return
          }
          throw new Error(data.error || data.message || 'Failed to create Google Spreadsheet')
        }

        // Success! Open the spreadsheet in a new tab
        if (data.spreadsheetUrl) {
          window.open(data.spreadsheetUrl, '_blank')
        }

        setStatus('completed')
        setCurrentJob({ id: 'google_sheets', status: 'completed', progress: 100 })
        onExportComplete?.('google_sheets', 'google_sheets')

        // Auto close after success
        setTimeout(() => {
          setIsOpen(false)
          resetState()
        }, 2000)
        return
      }

      // For other formats, show not implemented message
      throw new Error('This export format is not yet available. Please try CSV, Excel, or PDF.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
      setStatus('failed')
    }
  }, [canExport, options, userId, userPlan, onExportComplete])

  // Download export
  const handleDownload = useCallback(async () => {
    if (!currentJob) return

    try {
      const response = await fetch(
        `/api/analytics/export/download/${currentJob.id}?userId=${userId}&userPlan=${userPlan}`
      )

      if (!response.ok) {
        throw new Error('Download failed')
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `regen_export.${options.format}`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) filename = match[1]
      }

      // Create blob and download
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Close modal after download
      setIsOpen(false)
      resetState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    }
  }, [currentJob, userId, userPlan, options.format])

  // Reset state
  const resetState = () => {
    setStatus('idle')
    setCurrentJob(null)
    setError(null)
  }

  // Toggle platform selection
  const togglePlatform = (platformId: string) => {
    setOptions((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter((p) => p !== platformId)
        : [...prev.platforms, platformId],
    }))
  }

  // If user is not PRO, show upgrade prompt
  if (!canExport) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-xl cursor-not-allowed"
          disabled
        >
          <span>📥</span>
          <span>Export Analytics</span>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">PRO</span>
        </button>

        <ModalPortal isOpen={isOpen}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔒</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">PRO Feature</h2>
              <p className="text-gray-600 mb-6">
                Export your analytics data to CSV or PDF reports. Upgrade to PRO to unlock this feature.
              </p>
              <div className="space-y-3">
                <a
                  href="/settings"
                  className="block w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                  Upgrade to PRO - $29/mo
                </a>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full py-3 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Export Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl"
      >
        <span>📥</span>
        <span>Export Analytics</span>
      </button>

      {/* Export Modal */}
      <ModalPortal isOpen={isOpen}>
        <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Export Analytics</h2>
              <button
                onClick={() => {
                  setIsOpen(false)
                  resetState()
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Status: Processing */}
            {status === 'processing' && currentJob && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <span className="text-3xl">⚙️</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating Export...</h3>
                <p className="text-gray-600 mb-4">
                  {options.format === 'pdf' ? 'Creating your PDF report' : 'Preparing your CSV file'}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${currentJob.progress || 10}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500">{currentJob.progress || 0}% complete</p>
              </div>
            )}

            {/* Status: Completed */}
            {status === 'completed' && currentJob && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✅</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Export Ready!</h3>
                <p className="text-gray-600 mb-6">
                  Your {options.format.toUpperCase()} export is ready for download.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={handleDownload}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
                  >
                    📥 Download {options.format.toUpperCase()}
                  </button>
                  <button
                    onClick={() => {
                      resetState()
                    }}
                    className="w-full py-3 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Export Another
                  </button>
                </div>
              </div>
            )}

            {/* Status: Failed */}
            {status === 'failed' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">{currentJob?.id === 'google_connect' ? '🔗' : '❌'}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {currentJob?.id === 'google_connect' ? 'Google Account Required' : 'Export Failed'}
                </h3>
                <p className="text-red-600 mb-6">{error || 'An error occurred during export'}</p>
                <div className="space-y-3">
                  {currentJob?.id === 'google_connect' && currentJob?.error && (
                    <button
                      onClick={() => {
                        // Open Google OAuth in popup
                        const width = 500
                        const height = 600
                        const left = window.screenX + (window.outerWidth - width) / 2
                        const top = window.screenY + (window.outerHeight - height) / 2
                        window.open(
                          currentJob.error,
                          'google-connect',
                          `width=${width},height=${height},left=${left},top=${top}`
                        )
                      }}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Connect Google Account
                    </button>
                  )}
                  <button
                    onClick={resetState}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    {currentJob?.id === 'google_connect' ? 'Try Again After Connecting' : 'Try Again'}
                  </button>
                </div>
              </div>
            )}

            {/* Status: Idle - Show options */}
            {(status === 'idle' || status === 'preparing') && (
              <>
                {/* Format Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setOptions((prev) => ({ ...prev, format: 'csv' }))}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        options.format === 'csv'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">📊</div>
                      <div className="font-semibold text-gray-900">CSV</div>
                      <div className="text-xs text-gray-500">Basic spreadsheet</div>
                    </button>
                    <button
                      onClick={() => setOptions((prev) => ({ ...prev, format: 'excel' }))}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        options.format === 'excel'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">📗</div>
                      <div className="font-semibold text-gray-900">Excel</div>
                      <div className="text-xs text-gray-500">Formatted workbook</div>
                    </button>
                    <button
                      onClick={() => setOptions((prev) => ({ ...prev, format: 'pdf' }))}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        options.format === 'pdf'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">📄</div>
                      <div className="font-semibold text-gray-900">PDF</div>
                      <div className="text-xs text-gray-500">Professional report</div>
                    </button>
                    <button
                      onClick={() => setOptions((prev) => ({ ...prev, format: 'google_sheets' }))}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        options.format === 'google_sheets'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">📋</div>
                      <div className="font-semibold text-gray-900">Google Sheets</div>
                      <div className="text-xs text-gray-500">Direct export</div>
                    </button>
                  </div>
                </div>

                {/* Date Range */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">From</label>
                      <input
                        type="date"
                        value={options.dateFrom}
                        onChange={(e) => setOptions((prev) => ({ ...prev, dateFrom: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">To</label>
                      <input
                        type="date"
                        value={options.dateTo}
                        onChange={(e) => setOptions((prev) => ({ ...prev, dateTo: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Platform Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platforms <span className="text-gray-400 font-normal">(leave empty for all)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() => togglePlatform(platform.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                          options.platforms.includes(platform.id)
                            ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                            : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                        }`}
                      >
                        <PlatformLogo platform={platform.id} size="xs" variant="color" />
                        <span>{platform.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* PDF Options */}
                {options.format === 'pdf' && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                    <label className="block text-sm font-medium text-gray-700 mb-3">PDF Options</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={options.includeCharts}
                          onChange={(e) =>
                            setOptions((prev) => ({ ...prev, includeCharts: e.target.checked }))
                          }
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">Include charts and visualizations</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={options.includeLocationData}
                          onChange={(e) =>
                            setOptions((prev) => ({ ...prev, includeLocationData: e.target.checked }))
                          }
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">Include location analytics</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={options.includeRetention}
                          onChange={(e) =>
                            setOptions((prev) => ({ ...prev, includeRetention: e.target.checked }))
                          }
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">Include retention graphs</span>
                      </label>
                    </div>

                    {/* White-label options */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <label className="flex items-center gap-3 cursor-pointer mb-3">
                        <input
                          type="checkbox"
                          checked={options.whiteLabel?.enabled || false}
                          onChange={(e) =>
                            setOptions((prev) => ({
                              ...prev,
                              whiteLabel: { ...prev.whiteLabel, enabled: e.target.checked },
                            }))
                          }
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700 font-medium">Enable white-label branding</span>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">PRO+</span>
                      </label>

                      {options.whiteLabel?.enabled && (
                        <div className="space-y-3 pl-7">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Company Name</label>
                            <input
                              type="text"
                              value={options.whiteLabel?.companyName || ''}
                              onChange={(e) =>
                                setOptions((prev) => ({
                                  ...prev,
                                  whiteLabel: { ...prev.whiteLabel!, companyName: e.target.value },
                                }))
                              }
                              placeholder="Your Company"
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Primary Color</label>
                              <input
                                type="color"
                                value={options.whiteLabel?.primaryColor || '#6366F1'}
                                onChange={(e) =>
                                  setOptions((prev) => ({
                                    ...prev,
                                    whiteLabel: { ...prev.whiteLabel!, primaryColor: e.target.value },
                                  }))
                                }
                                className="w-full h-9 rounded-lg border border-gray-200 cursor-pointer"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Secondary Color</label>
                              <input
                                type="color"
                                value={options.whiteLabel?.secondaryColor || '#8B5CF6'}
                                onChange={(e) =>
                                  setOptions((prev) => ({
                                    ...prev,
                                    whiteLabel: { ...prev.whiteLabel!, secondaryColor: e.target.value },
                                  }))
                                }
                                className="w-full h-9 rounded-lg border border-gray-200 cursor-pointer"
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={options.whiteLabel?.hideReGenrBranding || false}
                              onChange={(e) =>
                                setOptions((prev) => ({
                                  ...prev,
                                  whiteLabel: { ...prev.whiteLabel!, hideReGenrBranding: e.target.checked },
                                }))
                              }
                              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700">Hide ReGenr branding</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Google Sheets notice */}
                {options.format === 'google_sheets' && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-blue-600 mt-0.5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M19.385 2H4.615A2.615 2.615 0 0 0 2 4.615v14.77A2.615 2.615 0 0 0 4.615 22h14.77A2.615 2.615 0 0 0 22 19.385V4.615A2.615 2.615 0 0 0 19.385 2zM7 17v-2h4v2H7zm0-4v-2h6v2H7zm0-4V7h10v2H7zm10 8h-4v-6h4v6z"/>
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-blue-900">Google Sheets Export</p>
                        <p className="text-xs text-blue-700 mt-1">
                          Creates a formatted Google Spreadsheet in your Google Drive with analytics data and summary.
                          Requires a connected Google account.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Export Button */}
                <button
                  onClick={handleExport}
                  disabled={status === 'preparing'}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {status === 'preparing' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Preparing...
                    </span>
                  ) : (
                    `Export ${options.format.toUpperCase()}`
                  )}
                </button>

                {/* Info text */}
                <p className="text-xs text-gray-500 text-center mt-3">
                  {options.format === 'csv' && 'CSV exports include all analytics data in a basic spreadsheet format'}
                  {options.format === 'excel' && 'Excel exports include formatted worksheets with summary, charts, and full data'}
                  {options.format === 'pdf' && 'PDF reports are professionally formatted with customizable branding'}
                  {options.format === 'google_sheets' && 'Creates a shareable Google Spreadsheet with your analytics data'}
                </p>
              </>
            )}
          </div>
      </ModalPortal>
    </div>
  )
}

// Helper functions
function getDefaultDateFrom(): string {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().split('T')[0]
}

function getDefaultDateTo(): string {
  return new Date().toISOString().split('T')[0]
}

export default ExportAnalytics
