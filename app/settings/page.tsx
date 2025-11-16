'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Platform = {
  id: string
  name: string
  icon: string
  color: string
  connected: boolean
  username?: string
  connectedDate?: string
}

export default function SettingsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [username, setUsername] = useState('')

  // Initialize platforms from localStorage
  useEffect(() => {
    const savedPlatforms = localStorage.getItem('connectedPlatforms')
    if (savedPlatforms) {
      setPlatforms(JSON.parse(savedPlatforms))
    } else {
      // Default platforms
      setPlatforms([
        { id: 'instagram', name: 'Instagram', icon: '📷', color: 'bg-gradient-to-br from-purple-500 to-pink-500', connected: false },
        { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'bg-gradient-to-br from-black to-cyan-500', connected: false },
        { id: 'youtube', name: 'YouTube', icon: '▶️', color: 'bg-gradient-to-br from-red-600 to-red-500', connected: false },
        { id: 'twitter', name: 'X (Twitter)', icon: '🐦', color: 'bg-gradient-to-br from-gray-900 to-gray-700', connected: false },
        { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-gradient-to-br from-blue-700 to-blue-600', connected: false },
        { id: 'facebook', name: 'Facebook', icon: '👥', color: 'bg-gradient-to-br from-blue-600 to-blue-500', connected: false },
      ])
    }
  }, [])

  // Save to localStorage whenever platforms change
  useEffect(() => {
    if (platforms.length > 0) {
      localStorage.setItem('connectedPlatforms', JSON.stringify(platforms))
    }
  }, [platforms])

  const handleConnect = (platform: Platform) => {
    setSelectedPlatform(platform)
    setShowConnectModal(true)
    setUsername('')
  }

  const handleDisconnect = (platformId: string) => {
    setPlatforms(platforms.map(p =>
      p.id === platformId
        ? { ...p, connected: false, username: undefined, connectedDate: undefined }
        : p
    ))
  }

  const confirmConnect = () => {
    if (!selectedPlatform || !username) return

    setPlatforms(platforms.map(p =>
      p.id === selectedPlatform.id
        ? {
            ...p,
            connected: true,
            username: username,
            connectedDate: new Date().toLocaleDateString()
          }
        : p
    ))

    setShowConnectModal(false)
    setSelectedPlatform(null)
    setUsername('')
  }

  const connectedCount = platforms.filter(p => p.connected).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-3">
                <Image src="/logo.png" alt="ReGen Logo" width={168} height={168} className="object-contain" />
                <span className="text-2xl font-bold text-primary">ReGen</span>
              </Link>
              <span className="text-text-secondary text-sm">/ Settings</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-text-secondary hover:text-primary transition-colors">Dashboard</Link>
              <Link href="/upload" className="text-text-secondary hover:text-primary transition-colors">Upload</Link>
              <Link href="/schedule" className="text-text-secondary hover:text-primary transition-colors">Schedule</Link>
              <Link href="/analytics" className="text-text-secondary hover:text-primary transition-colors">Analytics</Link>
              <Link href="/settings" className="text-primary font-semibold">Settings</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-2">Settings</h1>
          <p className="text-text-secondary text-lg">Manage your social media accounts and preferences</p>
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-brand rounded-2xl p-6 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 mb-1">Connected Accounts</p>
              <p className="text-4xl font-bold">{connectedCount} / {platforms.length}</p>
            </div>
            <div className="text-6xl">🔗</div>
          </div>
          {connectedCount === 0 && (
            <p className="mt-4 text-white/90 text-sm">
              Connect your social media accounts to start publishing content across all platforms
            </p>
          )}
        </div>

        {/* Social Media Accounts */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-text-primary mb-6">Social Media Accounts</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {platforms.map((platform) => (
              <div
                key={platform.id}
                className="border-2 border-gray-200 rounded-xl p-6 hover:border-primary transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 ${platform.color} rounded-xl flex items-center justify-center text-3xl shadow-lg`}>
                      {platform.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-text-primary">{platform.name}</h3>
                      {platform.connected ? (
                        <div className="mt-1">
                          <p className="text-sm text-primary font-medium">@{platform.username}</p>
                          <p className="text-xs text-text-secondary">Connected {platform.connectedDate}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-text-secondary mt-1">Not connected</p>
                      )}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    platform.connected
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {platform.connected ? '✓ Active' : 'Inactive'}
                  </div>
                </div>

                <div className="flex gap-3">
                  {platform.connected ? (
                    <>
                      <button
                        onClick={() => handleConnect(platform)}
                        className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-text-secondary rounded-lg font-medium transition-colors text-sm"
                      >
                        Reconnect
                      </button>
                      <button
                        onClick={() => handleDisconnect(platform.id)}
                        className="flex-1 py-2 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition-colors text-sm"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleConnect(platform)}
                      className="w-full py-2 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      Connect {platform.name}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mt-8">
          <h2 className="text-2xl font-bold text-text-primary mb-6">Account Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Email</label>
              <input
                type="email"
                defaultValue="user@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg input-focus"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Plan</label>
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div>
                  <p className="font-semibold text-text-primary">Creator Plan</p>
                  <p className="text-sm text-text-secondary">$9/month - Unlimited repurposes</p>
                </div>
                <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
                  Upgrade
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Connect Modal */}
      {showConnectModal && selectedPlatform && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className={`w-20 h-20 ${selectedPlatform.color} rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg`}>
                {selectedPlatform.icon}
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-2">
                Connect {selectedPlatform.name}
              </h3>
              <p className="text-text-secondary">
                Enter your username to connect your {selectedPlatform.name} account
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={`your_${selectedPlatform.id}_username`}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg input-focus"
                autoFocus
              />
              <p className="text-xs text-text-secondary mt-2">
                In production, this would use OAuth to securely connect your account
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConnectModal(false)
                  setSelectedPlatform(null)
                  setUsername('')
                }}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-text-secondary rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmConnect}
                disabled={!username}
                className="flex-1 py-3 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
