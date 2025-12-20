'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AppHeader, Card, GradientBanner, Badge, PlatformLogo } from '../components/ui'
import { BetaProBadge, BetaSubscriptionCard, OverLimitWarning } from '../components/BetaProBadge'
import type { SocialPlatform } from '@/lib/types/social'

type SettingsSection = 'profile' | 'security' | 'notifications' | 'subscription' | 'team' | 'connections' | 'danger'

// Map platform IDs to SocialPlatform for logo component
const PLATFORM_ID_MAP: Record<string, SocialPlatform> = {
  'instagram': 'instagram',
  'tiktok': 'tiktok',
  'youtube': 'youtube',
  'facebook': 'facebook',
  'twitter': 'twitter',
  'x': 'twitter',
  'linkedin': 'linkedin',
  'snapchat': 'snapchat',
}

type Platform = {
  id: string
  name: string
  icon: string
  color: string
  connected: boolean
  username?: string
  connectedDate?: string
}

type TeamMember = {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'member'
  avatar?: string
  joinedDate: string
}

type NotificationSetting = {
  id: string
  label: string
  description: string
  email: boolean
  push: boolean
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSaveToast, setShowSaveToast] = useState(false)

  // Profile state
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [profileLoading, setProfileLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Security state
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { id: 'product', label: 'Product updates', description: 'News about features and improvements', email: true, push: false },
    { id: 'generation', label: 'Generation complete', description: 'When your content is ready', email: false, push: true },
    { id: 'weekly', label: 'Weekly digest', description: 'Summary of your content performance', email: true, push: false },
    { id: 'team', label: 'Team activity', description: 'When teammates comment or share', email: true, push: true },
    { id: 'marketing', label: 'Marketing', description: 'Tips, offers, and inspiration', email: false, push: false },
  ])

  // Subscription state
  const [userPlan, setUserPlan] = useState<'free' | 'creator' | 'pro'>('creator')
  const [effectivePlan, setEffectivePlan] = useState<'free' | 'creator' | 'pro'>('creator')
  const [isBetaPro, setIsBetaPro] = useState(false)
  const [betaDaysRemaining, setBetaDaysRemaining] = useState<number | null>(null)
  const [betaExpiresAt, setBetaExpiresAt] = useState<string | null>(null)

  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { id: '1', name: 'Alex Morgan', email: 'alex@example.com', role: 'owner', joinedDate: 'Oct 2024' },
    { id: '2', name: 'Jordan Lee', email: 'jordan@example.com', role: 'admin', joinedDate: 'Nov 2024' },
  ])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')

  // Platforms state
  const [platforms, setPlatforms] = useState<Platform[]>([])

  // Initialize
  useEffect(() => {
    setMounted(true)

    // Fetch user profile from API
    async function fetchUserProfile() {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setDisplayName(data.displayName || data.email?.split('@')[0] || '')
          setUsername(data.email?.split('@')[0] || '')
          setEmail(data.email || '')
          setAvatarUrl(data.avatarUrl || '')

          // Set plan from database
          if (data.tier) {
            const tier = data.tier.toLowerCase() as 'free' | 'creator' | 'pro'
            setUserPlan(tier)
            localStorage.setItem('userPlan', tier)
          }

          // Set beta info from tierInfo
          if (data.tierInfo) {
            const effectiveTier = data.tierInfo.effectiveTier?.toLowerCase() as 'free' | 'creator' | 'pro'
            setEffectivePlan(effectiveTier || userPlan)
            setIsBetaPro(data.tierInfo.isBetaPro || false)
            setBetaDaysRemaining(data.tierInfo.betaDaysRemaining)
          }

          // Set beta expiration
          if (data.betaExpiresAt) {
            setBetaExpiresAt(data.betaExpiresAt)
          }
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
        // Fallback to localStorage for plan
        const savedPlan = localStorage.getItem('userPlan')
        if (savedPlan) {
          setUserPlan(savedPlan as 'free' | 'creator' | 'pro')
        }
      } finally {
        setProfileLoading(false)
      }
    }

    fetchUserProfile()

    // Initialize platforms
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
        } else {
          setPlatforms(defaultPlatforms)
        }
      } catch (error) {
        setPlatforms(defaultPlatforms)
      }
    }

    initializePlatforms()
  }, [])

  // Handle platform connect
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
      }
    } catch (error) {
      alert('Failed to initiate OAuth connection.')
    }
  }

  // Handle platform disconnect
  const handleDisconnect = async (platformId: string) => {
    try {
      const response = await fetch(`/api/oauth/disconnect/${platformId}?userId=default-user`, { method: 'DELETE' })
      const data = await response.json()

      if (data.success) {
        setPlatforms(platforms.map(p =>
          p.id === platformId ? { ...p, connected: false, username: undefined, connectedDate: undefined } : p
        ))
      }
    } catch (error) {
      alert('Failed to disconnect platform')
    }
  }

  // Handle notification toggle
  const handleNotificationToggle = (id: string, type: 'email' | 'push') => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, [type]: !n[type] } : n
    ))
  }

  // Handle save
  const handleSave = async () => {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsLoading(false)
    setShowSaveToast(true)
    setTimeout(() => setShowSaveToast(false), 3000)
  }

  // Handle avatar upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle invite
  const handleInvite = async () => {
    if (!inviteEmail) return
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsLoading(false)
    setInviteEmail('')
    alert(`Invite sent to ${inviteEmail}`)
  }

  // Handle remove member
  const handleRemoveMember = (memberId: string) => {
    if (confirm('Remove this team member? They will lose access immediately.')) {
      setTeamMembers(teamMembers.filter(m => m.id !== memberId))
    }
  }

  const connectedCount = platforms.filter(p => p.connected).length
  const usedSeats = teamMembers.length
  const totalSeats = 3

  const navigationItems = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'subscription', label: 'Subscription', icon: '💳', show: userPlan !== 'free' || isBetaPro },
    { id: 'team', label: 'Team', icon: '👥', show: effectivePlan === 'pro' },
    { id: 'connections', label: 'Connections', icon: '🔗' },
    { id: 'danger', label: 'Danger Zone', icon: '⚠️' },
  ].filter(item => item.show !== false)

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPage="settings" />

      {/* Save Toast */}
      {showSaveToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Saved</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 lg:pt-28">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-text-primary tracking-tight mb-2">Account Settings</h1>
          <p className="text-text-secondary text-lg">Manage your profile, security, and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 lg:sticky lg:top-28">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as SettingsSection)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                    activeSection === item.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <Card className="p-6 lg:p-8" hover={false}>
                <h2 className="text-2xl font-bold text-text-primary mb-6">Profile</h2>

                {/* Avatar */}
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl text-white font-bold">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Profile photo</p>
                    <p className="text-sm text-text-secondary">JPG, PNG or GIF. Max 5MB.</p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="input-primary"
                      placeholder="What should we call you?"
                      maxLength={30}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">@</span>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        className="input-primary pl-8"
                        placeholder="username"
                        maxLength={20}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-primary pr-24"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Badge variant="success">Verified</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">Changing email requires re-verification</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      Bio
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="input-primary resize-none"
                      rows={3}
                      placeholder="Tell us about yourself"
                      maxLength={160}
                    />
                    <p className="text-xs text-text-secondary mt-1">{bio.length}/160 characters</p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                  <button onClick={handleSave} disabled={isLoading} className="btn-primary">
                    {isLoading ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </Card>
            )}

            {/* Security Section */}
            {activeSection === 'security' && (
              <div className="space-y-6">
                <Card className="p-6 lg:p-8" hover={false}>
                  <h2 className="text-2xl font-bold text-text-primary mb-6">Change Password</h2>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="input-primary pr-12"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary"
                        >
                          {showCurrentPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="input-primary pr-12"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary"
                        >
                          {showNewPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-text-secondary mt-1">Min 8 characters with a number and special character</p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button onClick={handleSave} disabled={isLoading} className="btn-primary">
                      Update password
                    </button>
                  </div>
                </Card>

                <Card className="p-6 lg:p-8" hover={false}>
                  <h2 className="text-2xl font-bold text-text-primary mb-6">Two-Factor Authentication</h2>
                  <p className="text-text-secondary mb-6">Add an extra layer of security to your account</p>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">Authenticator App</p>
                        <p className="text-sm text-text-secondary">
                          {twoFactorEnabled ? 'Enabled' : 'Not enabled'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                      className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                        twoFactorEnabled
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-primary text-white hover:bg-primary-hover'
                      }`}
                    >
                      {twoFactorEnabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </Card>

                <Card className="p-6 lg:p-8" hover={false}>
                  <h2 className="text-2xl font-bold text-text-primary mb-6">Active Sessions</h2>
                  <p className="text-text-secondary mb-6">Manage your logged-in devices</p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">Chrome on Windows</p>
                          <p className="text-sm text-text-secondary">Current session</p>
                        </div>
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">Safari on iPhone</p>
                          <p className="text-sm text-text-secondary">Last active 2 hours ago</p>
                        </div>
                      </div>
                      <button className="text-red-600 text-sm font-medium hover:underline">
                        Revoke
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <button className="text-red-600 font-medium hover:underline">
                      Sign out of all devices
                    </button>
                  </div>
                </Card>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <Card className="p-6 lg:p-8" hover={false}>
                <h2 className="text-2xl font-bold text-text-primary mb-6">Notification Preferences</h2>

                <div className="space-y-1">
                  {/* Header */}
                  <div className="flex items-center justify-end gap-8 pb-4 border-b border-gray-100">
                    <span className="w-16 text-center text-sm font-medium text-text-secondary">Email</span>
                    <span className="w-16 text-center text-sm font-medium text-text-secondary">Push</span>
                  </div>

                  {/* Notification Items */}
                  {notifications.map((notification) => (
                    <div key={notification.id} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="font-medium text-text-primary">{notification.label}</p>
                        <p className="text-sm text-text-secondary">{notification.description}</p>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="w-16 flex justify-center">
                          <button
                            onClick={() => handleNotificationToggle(notification.id, 'email')}
                            className={`w-12 h-7 rounded-full transition-colors ${
                              notification.email ? 'bg-primary' : 'bg-gray-200'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                              notification.email ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                        <div className="w-16 flex justify-center">
                          <button
                            onClick={() => handleNotificationToggle(notification.id, 'push')}
                            className={`w-12 h-7 rounded-full transition-colors ${
                              notification.push ? 'bg-primary' : 'bg-gray-200'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                              notification.push ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                  <button onClick={handleSave} disabled={isLoading} className="btn-primary">
                    {isLoading ? 'Saving...' : 'Save preferences'}
                  </button>
                </div>
              </Card>
            )}

            {/* Subscription Section */}
            {activeSection === 'subscription' && (userPlan !== 'free' || isBetaPro) && (
              <div className="space-y-6">
                {/* Beta Pro Card */}
                {isBetaPro && (
                  <BetaSubscriptionCard
                    isBetaPro={true}
                    daysRemaining={betaDaysRemaining}
                    expiresAt={betaExpiresAt}
                    actualTier={userPlan.toUpperCase()}
                    onUpgrade={() => window.location.href = '/pricing'}
                  />
                )}

                {/* Regular Plan Card (only show if not beta) */}
                {!isBetaPro && (
                  <Card className="p-6 lg:p-8" hover={false}>
                    <h2 className="text-2xl font-bold text-text-primary mb-6">Current Plan</h2>

                    <div className="p-6 bg-gradient-to-r from-primary/5 to-accent-purple/5 rounded-2xl border border-primary/20 mb-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                            <span className="text-3xl">{userPlan === 'pro' ? '🚀' : '🌟'}</span>
                          </div>
                          <div>
                            <p className="font-bold text-text-primary text-xl">
                              {userPlan === 'pro' ? 'Pro Plan' : 'Creator Plan'}
                            </p>
                            <p className="text-text-secondary">
                              {userPlan === 'pro' ? '$29/month' : '$12/month'} • Renews Jan 15, 2025
                            </p>
                          </div>
                        </div>
                        {userPlan === 'creator' && (
                          <button className="btn-primary">Upgrade to Pro</button>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Usage Stats */}
                <Card className="p-6 lg:p-8" hover={false}>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-text-primary">Usage this period</h3>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-secondary">Generations</span>
                        <span className="font-medium text-text-primary">
                          {effectivePlan === 'pro' ? '347 / unlimited' : '423 / 500'}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: effectivePlan === 'pro' ? '35%' : '85%' }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-secondary">Storage</span>
                        <span className="font-medium text-text-primary">
                          {effectivePlan === 'pro' ? '2.3 GB / 100 GB' : '4.2 GB / 10 GB'}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: effectivePlan === 'pro' ? '2%' : '42%' }}
                        />
                      </div>
                    </div>

                    {effectivePlan === 'pro' && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-text-secondary">Team Seats</span>
                          <span className="font-medium text-text-primary">{usedSeats} / {totalSeats} used</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(usedSeats / totalSeats) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Payment & Billing - Only show for paid subscriptions, not beta */}
                {!isBetaPro && (
                  <>
                    <Card className="p-6 lg:p-8" hover={false}>
                      <h2 className="text-2xl font-bold text-text-primary mb-6">Payment Method</h2>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center text-white text-xs font-bold">
                            VISA
                          </div>
                          <div>
                            <p className="font-medium text-text-primary">Visa ending in 4242</p>
                            <p className="text-sm text-text-secondary">Expires 12/2026</p>
                          </div>
                        </div>
                        <button className="text-primary font-medium hover:underline">Update</button>
                      </div>
                    </Card>

                    <Card className="p-6 lg:p-8" hover={false}>
                      <h2 className="text-2xl font-bold text-text-primary mb-6">Billing History</h2>

                      <div className="space-y-3">
                        {[
                          { date: 'Dec 15, 2024', amount: userPlan === 'pro' ? '$29.00' : '$12.00', status: 'Paid' },
                          { date: 'Nov 15, 2024', amount: userPlan === 'pro' ? '$29.00' : '$12.00', status: 'Paid' },
                          { date: 'Oct 15, 2024', amount: userPlan === 'pro' ? '$29.00' : '$12.00', status: 'Paid' },
                        ].map((invoice, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div>
                                <p className="font-medium text-text-primary">{invoice.date}</p>
                                <p className="text-sm text-text-secondary">{invoice.amount}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <Badge variant="success">{invoice.status}</Badge>
                              <button className="text-primary text-sm font-medium hover:underline">
                                Download
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="p-6 lg:p-8 border-orange-200" hover={false}>
                      <h2 className="text-xl font-bold text-orange-600 mb-4">Cancel Subscription</h2>
                      <p className="text-text-secondary mb-6">
                        Your plan will remain active until Jan 15, 2025. After that, you'll be switched to the Free plan.
                      </p>
                      <button className="px-4 py-2 border-2 border-orange-200 text-orange-600 rounded-xl font-medium hover:bg-orange-50 transition-colors">
                        Cancel subscription
                      </button>
                    </Card>
                  </>
                )}
              </div>
            )}

            {/* Team Section */}
            {activeSection === 'team' && effectivePlan === 'pro' && (
              <div className="space-y-6">
                <Card className="p-6 lg:p-8" hover={false}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-text-primary">Team Members</h2>
                      <p className="text-text-secondary">{usedSeats} of {totalSeats} seats used</p>
                    </div>
                    {usedSeats < totalSeats && (
                      <Badge variant="primary">{totalSeats - usedSeats} seat{totalSeats - usedSeats !== 1 ? 's' : ''} available</Badge>
                    )}
                  </div>

                  {/* Seat Usage Bar */}
                  <div className="mb-6">
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                      {teamMembers.map((member, i) => (
                        <div
                          key={member.id}
                          className={`h-full ${
                            member.role === 'owner' ? 'bg-primary' :
                            member.role === 'admin' ? 'bg-accent-purple' : 'bg-primary/60'
                          }`}
                          style={{ width: `${100 / totalSeats}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Team Members List */}
                  <div className="space-y-3">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center">
                            <span className="text-lg text-white font-bold">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-text-primary">{member.name}</p>
                              <Badge variant={member.role === 'owner' ? 'primary' : member.role === 'admin' ? 'secondary' : 'gray'}>
                                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-sm text-text-secondary">{member.email}</p>
                          </div>
                        </div>
                        {member.role !== 'owner' && (
                          <div className="flex items-center gap-2">
                            <select
                              value={member.role}
                              onChange={(e) => {
                                setTeamMembers(teamMembers.map(m =>
                                  m.id === member.id ? { ...m, role: e.target.value as 'admin' | 'member' } : m
                                ))
                              }}
                              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                            </select>
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Invite Section */}
                {usedSeats < totalSeats ? (
                  <Card className="p-6 lg:p-8" hover={false}>
                    <h2 className="text-2xl font-bold text-text-primary mb-6">Invite Team Member</h2>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="input-primary"
                          placeholder="teammate@email.com"
                        />
                      </div>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                        className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={handleInvite}
                        disabled={!inviteEmail || isLoading}
                        className="btn-primary whitespace-nowrap"
                      >
                        {isLoading ? 'Sending...' : 'Send Invite'}
                      </button>
                    </div>

                    <p className="text-sm text-text-secondary mt-4">
                      Invites expire after 7 days. Team members can access shared workspaces and collaborate on content.
                    </p>
                  </Card>
                ) : (
                  <Card className="p-6 lg:p-8 border-orange-200" hover={false}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">👥</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-text-primary mb-1">All seats taken</h3>
                        <p className="text-text-secondary mb-4">
                          Your Pro plan includes 3 seats and they're all in use. Remove a team member to invite someone new.
                        </p>
                        <button className="text-primary font-medium hover:underline">
                          Contact us about Enterprise
                        </button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Connections Section */}
            {activeSection === 'connections' && (
              <Card className="p-6 lg:p-8" hover={false}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-text-primary">Connected Accounts</h2>
                  <Badge variant="primary">{connectedCount} connected</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {platforms.map((platform) => (
                    <div
                      key={platform.id}
                      className={`border-2 rounded-2xl p-5 transition-all ${
                        platform.connected
                          ? 'border-green-200 bg-green-50/50'
                          : 'border-gray-200 hover:border-primary/50 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 flex items-center justify-center">
                            <PlatformLogo
                              platform={PLATFORM_ID_MAP[platform.id] || 'instagram'}
                              size="lg"
                              variant="color"
                            />
                          </div>
                          <div>
                            <h3 className="font-bold text-text-primary">{platform.name}</h3>
                            {platform.connected ? (
                              <p className="text-sm text-primary font-medium">@{platform.username}</p>
                            ) : (
                              <p className="text-sm text-text-secondary">Not connected</p>
                            )}
                          </div>
                        </div>
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
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Danger Zone Section */}
            {activeSection === 'danger' && (
              <Card className="p-6 lg:p-8 border-red-200" hover={false}>
                <h2 className="text-2xl font-bold text-red-600 mb-2">Danger Zone</h2>
                <p className="text-text-secondary mb-8">
                  These actions are permanent and cannot be undone. Please proceed with caution.
                </p>

                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-gray-50 rounded-xl gap-4">
                    <div>
                      <p className="font-medium text-text-primary">Export all data</p>
                      <p className="text-sm text-text-secondary">Download a copy of all your content and account data</p>
                    </div>
                    <button className="px-4 py-2.5 border-2 border-gray-200 text-text-secondary rounded-xl font-medium hover:bg-gray-100 transition-colors whitespace-nowrap">
                      Export Data
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-red-50 rounded-xl gap-4">
                    <div>
                      <p className="font-medium text-red-600">Delete account</p>
                      <p className="text-sm text-text-secondary">Permanently delete your account and all associated data</p>
                    </div>
                    <button className="px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors whitespace-nowrap">
                      Delete Account
                    </button>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="font-medium text-yellow-800">Before you delete</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Account deletion is permanent. All your content, settings, and data will be erased.
                        {userPlan === 'pro' && ' Your team members will also lose access immediately.'}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
