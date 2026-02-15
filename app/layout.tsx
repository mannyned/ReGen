import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { PlanProvider } from './context/PlanContext'
import { UpgradeIntentProvider } from './context/UpgradeIntentContext'
import { FeedbackProvider } from './context/FeedbackContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { ToastProvider } from './components/ui/Toast'
import { FeedbackModal } from './components/FeedbackModal'
import { PWAProvider } from './components/PWAProvider'
import { PWAInstallPrompt } from './components/PWAInstallPrompt'
import PlanSwitcher from './components/PlanSwitcher'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#B47CFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0F14' },
  ],
}

export const metadata: Metadata = {
  title: 'ReGenr - AI Content Repurposing',
  description: 'Transform one video into content for every platform with AI magic',
  manifest: '/site.webmanifest',
  applicationName: 'ReGenr',
  keywords: ['content repurposing', 'social media', 'AI', 'video', 'TikTok', 'Instagram', 'YouTube'],
  authors: [{ name: 'ReGenr' }],
  creator: 'ReGenr',
  publisher: 'ReGenr',
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/brand/regenr-icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/regenr-icon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/brand/regenr-icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/brand/regenr-icon-white-1024.png', color: '#B47CFF' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ReGenr',
    startupImage: [
      {
        url: '/brand/regenr-icon-1024.png',
        media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
  openGraph: {
    type: 'website',
    siteName: 'ReGenr',
    title: 'ReGenr - AI Content Repurposing',
    description: 'Transform one video into content for every platform with AI magic',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReGenr - AI Content Repurposing',
    description: 'Transform one video into content for every platform with AI magic',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PWAProvider>
          <PlanProvider>
            <UpgradeIntentProvider>
              <FeedbackProvider>
                <WorkspaceProvider>
                  <ToastProvider>
                    {children}
                    <FeedbackModal />
                    <PWAInstallPrompt />
                    {process.env.NODE_ENV === 'development' && <PlanSwitcher />}
                  </ToastProvider>
                </WorkspaceProvider>
              </FeedbackProvider>
            </UpgradeIntentProvider>
          </PlanProvider>
        </PWAProvider>
      </body>
    </html>
  )
}
