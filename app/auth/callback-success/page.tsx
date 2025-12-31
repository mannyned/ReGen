'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function CallbackSuccessContent() {
  const searchParams = useSearchParams()
  const provider = searchParams.get('provider') || 'Platform'
  const error = searchParams.get('error')

  useEffect(() => {
    // Close popup after a brief delay
    const timer = setTimeout(() => {
      window.close()
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Connection Failed</h1>
          <p className="text-gray-600 mb-4">Could not connect to {provider}</p>
          <p className="text-sm text-gray-500">This window will close automatically...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Connected!</h1>
        <p className="text-gray-600 mb-4">{provider} has been connected successfully</p>
        <p className="text-sm text-gray-500">This window will close automatically...</p>
      </div>
    </div>
  )
}

export default function CallbackSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center animate-pulse">
            <div className="w-8 h-8 bg-gray-300 rounded-full" />
          </div>
          <p className="text-gray-500">Processing...</p>
        </div>
      </div>
    }>
      <CallbackSuccessContent />
    </Suspense>
  )
}
