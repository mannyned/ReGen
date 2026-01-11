'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { fileStorage } from '../utils/fileStorage'
import { AppHeader, PlatformLogo } from '../components/ui'
import type { SocialPlatform } from '@/lib/types/social'
import { useAuth } from '@/lib/supabase/hooks/useAuth'

type Platform = 'instagram' | 'twitter' | 'linkedin' | 'facebook' | 'tiktok' | 'youtube' | 'x' | 'snapchat' | 'pinterest' | 'discord'

// Map Platform type to SocialPlatform for logo component
const PLATFORM_ID_MAP: Record<Platform, SocialPlatform> = {
  'instagram': 'instagram',
  'twitter': 'twitter',
  'x': 'twitter',
  'linkedin': 'linkedin',
  'facebook': 'facebook',
  'tiktok': 'tiktok',
  'youtube': 'youtube',
  'snapchat': 'snapchat',
  'pinterest': 'pinterest',
  'discord': 'discord',
}

interface PreviewData {
  id: number
  platform: Platform
  caption: string
  hashtags: string[]
  files: Array<{
    id?: string
    name: string
    type: string
    size: number
    base64Data?: string
  }>
}

// Inner component that uses useSearchParams
function SchedulePageContent() {
  const { user, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([])
  const [showWarning, setShowWarning] = useState(false)
  const [postMode, setPostMode] = useState<'schedule' | 'now'>('schedule')
  const [selectedPreviews, setSelectedPreviews] = useState<PreviewData[]>([])
  const [testMode, setTestMode] = useState(true) // Default to test mode for safety
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [contentId, setContentId] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishingStatus, setPublishingStatus] = useState('')
  const [upcomingPosts, setUpcomingPosts] = useState<Array<{
    id: string
    platforms: string[]
    scheduledAt: string
    status: string
    content: Record<string, any>
    media?: {
      fileName?: string
      mimeType?: string
      thumbnailUrl?: string
      publicUrl?: string
    }
  }>>([])
  const [upcomingPostsLoading, setUpcomingPostsLoading] = useState(true)

  const platforms: { name: Platform; label: string; icon: string }[] = [
    { name: 'tiktok', label: 'TikTok', icon: '🎵' },
    { name: 'instagram', label: 'Instagram', icon: '📷' },
    { name: 'youtube', label: 'YouTube', icon: '▶️' },
    { name: 'facebook', label: 'Facebook', icon: '👥' },
    { name: 'x', label: 'X (Twitter)', icon: '𝕏' },
    { name: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { name: 'snapchat', label: 'Snapchat', icon: '👻' },
    { name: 'pinterest', label: 'Pinterest', icon: '📌' },
    { name: 'discord', label: 'Discord', icon: '💬' },
  ]

  // Load connected accounts from API
  useEffect(() => {
    const fetchConnectedAccounts = async () => {
      // Wait for auth to complete
      if (authLoading || !user?.id) {
        setAccountsLoading(true)
        return
      }

      try {
        const response = await fetch(`/api/oauth/status?userId=${user.id}`)
        const data = await response.json()

        if (data.success && data.connectedPlatforms) {
          const connected = data.connectedPlatforms
            .filter((p: any) => p.isActive)
            .map((p: any) => p.platform)
          setConnectedAccounts(connected)
        }
      } catch (error) {
        console.error('Failed to fetch connected accounts:', error)
      } finally {
        setAccountsLoading(false)
      }
    }

    fetchConnectedAccounts()

    // Load selected previews from database or localStorage
    const loadPreviews = async () => {
      const urlContentId = searchParams.get('contentId')

      // New flow: Load from database if contentId is present
      if (urlContentId) {
        try {
          const response = await fetch(`/api/content/${urlContentId}`)
          const result = await response.json()

          if (response.ok && result.success) {
            const content = result.content
            setContentId(urlContentId)

            // Parse processedUrls and generatedCaptions
            const processedData = content.processedUrls as {
              files: Array<{
                publicUrl: string
                fileName: string
                fileSize: number
                mimeType: string
              }>
              uploadType: 'video' | 'image' | 'text'
              contentType: 'post' | 'story'
              selectedPlatforms: Platform[]
            }

            const generatedCaptions = content.generatedCaptions as Record<string, {
              caption: string
              hashtags: string[]
            }> | null

            // Build previews from database data
            const previewsFromDb: PreviewData[] = processedData.selectedPlatforms
              .filter(platform => generatedCaptions?.[platform])
              .map((platform, index) => ({
                id: index + 1,
                platform,
                caption: generatedCaptions?.[platform]?.caption || '',
                hashtags: generatedCaptions?.[platform]?.hashtags || [],
                files: processedData.files.map((file, idx) => ({
                  id: `db-${idx}`,
                  name: file.fileName,
                  type: file.mimeType,
                  size: file.fileSize,
                  base64Data: file.publicUrl, // Use public URL as image source
                })),
              }))

            if (previewsFromDb.length > 0) {
              setSelectedPreviews(previewsFromDb)
              setSelectedPlatforms(previewsFromDb.map(p => p.platform))
              return
            }
          }
        } catch (error) {
          console.error('Error loading content from database:', error)
          // Fall through to localStorage fallback
        }
      }

      // Fallback: Load from localStorage (legacy flow)
      const previewsData = localStorage.getItem('selectedPreviews')
      if (previewsData) {
        try {
          const previews: PreviewData[] = JSON.parse(previewsData)

          // Check if files already have base64Data (from database flow)
          const hasDbUrls = previews.some(p => p.files.some(f => f.base64Data?.startsWith('http')))

          if (hasDbUrls) {
            // Files already have URLs, use them directly
            setSelectedPreviews(previews)
            setSelectedPlatforms(previews.map(p => p.platform))
          } else {
            // Load file data from IndexedDB if needed
            const storedFiles = await fileStorage.getFiles()

            // Enrich previews with file data
            const enrichedPreviews = previews.map(preview => ({
              ...preview,
              files: preview.files.map(file => {
                const storedFile = storedFiles.find(sf => sf.id === file.id)
                return {
                  ...file,
                  base64Data: storedFile?.base64Data
                }
              })
            }))

            setSelectedPreviews(enrichedPreviews)
            setSelectedPlatforms(enrichedPreviews.map(p => p.platform))
          }
        } catch (error) {
          console.error('Error loading previews:', error)
        }
      }
    }

    loadPreviews()

    // Fetch upcoming scheduled posts
    const fetchUpcomingPosts = async () => {
      if (!user?.id) return

      try {
        setUpcomingPostsLoading(true)
        const response = await fetch('/api/schedule?status=pending&limit=10')
        const data = await response.json()

        if (data.success && data.posts) {
          setUpcomingPosts(data.posts)
        }
      } catch (error) {
        console.error('Failed to fetch upcoming posts:', error)
      } finally {
        setUpcomingPostsLoading(false)
      }
    }

    fetchUpcomingPosts()
  }, [user, authLoading, searchParams])

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const handlePublishNow = async () => {
    // In test mode, skip connection check
    if (!testMode) {
      const unconnectedPlatforms = selectedPlatforms.filter(p => !connectedAccounts.includes(p))
      if (unconnectedPlatforms.length > 0) {
        setShowWarning(true)
        return
      }
    }

    setIsPublishing(true)
    setPublishingStatus('Preparing content...')

    try {
      const preview = selectedPreviews[0]
      const caption = preview?.caption || 'Test post from ReGenr'
      const hashtags = preview?.hashtags || ['#ReGenr', '#TestMode']

      // For test mode, use simplified data format
      if (testMode) {
        const mockData = {
          platforms: selectedPlatforms,
          caption,
          hashtags,
          files: preview?.files?.map(f => ({
            name: f.name,
            type: f.type,
            size: f.size
          })) || [],
          scheduleTime: 'immediate'
        }

        const response = await fetch('/api/publish/mock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockData),
        })

        const result = await response.json()

        if (!response.ok) {
          console.error('Publish API error:', response.status, result)
          throw new Error(`API error ${response.status}: ${result.error || JSON.stringify(result)}`)
        }

        if (result.success) {
          setShowSuccess(true)
          setPostMode('now')
          setTimeout(() => {
            window.location.href = '/test-results'
          }, 2000)
        } else {
          throw new Error(result.error || 'Publish returned success: false')
        }
        return
      }

      // Real publish mode - use uploaded file URL or show error for large files
      let mediaData = null

      if (preview?.files && preview.files.length > 0) {
        const files = preview.files.filter(f => f.base64Data) // Only files with data
        const isVideo = files[0]?.type?.startsWith('video')
        const isCarousel = files.length > 1 && !isVideo

        // Helper function to get URL for a file (upload if needed)
        const getFileUrl = async (file: typeof files[0]): Promise<string> => {
          if (!file.base64Data) throw new Error('File has no data')

          // Already a URL
          if (file.base64Data.startsWith('http')) {
            return file.base64Data
          }

          // Base64 data - check size and upload
          const base64Size = file.base64Data.length
          if (base64Size > 4 * 1024 * 1024) {
            throw new Error(
              'File is too large to upload. Please go back to the Upload page and upload the file there first, then return to schedule.'
            )
          }

          // Upload via API
          const uploadResponse = await fetch('/api/uploads', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Data: file.base64Data,
              filename: file.name,
              mimeType: file.type,
            }),
          })

          const uploadResult = await uploadResponse.json()

          if (!uploadResponse.ok || !uploadResult.success) {
            throw new Error(`Failed to upload media: ${uploadResult.error || 'Unknown error'}`)
          }

          return uploadResult.file.publicUrl
        }

        // Upload first file
        const firstFile = files[0]
        setPublishingStatus(isVideo ? 'Uploading video...' : 'Uploading image...')
        const firstUrl = await getFileUrl(firstFile)

        // For carousel posts, upload additional images
        let additionalUrls: string[] = []
        if (isCarousel) {
          for (let i = 1; i < files.length; i++) {
            setPublishingStatus(`Uploading image ${i + 1} of ${files.length}...`)
            const url = await getFileUrl(files[i])
            additionalUrls.push(url)
          }
        }

        mediaData = {
          mediaUrl: firstUrl,
          mediaType: isVideo ? 'video' as const : (isCarousel ? 'carousel' as const : 'image' as const),
          mimeType: firstFile.type,
          fileSize: firstFile.size,
          ...(additionalUrls.length > 0 && { additionalMediaUrls: additionalUrls }),
        }
      }

      setPublishingStatus('Publishing to ' + selectedPlatforms.join(', ') + '...')

      // Build publish request with correct format
      const publishData = {
        userId: user?.id,
        platforms: selectedPlatforms.map(p => PLATFORM_ID_MAP[p] || p),
        content: {
          caption,
          hashtags,
        },
        media: mediaData,
      }

      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publishData),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Publish API error:', response.status, result)
        throw new Error(`API error ${response.status}: ${result.error || JSON.stringify(result)}`)
      }

      if (result.success || result.partialSuccess) {
        // Show success message
        setShowSuccess(true)
        setPostMode('now')

        // Show summary of results
        if (result.summary) {
          console.log(`Published to ${result.summary.succeeded}/${result.summary.total} platforms`)
        }

        // Hide success message after 3 seconds
        setTimeout(() => {
          setShowSuccess(false)
          setSelectedPlatforms([])
        }, 3000)
      } else {
        // Build error message from results
        let errorMsg = 'Publish failed'
        if (result.results) {
          const failures = Object.entries(result.results)
            .filter(([_, r]: [string, any]) => !r.success)
            .map(([platform, r]: [string, any]) => `${platform}: ${r.error}`)
          if (failures.length > 0) {
            errorMsg = failures.join(', ')
          }
        }
        throw new Error(result.error || errorMsg)
      }
    } catch (error: any) {
      console.error('Error publishing now:', error)
      alert(`Failed to publish. ${error.message || 'Unknown error'}`)
    } finally {
      setIsPublishing(false)
      setPublishingStatus('')
    }
  }

  const handleSchedulePost = async () => {
    // Check if any selected platforms are not connected
    const unconnectedPlatforms = selectedPlatforms.filter(p => !connectedAccounts.includes(p))

    if (unconnectedPlatforms.length > 0) {
      setShowWarning(true)
      return
    }

    if (!contentId) {
      alert('No content selected. Please go to Generate page first.')
      return
    }

    if (!selectedDate || !selectedTime) {
      alert('Please select a date and time for scheduling.')
      return
    }

    setIsPublishing(true)
    setPublishingStatus('Scheduling post...')

    try {
      // Build platform content from previews
      const platformContent: Record<string, any> = {}
      selectedPreviews.forEach((preview) => {
        platformContent[preview.platform] = {
          caption: preview.caption,
          hashtags: preview.hashtags,
        }
      })

      // Combine date and time into ISO string
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`)

      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentUploadId: contentId,
          platforms: selectedPlatforms.map(p => PLATFORM_ID_MAP[p] || p),
          scheduledAt: scheduledAt.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          platformContent,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to schedule post')
      }

      // Refresh upcoming posts
      const upcomingResponse = await fetch('/api/schedule?status=pending&limit=10')
      const upcomingData = await upcomingResponse.json()
      if (upcomingData.success && upcomingData.posts) {
        setUpcomingPosts(upcomingData.posts)
      }

      // Show success message
      setShowSuccess(true)
      setPostMode('schedule')

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false)
        // Reset form
        setSelectedPlatforms([])
        setSelectedDate('')
        setSelectedTime('')
      }, 3000)
    } catch (error: any) {
      console.error('Error scheduling post:', error)
      alert(`Failed to schedule post. ${error.message || 'Unknown error'}`)
    } finally {
      setIsPublishing(false)
      setPublishingStatus('')
    }
  }

  // Helper function to format scheduled time
  const formatScheduledTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

    if (date.toDateString() === now.toDateString()) {
      return `Today at ${timeStr}`
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${timeStr}`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` at ${timeStr}`
    }
  }

  // Helper to cancel a scheduled post
  const handleCancelPost = async (postId: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled post?')) return

    try {
      const response = await fetch(`/api/schedule?id=${postId}`, {
        method: 'DELETE',
      })
      const result = await response.json()

      if (result.success) {
        // Remove from local state
        setUpcomingPosts(prev => prev.filter(p => p.id !== postId))
      } else {
        alert(result.error || 'Failed to cancel post')
      }
    } catch (error) {
      console.error('Error cancelling post:', error)
      alert('Failed to cancel post')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPage="schedule" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 lg:pt-28">
        {/* Test Mode Banner */}
        <div className={`mb-6 p-4 rounded-xl border-2 ${
          testMode
            ? 'bg-blue-50 border-blue-300'
            : 'bg-orange-50 border-orange-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{testMode ? '🧪' : '🚀'}</span>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {testMode ? 'Test Mode Active' : 'Live Mode Active'}
                </h3>
                <p className="text-sm text-gray-600">
                  {testMode
                    ? 'Posts will be simulated, not published to actual social media'
                    : 'Posts will be published to your connected social media accounts'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTestMode(!testMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  testMode ? 'bg-blue-600' : 'bg-orange-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    testMode ? 'translate-x-1' : 'translate-x-6'
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-gray-700">
                {testMode ? 'Test' : 'Live'}
              </span>
              {testMode && (
                <Link
                  href="/test-results"
                  className="ml-4 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View Test Results →
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-2">Schedule Posts</h1>
          <p className="text-text-secondary">Schedule your content across multiple platforms</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Schedule Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              {/* Selected Content Preview */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  Selected Content
                </label>
                {selectedPreviews.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {selectedPreviews.map((preview, index) => (
                      <div
                        key={preview.id || index}
                        className="relative rounded-lg overflow-hidden border-2 border-primary bg-gray-50"
                      >
                        {/* Media Preview */}
                        {preview.files && preview.files.length > 0 ? (
                          <div className="aspect-square relative">
                            {preview.files[0].type?.startsWith('video/') ? (
                              <video
                                src={preview.files[0].base64Data}
                                className="w-full h-full object-cover"
                                muted
                              />
                            ) : (
                              <img
                                src={preview.files[0].base64Data}
                                alt={`Preview for ${preview.platform}`}
                                className="w-full h-full object-cover"
                              />
                            )}
                            {/* Video indicator */}
                            {preview.files[0].type?.startsWith('video/') && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <span className="text-white text-3xl">▶️</span>
                              </div>
                            )}
                            {/* Multiple images indicator */}
                            {preview.files.length > 1 && !preview.files[0].type?.startsWith('video/') && (
                              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                <span>📷</span>
                                <span>{preview.files.length}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20">
                            <span className="text-4xl">📝</span>
                          </div>
                        )}
                        {/* Platform badge */}
                        <div className="absolute top-2 left-2">
                          <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 shadow-sm">
                            <PlatformLogo
                              platform={PLATFORM_ID_MAP[preview.platform]}
                              size="xs"
                              variant="color"
                            />
                            <span className="text-xs font-medium capitalize">{preview.platform}</span>
                          </div>
                        </div>
                        {/* Caption preview */}
                        {preview.caption && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                            <p className="text-white text-xs line-clamp-2">{preview.caption}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-center">
                    <span className="text-4xl mb-3 block">📭</span>
                    <p className="text-text-secondary font-medium">No content selected</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Go to <Link href="/generate" className="text-primary hover:underline">Generate</Link> to create content
                    </p>
                  </div>
                )}
              </div>

              {/* Platform Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  Select Platforms
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {platforms.map(({ name, label }) => {
                    const isConnected = connectedAccounts.includes(name)
                    const isSelected = selectedPlatforms.includes(name)
                    return (
                      <button
                        key={name}
                        onClick={() => togglePlatform(name)}
                        className={`flex items-center gap-3 p-4 rounded-lg font-semibold transition-all relative ${
                          isSelected
                            ? 'bg-primary text-white shadow-lg hover:bg-primary-hover'
                            : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                        }`}
                      >
                        <PlatformLogo
                          platform={PLATFORM_ID_MAP[name]}
                          size="md"
                          variant={isSelected ? 'white' : 'color'}
                        />
                        <span>{label}</span>
                        {!isConnected && (
                          <span className="absolute top-1 right-1 w-3 h-3 bg-orange-500 rounded-full" title="Not connected" />
                        )}
                      </button>
                    )
                  })}
                </div>
                {connectedAccounts.length === 0 && (
                  <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800 flex items-center gap-2">
                      <span className="text-xl">⚠️</span>
                      <span>No accounts connected. <Link href="/settings" className="font-semibold underline">Connect your accounts</Link> to schedule posts.</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Date & Time Selection */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-3">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg input-focus"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-3">
                    Time
                  </label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg input-focus"
                  />
                </div>
              </div>

              {/* Quick Time Buttons */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  Quick Schedule
                </label>
                <div className="grid grid-cols-4 gap-3">
                  <button
                    onClick={handlePublishNow}
                    disabled={selectedPlatforms.length === 0}
                    className="py-2 px-4 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    🚀 Now
                  </button>
                  <button
                    onClick={() => {
                      const date = new Date()
                      date.setHours(date.getHours() + 1)
                      setSelectedDate(date.toISOString().split('T')[0])
                      setSelectedTime(date.toTimeString().slice(0, 5))
                    }}
                    className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-text-secondary rounded-lg text-sm font-medium transition-colors"
                  >
                    +1 Hour
                  </button>
                  <button
                    onClick={() => {
                      const date = new Date()
                      date.setDate(date.getDate() + 1)
                      setSelectedDate(date.toISOString().split('T')[0])
                      setSelectedTime('09:00')
                    }}
                    className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-text-secondary rounded-lg text-sm font-medium transition-colors"
                  >
                    +1 Day
                  </button>
                  <button
                    onClick={() => {
                      const date = new Date()
                      date.setDate(date.getDate() + 7)
                      setSelectedDate(date.toISOString().split('T')[0])
                      setSelectedTime('09:00')
                    }}
                    className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-text-secondary rounded-lg text-sm font-medium transition-colors"
                  >
                    +1 Week
                  </button>
                </div>
              </div>

              {/* Publishing Loading Overlay */}
              {isPublishing && (
                <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <div>
                      <p className="font-semibold text-blue-800">Publishing...</p>
                      <p className="text-sm text-blue-600">{publishingStatus || 'Please wait...'}</p>
                      <p className="text-xs text-blue-500 mt-1">Videos may take up to 5 minutes to process</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning Message */}
              {showWarning && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      <p className="font-semibold text-orange-800">Cannot Schedule Post</p>
                      <p className="text-sm text-orange-600 mt-1">
                        Some selected platforms are not connected to your account.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      href="/settings"
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
                    >
                      Go to Settings
                    </Link>
                    <button
                      onClick={() => setShowWarning(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {showSuccess && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-semibold text-green-800">
                      {postMode === 'now' ? 'Post Published Successfully!' : 'Post Scheduled Successfully!'}
                    </p>
                    <p className="text-sm text-green-600">
                      {postMode === 'now'
                        ? `Your post has been published to ${selectedPlatforms.join(', ')}`
                        : `Your post will be published on ${selectedDate} at ${selectedTime}`
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handlePublishNow}
                  disabled={selectedPlatforms.length === 0 || isPublishing}
                  className="btn-primary bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
                >
                  {isPublishing ? '⏳ Publishing...' : '🚀 Post Now'}
                </button>
                <button
                  onClick={handleSchedulePost}
                  disabled={selectedPlatforms.length === 0 || !selectedDate || !selectedTime || isPublishing}
                  className="btn-primary"
                >
                  📅 Schedule Post
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Upcoming Posts */}
          <div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-text-primary mb-6">Upcoming Posts</h2>

              {upcomingPostsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : upcomingPosts.length > 0 ? (
                <div className="space-y-4">
                  {upcomingPosts.map((post) => (
                    <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {post.platforms.map((platform) => {
                            const platformKey = platform.toLowerCase() as Platform
                            return (
                              <div key={platform} className="flex items-center gap-1">
                                <PlatformLogo
                                  platform={PLATFORM_ID_MAP[platformKey] || platformKey}
                                  size="sm"
                                  variant="color"
                                />
                              </div>
                            )
                          })}
                          <span className="font-semibold text-text-primary text-sm">
                            {post.platforms.length === 1
                              ? post.platforms[0].charAt(0).toUpperCase() + post.platforms[0].slice(1).toLowerCase()
                              : `${post.platforms.length} platforms`
                            }
                          </span>
                        </div>
                        <span className="badge-primary text-xs">
                          {post.status}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary mb-3">
                        {formatScheduledTime(post.scheduledAt)}
                      </p>
                      {/* Media preview if available */}
                      {post.media?.publicUrl && (
                        <div className="mb-3">
                          {post.media.mimeType?.startsWith('video') ? (
                            <video
                              src={post.media.publicUrl}
                              className="w-full h-20 object-cover rounded-lg"
                              muted
                            />
                          ) : (
                            <img
                              src={post.media.publicUrl}
                              alt="Scheduled content"
                              className="w-full h-20 object-cover rounded-lg"
                            />
                          )}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCancelPost(post.id)}
                          className="flex-1 text-xs py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-text-secondary">
                  <span className="text-4xl mb-3 block">📭</span>
                  <p>No upcoming posts</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Schedule a post to see it here
                  </p>
                </div>
              )}
            </div>

            {/* Calendar Preview */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
              <h2 className="text-xl font-bold text-text-primary mb-4">Calendar</h2>
              {upcomingPosts.length > 0 ? (
                <div className="space-y-2">
                  {/* Group posts by date */}
                  {Array.from(new Set(upcomingPosts.map(p => new Date(p.scheduledAt).toDateString()))).slice(0, 5).map((dateStr) => {
                    const date = new Date(dateStr)
                    const postsOnDate = upcomingPosts.filter(p => new Date(p.scheduledAt).toDateString() === dateStr)
                    return (
                      <div key={dateStr} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <div className="text-center min-w-[50px]">
                          <div className="text-xs text-gray-500 uppercase">
                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div className="text-lg font-bold text-primary">
                            {date.getDate()}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            {postsOnDate.flatMap(p => p.platforms).slice(0, 4).map((platform, i) => (
                              <PlatformLogo
                                key={i}
                                platform={PLATFORM_ID_MAP[platform.toLowerCase() as Platform] || platform.toLowerCase()}
                                size="xs"
                                variant="color"
                              />
                            ))}
                            {postsOnDate.length > 1 && (
                              <span className="text-xs text-gray-500 ml-1">
                                +{postsOnDate.length - 1} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <>
                  <div className="aspect-square bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg flex items-center justify-center text-6xl">
                    📅
                  </div>
                  <p className="text-center text-sm text-text-secondary mt-4">
                    No scheduled posts yet
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Main export with Suspense wrapper for useSearchParams
export default function SchedulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    }>
      <SchedulePageContent />
    </Suspense>
  )
}
