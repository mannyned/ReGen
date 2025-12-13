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
  hideReGenBranding?: boolean
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

  // Poll for job status
  useEffect(() => {
    if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') {
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
      const endpoint = `/api/analytics/export/${options.format}`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-user-plan': userPlan,
        },
        body: JSON.stringify({
          platforms: options.platforms.length > 0 ? options.platforms : undefined,
          dateFrom: options.dateFrom,
          dateTo: options.dateTo,
          includeCharts: options.includeCharts,
          includeLocationData: options.includeLocationData,
          includeRetention: options.includeRetention,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to start export')
      }

      setCurrentJob({ id: data.jobId, status: 'pending', progress: 0 })
      setStatus('processing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
      setStatus('failed')
    }
  }, [canExport, options, userId, userPlan])

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
                  <span className="text-3xl">❌</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Export Failed</h3>
                <p className="text-red-600 mb-6">{error || 'An error occurred during export'}</p>
                <button
                  onClick={resetState}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Try Again
                </button>
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
                              checked={options.whiteLabel?.hideReGenBranding || false}
                              onChange={(e) =>
                                setOptions((prev) => ({
                                  ...prev,
                                  whiteLabel: { ...prev.whiteLabel!, hideReGenBranding: e.target.checked },
                                }))
                              }
                              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700">Hide ReGen branding</span>
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
                      <span className="text-xl">🔗</span>
                      <div>
                        <p className="text-sm font-medium text-blue-900">Google Sheets Export</p>
                        <p className="text-xs text-blue-700 mt-1">
                          This will create a new Google Spreadsheet with your analytics data.
                          You'll need to connect your Google account if not already connected.
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
