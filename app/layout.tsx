import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { PlanProvider } from './context/PlanContext'
import { UpgradeIntentProvider } from './context/UpgradeIntentContext'
import { ToastProvider } from './components/ui/Toast'
import PlanSwitcher from './components/PlanSwitcher'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ReGenr - AI Content Repurposing',
  description: 'Transform one video into content for every platform with AI magic',
  manifest: '/site.webmanifest',
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
        <PlanProvider>
          <UpgradeIntentProvider>
            <ToastProvider>
              {children}
              <PlanSwitcher />
            </ToastProvider>
          </UpgradeIntentProvider>
        </PlanProvider>
      </body>
    </html>
  )
}
