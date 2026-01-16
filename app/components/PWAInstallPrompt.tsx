'use client'

import { useState, useEffect } from 'react'
import { usePWA } from './PWAProvider'
import Image from 'next/image'

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, isIOS, promptInstall, dismissInstallPrompt } = usePWA()
  const [showPrompt, setShowPrompt] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const [sessionDismissed, setSessionDismissed] = useState(false)

  useEffect(() => {
    // Don't show if already installed
    if (isInstalled) {
      setShowPrompt(false)
      return
    }

    // Don't show if dismissed this session (but will show again next session)
    if (sessionDismissed) {
      return
    }

    // Check if on mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    // Only show on mobile devices or if installable on desktop
    if (!isMobile && !isInstallable) {
      return
    }

    // Show prompt after a delay for better UX
    const timer = setTimeout(() => {
      if (isInstallable || isIOS || isMobile) {
        setShowPrompt(true)
      }
    }, 3000) // Show after 3 seconds

    return () => clearTimeout(timer)
  }, [isInstallable, isInstalled, isIOS, sessionDismissed])

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true)
    } else {
      await promptInstall()
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setShowIOSInstructions(false)
    // Only dismiss for this session - will show again on next visit until installed
    setSessionDismissed(true)
  }

  if (!showPrompt) return null

  // iOS Instructions Modal
  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-slideUp">
          <div className="text-center mb-6">
            <Image
              src="/brand/regenr-icon-clean-1024.png"
              alt="ReGenr"
              width={64}
              height={64}
              className="mx-auto rounded-xl shadow-lg mb-4"
            />
            <h3 className="text-xl font-bold text-text-primary">Install ReGenr</h3>
            <p className="text-text-secondary text-sm mt-1">Add to your home screen for the best experience</p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-lg">1</span>
              </div>
              <div>
                <p className="font-medium text-text-primary">Tap the Share button</p>
                <p className="text-sm text-text-secondary">
                  Look for the{' '}
                  <svg className="inline w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>{' '}
                  icon at the bottom of Safari
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-lg">2</span>
              </div>
              <div>
                <p className="font-medium text-text-primary">Scroll and tap "Add to Home Screen"</p>
                <p className="text-sm text-text-secondary">
                  Look for the{' '}
                  <svg className="inline w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>{' '}
                  Add to Home Screen option
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-lg">3</span>
              </div>
              <div>
                <p className="font-medium text-text-primary">Tap "Add"</p>
                <p className="text-sm text-text-secondary">
                  ReGenr will appear on your home screen
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full py-3 px-4 bg-gray-100 text-text-primary font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    )
  }

  // Standard Install Banner
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slideUp">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-4">
          <Image
            src="/brand/regenr-icon-clean-1024.png"
            alt="ReGenr"
            width={48}
            height={48}
            className="rounded-xl shadow-md flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-primary">Install ReGenr</h3>
            <p className="text-sm text-text-secondary truncate">
              Add to home screen for quick access
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-gradient-to-r from-primary to-accent-purple text-white font-medium rounded-lg text-sm hover:shadow-lg transition-all"
            >
              Install
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
