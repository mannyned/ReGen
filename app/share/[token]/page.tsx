'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

interface LinkInfo {
  id: string
  hasPassword: boolean
  requiresEmail: boolean
  expiresAt: string
  remainingDownloads: number | null
}

interface PageProps {
  params: Promise<{ token: string }>
}

export default function SharePage({ params }: PageProps) {
  const { token } = use(params)
  const router = useRouter()
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)

  // Form state
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')

  // Fetch link info on mount
  useEffect(() => {
    fetchLinkInfo()
  }, [token])

  const fetchLinkInfo = async () => {
    try {
      const response = await fetch(`/api/share/${token}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Link not found')
        return
      }

      setLinkInfo(data.link)
    } catch (err) {
      setError('Failed to load link information')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifying(true)
    setError(null)

    try {
      const response = await fetch(`/api/share/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: linkInfo?.hasPassword ? password : undefined,
          email: linkInfo?.requiresEmail ? email : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Access denied')
        setVerifying(false)
        return
      }

      // Access granted - redirect to download
      if (data.download?.url) {
        window.location.href = data.download.url
      }
    } catch (err) {
      setError('Failed to verify access')
    } finally {
      setVerifying(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Error state (link not found, expired, etc.)
  if (error && !linkInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Unavailable</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    )
  }

  // Main access form
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-3xl">✨</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              ReGen
            </span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Analytics Report</h1>
          <p className="text-gray-600 mt-1">Someone shared a report with you</p>
        </div>

        {/* Access Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Link Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Shared Analytics Export</p>
                <p className="text-sm text-gray-500">
                  {linkInfo?.remainingDownloads !== null
                    ? `${linkInfo.remainingDownloads} downloads remaining`
                    : 'Unlimited downloads'}
                </p>
              </div>
            </div>
          </div>

          {/* Access Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field (if required) */}
            {linkInfo?.requiresEmail && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your email"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Only authorized email addresses can access this file
                </p>
              </div>
            )}

            {/* Password field (if required) */}
            {linkInfo?.hasPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter password"
                />
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={verifying}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {verifying ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Verifying...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Report
                </>
              )}
            </button>
          </form>

          {/* Expiration notice */}
          {linkInfo?.expiresAt && (
            <p className="mt-4 text-center text-xs text-gray-500">
              This link expires on {new Date(linkInfo.expiresAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Powered by{' '}
            <a href="/" className="text-indigo-600 hover:text-indigo-700">
              ReGen
            </a>{' '}
            • AI-Powered Analytics
          </p>
        </div>
      </div>
    </div>
  )
}
