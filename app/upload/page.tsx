'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { fileStorage, fileToBase64, generateFileId } from '../utils/fileStorage'
import { AppHeader, Card, Badge, PlatformLogo } from '../components/ui'
import { CarouselComposer } from '../components/CarouselComposer'
import { useAuth } from '@/lib/supabase/hooks/useAuth'
import type { SocialPlatform } from '@/lib/types/social'

type UploadType = 'video' | 'image' | 'media' | 'text'
type Platform = 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'x' | 'linkedin' | 'linkedin-org' | 'snapchat' | 'pinterest' | 'discord' | 'reddit'

// Map Platform type to SocialPlatform for logo component
const PLATFORM_ID_MAP: Record<Platform, SocialPlatform> = {
  'instagram': 'instagram',
  'tiktok': 'tiktok',
  'youtube': 'youtube',
  'facebook': 'facebook',
  'x': 'twitter',
  'linkedin': 'linkedin',
  'linkedin-org': 'linkedin-org',
  'snapchat': 'snapchat',
  'pinterest': 'pinterest',
  'discord': 'discord',
  'reddit': 'reddit',
}
type ContentType = 'post' | 'story'

interface UploadedFileData {
  file: File
  previewUrl: string
  fileId: string
}

// Platform limits for carousel/multi-media posts
const PLATFORM_LIMITS = {
  instagram: { post: 10, story: 1 },  // Carousel: up to 10 images/videos
  facebook: { post: 10, story: 1 },   // Multi-photo: up to 10 items
  tiktok: { post: 1, story: 1 },      // No carousel support
  snapchat: { post: 1, story: 10 },   // Stories posted sequentially
  youtube: { post: 1, story: 1 },     // No carousel support
  x: { post: 4, story: 1 },           // Up to 4 images per tweet
  linkedin: { post: 20, story: 1 },   // Multi-image: 2-20 items
  'linkedin-org': { post: 20, story: 1 },  // Company page: same as personal
  pinterest: { post: 5, story: 1 },   // Carousel pin: 2-5 images
  discord: { post: 10, story: 1 },    // Multi-attachment: up to 10
  reddit: { post: 1, story: 1 },      // Single image/video per post
}

// Carousel-specific constraints for validation
const CAROUSEL_PLATFORM_INFO: Record<Platform, {
  minItems: number
  maxItems: number
  allowVideo: boolean
  description: string
}> = {
  instagram: { minItems: 2, maxItems: 10, allowVideo: true, description: 'Carousel with images & videos' },
  facebook: { minItems: 2, maxItems: 10, allowVideo: true, description: 'Multi-photo post' },
  tiktok: { minItems: 1, maxItems: 1, allowVideo: true, description: 'Single video only' },
  snapchat: { minItems: 1, maxItems: 10, allowVideo: true, description: 'Posted as story sequence' },
  youtube: { minItems: 1, maxItems: 1, allowVideo: true, description: 'Single video only' },
  x: { minItems: 1, maxItems: 4, allowVideo: false, description: 'Up to 4 images (no video carousel)' },
  linkedin: { minItems: 2, maxItems: 20, allowVideo: false, description: 'Multi-image post (images only)' },
  'linkedin-org': { minItems: 2, maxItems: 20, allowVideo: false, description: 'Company page multi-image (images only)' },
  pinterest: { minItems: 2, maxItems: 5, allowVideo: false, description: 'Carousel pin (images only)' },
  discord: { minItems: 1, maxItems: 10, allowVideo: true, description: 'Multi-attachment message' },
  reddit: { minItems: 1, maxItems: 1, allowVideo: true, description: 'Single image or video post' },
}

