'use client'

import { useEffect, useState, createContext, useContext, ReactNode } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAContextType {
  isInstallable: boolean
  isInstalled: boolean
  isIOS: boolean
  promptInstall: () => Promise<void>
  dismissInstallPrompt: () => void
}

const PWAContext = createContext<PWAContextType>({
  isInstallable: false,
  isInstalled: false,
  isIOS: false,
  promptInstall: async () => {},
  dismissInstallPrompt: () => {},
})

export const usePWA = () => useContext(PWAContext)

export function PWAProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope)
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error)
        })
    }

    // Check if running on iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIOSDevice)

    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    setIsInstalled(isStandalone)

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
      console.log('[PWA] Install prompt available')
    }

    // Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      console.log('[PWA] App installed successfully')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) {
      console.log('[PWA] No install prompt available')
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted install')
    } else {
      console.log('[PWA] User dismissed install')
    }

    setDeferredPrompt(null)
    setIsInstallable(false)
  }

  const dismissInstallPrompt = () => {
    setIsInstallable(false)
    // No longer storing in localStorage - prompt will show every session until installed
  }

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isInstalled,
        isIOS,
        promptInstall,
        dismissInstallPrompt,
      }}
    >
      {children}
    </PWAContext.Provider>
  )
}
