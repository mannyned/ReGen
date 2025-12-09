'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AppHeader, Card, GradientBanner, Badge } from '../components/ui'

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
  const [mounted, setMounted] = useState(false)

  // Initialize platforms and fetch connection status
  useEffect(() => {
    setMounted(true)

    const initializePlatforms = async () => {
      const defaultPlatforms = [
        { id: 'instagram', name: 'Instagram', icon: '📷', color: 'from-purple-500 to-pink-500', connected: false },
        { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'from-gray-900 to-cyan-500', connected: false },
        { id: 'youtube', name: 'YouTube', icon: '▶️', color: 'from-red-600 to-red-500', connected: false },
        { id: 'twitter', name: 'X (Twitter)', icon: '𝕏', color: 'from-gray-900 to-gray-700', connected: false },
        { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'from-blue-700 to-blue-600', connected: false },
        { id: 'facebook', name: 'Facebook', icon: '👥', color: 'from-blue-600 to-blue-500', connected: false },
        { id: 'snapchat', name: 'Snapchat', icon: '👻', color: 'from-yellow-400 to-yellow-500', connected: false },
      ]

      try {
        const response = await fetch('/api/oauth/status?userId=default-user')
        const data = await response.json()

        if (data.success && data.connectedPlatforms) {
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

    const urlParams = new URLSearchParams(window.location.search)
    const connectedPlatform = urlParams.get('connected')
    const username = urlParams.get('username')
    const error = urlParams.get('error')

    if (connectedPlatform && username) {
      alert(`Successfully connected to ${connectedPlatform} as @${username}!`)
      window.history.replaceState({}, document.title, window.location.pathname)
      window.location.reload()
    } else if (error) {
      alert(`OAuth error: ${error}`)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (platforms.length > 0) {
      localStorage.setItem('connectedPlatforms', JSON.stringify(platforms))
    }
  }, [platforms])

  const handleConnect = async (platform: Platform) => {
    try {
      const response = await fetch(`/api/oauth/connect/${platform.id}?userId=default-user`)
      const data = await response.json()

      if (data.setupRequired) {
        alert(data.error + '\n\nPlease check OAUTH_SETUP_GUIDE.md for instructions.')
        return
      }

      if (data.authUrl) {
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
      const response = await fetch(`/api/oauth/disconnect/${platformId}?userId=default-user`, {
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

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <AppHeader currentPage="settings" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 lg:pt-28">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-text-primary tracking-tight mb-2">Settings</h1>
          <p className="text-text-secondary text-lg">Manage your social media accounts and preferences</p>
        </div>

        {/* Connection Stats */}
        <GradientBanner className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm mb-1">Connected Accounts</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold">{connectedCount}</span>
                <span className="text-white/60 text-xl">/ {platforms.length}</span>
              </div>
            </div>
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <span className="text-4xl">🔗</span>
            </div>
          </div>
          {connectedCount === 0 && (
            <p className="mt-4 text-white/90 text-sm">
              Connect your social media accounts to start publishing content across all platforms
            </p>
          )}
          {connectedCount > 0 && connectedCount < platforms.length && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Connect more accounts to maximize your content reach</span>
              </div>
            </div>
          )}
        </GradientBanner>

        {/* Social Media Accounts */}
        <Card className="p-6 lg:p-8 mb-8" hover={false}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-primary">Social Media Accounts</h2>
            <Badge variant="primary">{connectedCount} connected</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {platforms.map((platform) => (
              <div
                key={platform.id}
                className={`group relative border-2 rounded-2xl p-5 transition-all duration-300 ${
                  platform.connected
                    ? 'border-green-200 bg-green-50/50'
                    : 'border-gray-200 hover:border-primary/50 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${platform.color} rounded-xl flex items-center justify-center text-2xl shadow-lg transition-transform group-hover:scale-105`}>
                      {platform.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text-primary">{platform.name}</h3>
                      {platform.connected ? (
                        <div className="mt-0.5">
                          <p className="text-sm text-primary font-medium">@{platform.username}</p>
                          <p className="text-xs text-text-secondary">Connected {platform.connectedDate}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-text-secondary mt-0.5">Not connected</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={platform.connected ? 'success' : 'gray'}>
                    {platform.connected ? '✓ Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="flex gap-3">
                  {platform.connected ? (
                    <>
                      <button
                        onClick={() => handleConnect(platform)}
                        className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-text-secondary rounded-xl font-medium transition-colors text-sm"
                      >
                        Reconnect
                      </button>
                      <button
                        onClick={() => handleDisconnect(platform.id)}
                        className="flex-1 py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition-colors text-sm"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleConnect(platform)}
                      className="w-full py-2.5 px-4 btn-primary text-sm"
                    >
                      Connect {platform.name}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Account Information */}
        <Card className="p-6 lg:p-8 mb-8" hover={false}>
          <h2 className="text-2xl font-bold text-text-primary mb-6">Account Information</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Email</label>
              <div className="relative">
                <input
                  type="email"
                  defaultValue="user@example.com"
                  className="input-primary bg-gray-50"
                  disabled
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Badge variant="success">Verified</Badge>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Current Plan</label>
              <div className="flex items-center justify-between p-5 bg-gradient-to-r from-primary/5 to-accent-purple/5 rounded-2xl border border-primary/20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl">🌟</span>
                  </div>
                  <div>
                    <p className="font-bold text-text-primary text-lg">Creator Plan</p>
                    <p className="text-sm text-text-secondary">$9/month — Unlimited repurposes</p>
                  </div>
                </div>
                <button className="btn-primary text-sm">
                  Upgrade to Pro
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="p-6 lg:p-8 border-red-200" hover={false}>
          <h2 className="text-xl font-bold text-red-600 mb-4">Danger Zone</h2>
          <p className="text-text-secondary mb-6 text-sm">
            These actions are irreversible. Please proceed with caution.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="px-4 py-2.5 border-2 border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors text-sm">
              Export All Data
            </button>
            <button className="px-4 py-2.5 border-2 border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors text-sm">
              Delete Account
            </button>
          </div>
        </Card>
      </main>
    </div>
  )
}
