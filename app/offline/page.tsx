'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary/5 flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="mb-8">
          <Image
            src="/brand/regenr-icon-clean-1024.png"
            alt="ReGenr"
            width={80}
            height={80}
            className="mx-auto rounded-2xl shadow-lg"
          />
        </div>

        {/* Offline Icon */}
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-text-primary mb-3">
          You're Offline
        </h1>
        <p className="text-text-secondary mb-8">
          It looks like you've lost your internet connection. Please check your
          network and try again.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleRetry}
            className="w-full py-3 px-6 bg-gradient-to-r from-primary to-accent-purple text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            Try Again
          </button>
          <p className="text-sm text-text-secondary">
            Some features may be available offline once you've used them before.
          </p>
        </div>
      </div>

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-accent-purple/5 rounded-full blur-3xl" />
      </div>
    </div>
  )
}