const platforms = [
  { id: 'tiktok' as Platform, name: 'TikTok', icon: '🎵', color: 'bg-gradient-to-br from-gray-900 to-cyan-500' },
  { id: 'instagram' as Platform, name: 'Instagram', icon: '📷', color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  { id: 'youtube' as Platform, name: 'YouTube', icon: '▶️', color: 'bg-gradient-to-br from-red-600 to-red-500' },
  { id: 'facebook' as Platform, name: 'Facebook', icon: '👥', color: 'bg-gradient-to-br from-blue-600 to-blue-500' },
  { id: 'x' as Platform, name: 'X (Twitter)', icon: '𝕏', color: 'bg-gradient-to-br from-gray-900 to-gray-700' },
  { id: 'linkedin' as Platform, name: 'LinkedIn Personal', icon: '👤', color: 'bg-gradient-to-br from-blue-700 to-blue-600' },
  { id: 'linkedin-org' as Platform, name: 'LinkedIn Company', icon: '🏢', color: 'bg-gradient-to-br from-blue-700 to-blue-600' },
  { id: 'snapchat' as Platform, name: 'Snapchat', icon: '👻', color: 'bg-gradient-to-br from-yellow-400 to-yellow-500' },
  { id: 'pinterest' as Platform, name: 'Pinterest', icon: '📌', color: 'bg-gradient-to-br from-red-600 to-red-500' },
  { id: 'discord' as Platform, name: 'Discord', icon: '💬', color: 'bg-gradient-to-br from-indigo-600 to-indigo-500' },
  { id: 'reddit' as Platform, name: 'Reddit', icon: '🤖', color: 'bg-gradient-to-br from-orange-500 to-orange-600' },
]

// Inner component that uses useSearchParams
function UploadPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [uploadType, setUploadType] = useState<UploadType>('video')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram', 'tiktok'])
  const [contentType, setContentType] = useState<ContentType>('post')
  const [dragActive, setDragActive] = useState(false)
  const [textContent, setTextContent] = useState('')
  const [urlContent, setUrlContent] = useState('')
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileData[]>([])
  const [contentDescription, setContentDescription] = useState('')
  const [customHashtags, setCustomHashtags] = useState('')
  const [mounted, setMounted] = useState(false)
  const [isRedirectingDraft, setIsRedirectingDraft] = useState(false)

  // Check for draft parameter and redirect to generate page - runs first
  const draftId = searchParams.get('draft')

  useEffect(() => {
    if (draftId) {
      setIsRedirectingDraft(true)
      // Redirect to generate page with the draft's contentId
      router.replace(`/generate?contentId=${draftId}`)
    }
  }, [draftId, router])

  // If we're redirecting to a draft, show loading state
  if (draftId || isRedirectingDraft) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading your draft...</p>
        </div>
      </div>
    )
  }

  const getMaxUploadLimit = () => {
    if (selectedPlatforms.length === 0) return 1
    const limits = selectedPlatforms.map(platform =>
      PLATFORM_LIMITS[platform]?.[contentType] || 1
    )
    return Math.max(...limits)
  }

  const getMultiUploadPlatforms = () => {
    return selectedPlatforms.filter(platform =>
      PLATFORM_LIMITS[platform]?.[contentType] > 1
    )
  }

  const getSingleUploadPlatforms = () => {
    return selectedPlatforms.filter(platform =>
      PLATFORM_LIMITS[platform]?.[contentType] === 1
    )
  }

  // Generate carousel warnings for platforms that will receive truncated content
  const getCarouselWarnings = () => {
    if (uploadedFiles.length <= 1) return []

    const warnings: { platform: Platform; message: string; severity: 'info' | 'warning' }[] = []
    const fileCount = uploadedFiles.length
    const hasVideo = uploadedFiles.some(f => f.file.type.startsWith('video/'))

    for (const platform of selectedPlatforms) {
      const info = CAROUSEL_PLATFORM_INFO[platform]
      const limit = PLATFORM_LIMITS[platform]?.[contentType] || 1

      // Check if platform will truncate
      if (fileCount > limit) {
        warnings.push({
          platform,
          message: `${platform === 'x' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1)} will only use the first ${limit} item${limit > 1 ? 's' : ''}`,
          severity: 'warning'
        })
      }

      // Check video restrictions
      if (hasVideo && !info.allowVideo && fileCount > 1) {
        warnings.push({
          platform,
          message: `${platform === 'x' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1)} carousels don't support videos - videos will be skipped`,
          severity: 'warning'
        })
      }

      // Check minimum items
      if (fileCount < info.minItems && info.minItems > 1) {
        warnings.push({
          platform,
          message: `${platform === 'x' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1)} carousels require at least ${info.minItems} items`,
          severity: 'info'
        })
      }
    }

    return warnings
  }

  // Check if current upload is a carousel (multi-item)
  const isCarousel = uploadedFiles.length > 1

  useEffect(() => {
    setMounted(true)

    const fetchConnectedAccounts = async () => {
      // First try localStorage for cached data
      const savedPlatforms = localStorage.getItem('connectedPlatforms')
      if (savedPlatforms) {
        const platformsList = JSON.parse(savedPlatforms)
        const connected = platformsList
          .filter((p: any) => p.connected)
          .map((p: any) => p.id === 'twitter' ? 'x' : p.id)
        setConnectedAccounts(connected)
      }

      // Then fetch from OAuth API if user is authenticated
      if (!authLoading && user?.id) {
        try {
          const response = await fetch(`/api/oauth/status?userId=${user.id}`)
          const data = await response.json()

          if (data.success && data.connectedPlatforms) {
            const connected = data.connectedPlatforms.map((cp: any) =>
              cp.platform === 'twitter' ? 'x' : cp.platform
            )
            setConnectedAccounts(connected)

            // Update localStorage for consistency
            const platformsList = platforms.map(p => ({
              id: p.id === 'x' ? 'twitter' : p.id,
              connected: connected.includes(p.id)
            }))
            localStorage.setItem('connectedPlatforms', JSON.stringify(platformsList))
          }
        } catch (error) {
          console.error('Error fetching connected accounts:', error)
        }
      }
    }

    fetchConnectedAccounts()
  }, [authLoading, user?.id])

  useEffect(() => {
    return () => {
      uploadedFiles.forEach(file => URL.revokeObjectURL(file.previewUrl))
    }
  }, [uploadedFiles])

  const togglePlatform = (platformId: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    )
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = (files: File[]) => {
    const maxLimit = getMaxUploadLimit()
    const availableSlots = maxLimit - uploadedFiles.length

    if (availableSlots <= 0) {
      alert(`Maximum ${maxLimit} file(s) allowed for the selected platforms and content type`)
      return
    }

    const filesToProcess = files.slice(0, availableSlots)
    const validFiles: UploadedFileData[] = []

    for (const file of filesToProcess) {
      const isVideo = file.type.startsWith('video/')
      const isImage = file.type.startsWith('image/')

      // Validate based on upload type
      let isValid = false
      if (uploadType === 'media' || uploadType === 'text') {
        // Mixed media mode or text mode: accept both images and videos
        isValid = isVideo || isImage
      } else if (uploadType === 'video') {
        isValid = isVideo
      } else if (uploadType === 'image') {
        isValid = isImage
      }

      if (!isValid) {
        const expectedType = (uploadType === 'media' || uploadType === 'text') ? 'image or video' : uploadType
        alert(`File "${file.name}" is not a valid ${expectedType} file`)
        continue
      }

      const url = URL.createObjectURL(file)
      const fileId = generateFileId()
      validFiles.push({ file, previewUrl: url, fileId })
    }

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles])
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].previewUrl)
      updated.splice(index, 1)
      return updated
    })
  }

  // Handler for carousel reordering
  const handleReorderFiles = (reorderedFiles: UploadedFileData[]) => {
    setUploadedFiles(reorderedFiles)
  }

  const [isUploading, setIsUploading] = useState(false)

  const handleGenerate = async () => {
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform')
      return
    }

    if (uploadType !== 'text' && uploadedFiles.length === 0) {
      alert('Please upload at least one file')
      return
    }

    if (uploadType === 'text' && !textContent && !urlContent && uploadedFiles.length === 0) {
      alert('Please enter text/URL content or upload media')
      return
    }

    setIsUploading(true)

    try {
      const uploadedFileData: Array<{
        publicUrl: string
        fileName: string
        fileSize: number
        mimeType: string
        localId: string
      }> = []

      // Upload files directly to Supabase Storage (bypasses API route size limits)
      const { uploadToStorage } = await import('@/lib/storage/upload')

      // Get user ID for storage path
      const userResponse = await fetch('/api/auth/me')
      const userData = await userResponse.json()
      const userId = userData?.id || 'anonymous'

      for (const fileData of uploadedFiles) {
        // Direct upload to Supabase Storage - supports large files
        const uploadResult = await uploadToStorage(fileData.file, userId)

        if (!uploadResult.success) {
          throw new Error(`Failed to upload ${fileData.file.name}: ${uploadResult.error || 'Unknown error'}`)
        }

        uploadedFileData.push({
          publicUrl: uploadResult.publicUrl!,
          fileName: fileData.file.name,
          fileSize: fileData.file.size,
          mimeType: fileData.file.type,
          localId: fileData.fileId,
        })
      }

      // Create ContentUpload record in database
      const contentResponse = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: uploadedFileData.map(f => ({
            publicUrl: f.publicUrl,
            fileName: f.fileName,
            fileSize: f.fileSize,
            mimeType: f.mimeType,
          })),
          uploadType,
          contentType,
          selectedPlatforms,
          contentDescription,
          customHashtags,
          textContent,
          urlContent,
        }),
      })

      const contentResult = await contentResponse.json()

      if (!contentResponse.ok || !contentResult.success) {
        throw new Error(`Failed to save content: ${contentResult.error || 'Unknown error'}`)
      }

      // Redirect to generate page with contentId
      router.push(`/generate?contentId=${contentResult.contentId}`)
    } catch (error) {
      console.error('Error uploading content:', error)

      // Fallback to localStorage for offline/error cases
      try {
        const filesToStore = []
        const fileMetadata = []

        for (const fileData of uploadedFiles) {
          const base64Data = await fileToBase64(fileData.file)
          filesToStore.push({
            id: fileData.fileId,
            name: fileData.file.name,
            type: fileData.file.type,
            size: fileData.file.size,
            base64Data,
            timestamp: Date.now()
          })

          fileMetadata.push({
            id: fileData.fileId,
            name: fileData.file.name,
            type: fileData.file.type,
            size: fileData.file.size
          })
        }

        await fileStorage.storeFiles(filesToStore)

        const uploadData = {
          uploadType,
          contentType,
          selectedPlatforms,
          contentDescription,
          customHashtags,
          files: fileMetadata,
          textContent,
          urlContent
        }

        localStorage.setItem('uploadData', JSON.stringify(uploadData))
        router.push('/generate')
      } catch (fallbackError) {
        console.error('Fallback storage also failed:', fallbackError)
        alert('Failed to process files. Please try again.')
      }
    } finally {
      setIsUploading(false)
    }
  }

  const maxUploadLimit = getMaxUploadLimit()
  const multiUploadPlatforms = getMultiUploadPlatforms()
  const singleUploadPlatforms = getSingleUploadPlatforms()

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPage="upload" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 lg:pt-28">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-text-primary tracking-tight mb-2">
            Upload / Import Content
          </h1>
          <p className="text-text-secondary text-lg">
            Choose your content source and select target platforms
          </p>
        </div>

        <div className="space-y-6">
          {/* Step 1: Content Source & Type */}
          <Card className="p-6 lg:p-8" hover={false}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-lg">
                1
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">Choose Content Source & Type</h2>
                <p className="text-sm text-text-secondary">Select how you want to add your content</p>
              </div>
            </div>

            {/* Content Type */}
            <div className="mb-6">
              <h3 className="font-semibold text-text-primary mb-3">Content Type</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setContentType('post')}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 font-medium transition-all ${
                    contentType === 'post'
                      ? 'border-primary bg-primary text-white shadow-lg'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">📱</span>
                  Post / Feed
                </button>
                <button
                  onClick={() => setContentType('story')}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 font-medium transition-all ${
                    contentType === 'story'
                      ? 'border-primary bg-primary text-white shadow-lg'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">⏰</span>
                  Story / Reel
                </button>
              </div>

              {/* Story/Reel Platform Info */}
              {contentType === 'story' && (
                <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">💡</span>
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold text-purple-900 mb-2">What to expect with Story / Reel:</p>
                      <ul className="space-y-1.5 text-purple-800">
                        <li className="flex items-start gap-2">
                          <span className="font-medium min-w-[80px]">Instagram:</span>
                          <span>Images → Story (24h) | Videos → Reel (permanent)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-medium min-w-[80px]">Facebook:</span>
                          <span>Images → Story (24h) | Videos → Reel</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-medium min-w-[80px]">TikTok:</span>
                          <span>All videos are permanent (like Reels)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-medium min-w-[80px]">YouTube:</span>
                          <span>Videos publish as Shorts</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-medium min-w-[80px] text-purple-600">X, LinkedIn:</span>
                          <span className="text-purple-600">Don't support Stories — posts to feed instead</span>
                        </li>
                      </ul>

                      {/* Caption Support Warning */}
                      <div className="mt-3 pt-3 border-t border-purple-200">
                        <p className="font-semibold text-purple-900 mb-2">Caption support by platform:</p>
                        <ul className="space-y-1 text-purple-800">
                          <li className="flex items-start gap-2">
                            <span className="text-green-600">✓</span>
                            <span><span className="font-medium">Instagram Reels, TikTok, YouTube Shorts:</span> Captions will appear with your content</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-600">⚠</span>
                            <span><span className="font-medium">Instagram Stories (images):</span> Captions are <strong>not supported</strong> — your caption won't appear</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-600">⚠</span>
                            <span><span className="font-medium">Facebook Stories:</span> Limited caption support — may not display</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600">ℹ</span>
                            <span><span className="font-medium">Snapchat:</span> Captions added as text overlay on media</span>
                          </li>
                        </ul>
                      </div>

                      {/* Video Duration Limits */}
                      <div className="mt-3 pt-3 border-t border-purple-200">
                        <p className="font-semibold text-purple-900 mb-2">Video duration limits:</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-purple-800">
                          <span><span className="font-medium">Instagram Reel:</span> up to 90 sec</span>
                          <span><span className="font-medium">Instagram Story:</span> up to 60 sec</span>
                          <span><span className="font-medium">Facebook Reel:</span> up to 90 sec</span>
                          <span><span className="font-medium">TikTok:</span> up to 10 min</span>
                          <span><span className="font-medium">YouTube Shorts:</span> up to 60 sec</span>
                          <span><span className="font-medium">Snapchat:</span> up to 60 sec</span>
                          <span><span className="font-medium">X (Twitter):</span> up to 2 min 20 sec</span>
                          <span><span className="font-medium">LinkedIn:</span> up to 10 min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Upload Type Selection */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { type: 'media' as UploadType, icon: '📸', title: 'Mixed Media', desc: 'Images & videos for carousels', badge: 'Carousel' },
                { type: 'video' as UploadType, icon: '🎬', title: 'Video Only', desc: 'MP4, MOV, AVI up to 500MB' },
                { type: 'image' as UploadType, icon: '🖼️', title: 'Images Only', desc: 'JPG, PNG, GIF up to 10MB' },
                { type: 'text' as UploadType, icon: '📝', title: 'Paste Text/URL', desc: 'Or import from link' },
              ].map((option) => (
                <button
                  key={option.type}
                  onClick={() => setUploadType(option.type)}
                  className={`group p-4 md:p-5 rounded-2xl border-2 transition-all text-left relative ${
                    uploadType === option.type
                      ? 'border-primary bg-primary/5 shadow-lg'
                      : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                  }`}
                >
                  {'badge' in option && option.badge && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full">
                      {option.badge}
                    </span>
                  )}
                  <div className="text-3xl md:text-4xl mb-2 md:mb-3 transition-transform group-hover:scale-110">{option.icon}</div>
                  <h3 className={`font-bold mb-1 text-sm md:text-base ${uploadType === option.type ? 'text-primary' : 'text-text-primary'}`}>
                    {option.title}
                  </h3>
                  <p className="text-xs md:text-sm text-text-secondary">{option.desc}</p>
                </button>
              ))}
            </div>

            {/* Mixed Media / Carousel Platform Info */}
            {uploadType === 'media' && (
              <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">📸</span>
                  </div>
                  <div className="text-sm flex-1">
                    <p className="font-semibold text-purple-900 mb-2">Mixed Media Carousel Support:</p>

                    {/* Platform Support Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-purple-800 mb-3">
                      <div className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">✓</span>
                        <span><span className="font-medium">Instagram:</span> Up to 10 items (images + videos)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-amber-600 mt-0.5">⚠</span>
                        <span><span className="font-medium">Facebook:</span> Up to 10 images (videos skipped)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">✓</span>
                        <span><span className="font-medium">Snapchat:</span> Up to 10 items (posted as sequence)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-amber-600 mt-0.5">⚠</span>
                        <span><span className="font-medium">X (Twitter):</span> Up to 4 images only</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">✓</span>
                        <span><span className="font-medium">Discord:</span> Up to 10 attachments</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-amber-600 mt-0.5">⚠</span>
                        <span><span className="font-medium">LinkedIn:</span> Up to 20 images only</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-amber-600 mt-0.5">⚠</span>
                        <span><span className="font-medium">Pinterest:</span> 2-5 images only</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">✗</span>
                        <span><span className="font-medium">TikTok, YouTube:</span> Single video only</span>
                      </div>
                    </div>

                    {/* Video Duration Limits */}
                    <div className="pt-3 border-t border-purple-200">
                      <p className="font-semibold text-purple-900 mb-2">Video duration limits in carousels:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-purple-800">
                        <span><span className="font-medium">Instagram:</span> 60 sec/video</span>
                        <span><span className="font-medium">Snapchat:</span> 60 sec/snap</span>
                        <span><span className="font-medium">Discord:</span> 500MB max</span>
                      </div>
                    </div>

                    {/* Important Notes */}
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <p className="font-semibold text-purple-900 mb-1">Good to know:</p>
                      <ul className="space-y-1 text-purple-700 text-xs">
                        <li className="flex items-start gap-1.5">
                          <span className="text-purple-500">•</span>
                          <span>First item becomes the cover image</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-purple-500">•</span>
                          <span>Drag to reorder items after uploading</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-purple-500">•</span>
                          <span>Videos will be automatically skipped on image-only platforms</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Limit Info */}
            {selectedPlatforms.length > 0 && uploadType !== 'text' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-blue-900 font-medium">
                      You can upload up to {maxUploadLimit} {maxUploadLimit === 1 ? 'file' : 'files'}
                    </p>
                    {singleUploadPlatforms.length > 0 && multiUploadPlatforms.length > 0 && (
                      <div className="text-xs text-blue-700 mt-1 space-y-0.5">
                        <p>• {multiUploadPlatforms.join(', ')}: Will use all {maxUploadLimit} items</p>
                        <p>• {singleUploadPlatforms.join(', ')}: You'll select 1 item during generation</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Carousel Warnings */}
            {isCarousel && getCarouselWarnings().length > 0 && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">⚠️</span>
                  </div>
                  <div>
                    <p className="text-sm text-amber-900 font-medium mb-2">
                      Carousel compatibility notes:
                    </p>
                    <ul className="text-xs text-amber-800 space-y-1">
                      {getCarouselWarnings().map((warning, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className={warning.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'}>
                            {warning.severity === 'warning' ? '•' : 'ℹ'}
                          </span>
                          <span>{warning.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Area */}
            <div className="mt-6">
              {uploadType !== 'text' ? (
                <>
                  {uploadedFiles.length < maxUploadLimit && (
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
                        dragActive
                          ? 'border-primary bg-primary/5 scale-[1.02]'
                          : 'border-gray-300 hover:border-primary/50'
                      }`}
                    >
                      <div className="text-6xl mb-4">
                        {uploadType === 'video' ? '🎬' : uploadType === 'media' ? '📸' : '🖼️'}
                      </div>
                      <h3 className="text-xl font-semibold text-text-primary mb-2">
                        {uploadType === 'media'
                          ? 'Drop your images & videos here'
                          : `Drop your ${uploadType}s here`
                        }
                      </h3>
                      <p className="text-text-secondary mb-6">
                        or click to browse from your computer
                        {uploadType === 'media' && (
                          <span className="block text-xs mt-1 text-purple-600">
                            Mix images and videos for Instagram carousels
                          </span>
                        )}
                        {maxUploadLimit > 1 && (
                          <span className="block text-sm mt-2 text-primary font-medium">
                            {uploadedFiles.length}/{maxUploadLimit} files uploaded
                          </span>
                        )}
                      </p>
                      <input
                        type="file"
                        accept={
                          uploadType === 'video' ? 'video/*' :
                          uploadType === 'media' ? 'image/*,video/*' :
                          'image/*'
                        }
                        onChange={handleFileSelect}
                        multiple={maxUploadLimit > 1}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="inline-block btn-primary cursor-pointer"
                      >
                        Choose File{maxUploadLimit > 1 ? 's' : ''}
                      </label>
                    </div>
                  )}

                  {/* Uploaded Files */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-6">
                      {/* Add More Button */}
                      {uploadedFiles.length < maxUploadLimit && (
                        <div className="flex justify-end mb-4">
                          <label
                            htmlFor="file-upload-more"
                            className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                          >
                            + Add More
                            <input
                              type="file"
                              accept={
                                uploadType === 'video' ? 'video/*' :
                                uploadType === 'media' ? 'image/*,video/*' :
                                'image/*'
                              }
                              onChange={handleFileSelect}
                              multiple={maxUploadLimit > 1}
                              className="hidden"
                              id="file-upload-more"
                            />
                          </label>
                        </div>
                      )}

                      {/* Use CarouselComposer for multiple files, simple view for single file */}
                      {uploadedFiles.length > 1 ? (
                        <CarouselComposer
                          files={uploadedFiles}
                          selectedPlatforms={selectedPlatforms}
                          platformConstraints={CAROUSEL_PLATFORM_INFO}
                          onReorder={handleReorderFiles}
                          onRemove={removeFile}
                          uploadType={uploadType}
                          contentType={contentType}
                        />
                      ) : (
                        /* Single file view */
                        <div className="border-2 border-primary/30 rounded-xl p-4 bg-primary/5">
                          <div className="flex items-start gap-4">
                            <div className="w-24 h-24 rounded-lg overflow-hidden bg-black flex-shrink-0">
                              {uploadedFiles[0].file.type.startsWith('video/') ? (
                                <video src={uploadedFiles[0].previewUrl} className="w-full h-full object-cover" muted />
                              ) : (
                                <img src={uploadedFiles[0].previewUrl} alt="Preview" className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-text-primary truncate">{uploadedFiles[0].file.name}</p>
                              <p className="text-sm text-text-secondary">
                                {(uploadedFiles[0].file.size / 1024 / 1024).toFixed(2)} MB
                                {uploadedFiles[0].file.type.startsWith('video/') ? ' • Video' : ' • Image'}
                              </p>
                              <Badge variant="primary" className="mt-2">Ready to publish</Badge>
                            </div>
                            <button
                              onClick={() => removeFile(0)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  {/* Info box for bloggers/news */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">📰</span>
                      </div>
                      <div className="text-sm">
                        <p className="font-semibold text-blue-900 mb-1">Perfect for articles, blogs & news</p>
                        <p className="text-blue-700">
                          Share text or article URLs with an optional featured image or video.
                          Great for promoting blog posts, news articles, or any text-based content.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Text/URL Input Section */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Paste Text Content
                      </label>
                      <textarea
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        rows={5}
                        className="input-primary resize-none"
                        placeholder="Paste your article, blog post, or any text content here..."
                      />
                    </div>
                    <div className="text-center text-text-secondary font-medium py-2">OR</div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Import from URL
                      </label>
                      <input
                        type="url"
                        value={urlContent}
                        onChange={(e) => setUrlContent(e.target.value)}
                        className="input-primary"
                        placeholder="https://example.com/your-article..."
                      />
                    </div>
                  </div>

                  {/* Optional Media Upload Section */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-text-primary">
                          Featured Media <span className="text-text-secondary font-normal">(Optional)</span>
                        </h4>
                        <p className="text-sm text-text-secondary">
                          Add an image or video to accompany your text/article
                        </p>
                      </div>
                      {uploadedFiles.length > 0 && (
                        <Badge variant="success">{uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} added</Badge>
                      )}
                    </div>

                    {uploadedFiles.length === 0 ? (
                      <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                          dragActive
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-300 hover:border-primary/50'
                        }`}
                      >
                        <div className="text-4xl mb-2">🖼️</div>
                        <p className="text-text-primary font-medium mb-1">
                          Drop featured image or video here
                        </p>
                        <p className="text-sm text-text-secondary mb-3">
                          or click to browse
                        </p>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="text-media-upload"
                        />
                        <label
                          htmlFor="text-media-upload"
                          className="inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                        >
                          Choose File
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {uploadedFiles.map((fileData, index) => (
                          <div key={fileData.fileId} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-black flex-shrink-0">
                              {fileData.file.type.startsWith('video/') ? (
                                <video src={fileData.previewUrl} className="w-full h-full object-cover" muted />
                              ) : (
                                <img src={fileData.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-text-primary truncate text-sm">{fileData.file.name}</p>
                              <p className="text-xs text-text-secondary">
                                {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                                {fileData.file.type.startsWith('video/') ? ' • Video' : ' • Image'}
                              </p>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}

                        {/* Add more button */}
                        <label
                          htmlFor="text-media-upload-more"
                          className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-primary hover:text-primary cursor-pointer transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="text-sm font-medium">Add another file</span>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="text-media-upload-more"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* AI Options */}
            <div className="mt-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                  <span className="text-xl">🤖</span>
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">AI Caption Generation</h3>
                  <p className="text-xs text-text-secondary">Optional - Help AI create better captions</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Content Description
                  </label>
                  <textarea
                    value={contentDescription}
                    onChange={(e) => setContentDescription(e.target.value)}
                    rows={2}
                    className="input-primary resize-none"
                    placeholder="Describe your content... (e.g., 'Product launch video for new eco-friendly water bottle')"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Custom Hashtags
                  </label>
                  <input
                    type="text"
                    value={customHashtags}
                    onChange={(e) => setCustomHashtags(e.target.value)}
                    className="input-primary"
                    placeholder="#YourBrand #ProductLaunch #Sustainable"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Step 2: Platforms */}
          <Card className="p-6 lg:p-8" hover={false}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-lg">
                2
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">Select Target Platforms</h2>
                <p className="text-sm text-text-secondary">Choose where to publish your content</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {platforms.map((platform) => {
                const isConnected = connectedAccounts.includes(platform.id)
                const platformLimit = PLATFORM_LIMITS[platform.id]?.[contentType] || 1
                const isSelected = selectedPlatforms.includes(platform.id)

                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`group relative p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 flex items-center justify-center transition-transform group-hover:scale-105">
                        <PlatformLogo
                          platform={PLATFORM_ID_MAP[platform.id]}
                          size="lg"
                          variant="color"
                        />
                      </div>
                      <span className={`font-medium text-sm ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
                        {platform.name}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {platformLimit === 1 ? 'Single' : `Up to ${platformLimit}`}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {isConnected ? (
                      <div className="absolute top-2 left-2 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm" title="Connected" />
                    ) : (
                      <div className="absolute top-2 left-2 w-3 h-3 bg-orange-500 rounded-full border-2 border-white shadow-sm" title="Not connected" />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
              <p className="text-sm text-text-primary">
                <span className="font-bold text-primary">{selectedPlatforms.length} platforms</span> selected — ReGenr will create optimized versions for each
              </p>
            </div>

            {connectedAccounts.length === 0 && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-sm font-medium text-amber-900">No accounts connected</p>
                    <p className="text-xs text-amber-700">
                      <Link href="/settings" className="underline font-medium">Connect your accounts</Link> to publish content.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* LinkedIn Personal Analytics Notice */}
            {selectedPlatforms.includes('linkedin') && !selectedPlatforms.includes('linkedin-org') && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg">👤</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-800 mb-1">LinkedIn Personal Profile</h4>
                    <p className="text-xs text-amber-700">
                      Analytics limited to post count and status only (no engagement metrics due to LinkedIn API restrictions).
                    </p>
                    <p className="text-xs text-amber-500 mt-2">
                      <strong>Tip:</strong> Select <span className="font-medium">LinkedIn Company</span> above for full analytics.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* LinkedIn Company Analytics Notice */}
            {selectedPlatforms.includes('linkedin-org') && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg">🏢</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-green-800 mb-1">LinkedIn Company Page</h4>
                    <p className="text-xs text-green-700">
                      Full analytics available: impressions, likes, comments, shares, and click-through rates.
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      ✓ You'll select your Company Page on the Schedule page
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2 text-text-secondary hover:text-primary font-medium transition-colors"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
            <button
              onClick={handleGenerate}
              disabled={selectedPlatforms.length === 0 || isUploading}
              className="group btn-primary text-lg px-8 py-4 flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  Generate Previews
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

// Main export with Suspense boundary for useSearchParams
export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    }>
      <UploadPageContent />
    </Suspense>
  )
}
