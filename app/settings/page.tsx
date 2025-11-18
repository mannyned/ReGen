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

  // Initialize platforms and fetch connection status
  useEffect(() => {
    const initializePlatforms = async () => {
      // Default platforms
      const defaultPlatforms = [
        { id: 'instagram', name: 'Instagram', icon: '📷', color: 'bg-gradient-to-br from-purple-500 to-pink-500', connected: false },
        { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'bg-gradient-to-br from-black to-cyan-500', connected: false },
        { id: 'youtube', name: 'YouTube', icon: '▶️', color: 'bg-gradient-to-br from-red-600 to-red-500', connected: false },
        { id: 'twitter', name: 'X (Twitter)', icon: '🐦', color: 'bg-gradient-to-br from-gray-900 to-gray-700', connected: false },
        { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-gradient-to-br from-blue-700 to-blue-600', connected: false },
        { id: 'facebook', name: 'Facebook', icon: '👥', color: 'bg-gradient-to-br from-blue-600 to-blue-500', connected: false },
      ]

      try {
        // Fetch connection status from backend
        const response = await fetch('http://localhost:3000/api/oauth/status?userId=default-user')
        const data = await response.json()

        if (data.success && data.connectedPlatforms) {
          // Update platforms with connection status
          const updatedPlatforms = defaultPlatforms.map(platform => {
            const connectedPlatform = data.connectedPlatforms.find((cp: any) => cp.platform === platform.id)
            if (connectedPlatform) {
              return {
                ...platform,
                connected: true,
                username: connectedPlatform.username,
                connectedDate: new Date(connectedPlatform.connectedAt).toLocaleDateString(),
              }
            }
            return platform
          })
          setPlatforms(updatedPlatforms)
          localStorage.setItem('connectedPlatforms', JSON.stringify(updatedPlatforms))
        } else {
          setPlatforms(defaultPlatforms)
        }
      } catch (error) {
        console.error('Failed to fetch connection status:', error)
        setPlatforms(defaultPlatforms)
      }
    }

    initializePlatforms()

    // Check for OAuth callback success
    const urlParams = new URLSearchParams(window.location.search)
    const connectedPlatform = urlParams.get('connected')
    const username = urlParams.get('username')
    const error = urlParams.get('error')

    if (connectedPlatform && username) {
      alert(`Successfully connected to ${connectedPlatform} as @${username}!`)
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
      // Refresh to show updated status
      window.location.reload()
    } else if (error) {
      alert(`OAuth error: ${error}`)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  // Save to localStorage whenever platforms change
  useEffect(() => {
    if (platforms.length > 0) {
      localStorage.setItem('connectedPlatforms', JSON.stringify(platforms))
    }
  }, [platforms])

  const handleConnect = async (platform: Platform) => {
    try {
      // Call backend to get OAuth URL
      const response = await fetch(`http://localhost:3000/api/oauth/connect/${platform.id}?userId=default-user`)
      const data = await response.json()

      if (data.setupRequired) {
        alert(data.error + '\n\nPlease check OAUTH_SETUP_GUIDE.md for instructions.')
        return
      }

      if (data.authUrl) {
        // Redirect to OAuth authorization page
        window.location.href = data.authUrl
      } else {
        throw new Error('Failed to get authorization URL')
      }
    } catch (error) {
      console.error('OAuth connection error:', error)
      alert('Failed to initiate OAuth connection. Please try again.')
    }
  }

  const handleDisconnect = async (platformId: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/oauth/disconnect/${platformId}?userId=default-user`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setPlatforms(platforms.map(p =>
          p.id === platformId
            ? { ...p, connected: false, username: undefined, connectedDate: undefined }
            : p
        ))
        alert(`${platformId} disconnected successfully`)
      }
    } catch (error) {
      console.error('Disconnect error:', error)
      alert('Failed to disconnect platform')
    }
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
    </div>
  )
}
