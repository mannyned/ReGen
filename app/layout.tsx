import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { PlanProvider } from './context/PlanContext'
import PlanSwitcher from './components/PlanSwitcher'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ReGen - AI Content Repurposing',
  description: 'Transform one video into content for every platform with AI magic',
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
          {children}
          <PlanSwitcher />
        </PlanProvider>
      </body>
    </html>
  )
}
