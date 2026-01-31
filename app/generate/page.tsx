'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { fileStorage } from '../utils/fileStorage'
import { usePlan } from '../context/PlanContext'
import BrandVoiceManager from '../components/BrandVoiceManager'
import { CaptionWorkflow } from '../components/CaptionWorkflow'
import { BrandVoiceProfile } from '../types/brandVoice'
import type { SocialPlatform } from '@/lib/types/social'
import type { PrimaryCaption, PlatformCaptionInstance, CaptionAnalyticsMetadata } from '@/lib/types/caption'
import { PlatformLogo } from '../components/ui'

type CaptionTone = 'professional' | 'engaging' | 'casual'
type Platform = 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'x' | 'linkedin' | 'pinterest' | 'discord' | 'reddit'
type ContentType = 'post' | 'story'

// Map local Platform type to SocialPlatform
const PLATFORM_MAP: Record<Platform, SocialPlatform> = {
  'instagram': 'instagram',
  'tiktok': 'tiktok',
  'youtube': 'youtube',
  'facebook': 'facebook',
  'x': 'twitter',
  'linkedin': 'linkedin',
  'pinterest': 'pinterest',
  'discord': 'discord',
  'reddit': 'reddit',
}

// Extract a frame from a video for AI analysis
async function extractVideoFrame(videoSrc: string, timeInSeconds: number = 1): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true

    video.onloadeddata = () => {
      // Seek to the specified time
      video.currentTime = Math.min(timeInSeconds, video.duration / 2)
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        // Use smaller dimensions for faster processing
        const maxWidth = 512
        const scale = Math.min(1, maxWidth / video.videoWidth)
        canvas.width = video.videoWidth * scale
        canvas.height = video.videoHeight * scale

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const frameData = canvas.toDataURL('image/jpeg', 0.8)
          resolve(frameData)
        } else {
          resolve(null)
        }
      } catch (e) {
        console.error('Error extracting video frame:', e)
        resolve(null)
      }
    }

    video.onerror = () => {
      console.error('Error loading video for frame extraction')
      resolve(null)
    }

    // Set a timeout in case the video doesn't load
    setTimeout(() => resolve(null), 5000)

    video.src = videoSrc
    video.load()
  })
}

interface UploadedFile {
  id?: string
  name: string
  type: string
  size: number
  base64Data?: string
}

interface UploadData {
  uploadType: 'video' | 'image' | 'media' | 'text'
  contentType: ContentType
  selectedPlatforms: Platform[]
  contentDescription: string
  customHashtags: string
  files: UploadedFile[]
  textContent?: string
  urlContent?: string
}

type Preview = {
  id: number
  platform: Platform
  icon: string
  format: string
  caption: string
  hashtags: string[]
  files: UploadedFile[]
  currentFileIndex: number
  // Caption workflow metadata
  usageMode?: 'identical' | 'manual_edit' | 'ai_adapted' | 'full_rewrite'
  appliedAdaptations?: string[]
}

// Platform configuration
const PLATFORM_CONFIG: Record<string, { icon: string; formats: { post: string; story: string } }> = {
  tiktok: { icon: '🎵', formats: { post: '15-60s vertical video', story: '15s story' } },
  instagram: { icon: '📷', formats: { post: 'Carousel/Reel', story: 'Story (15s)' } },
  youtube: { icon: '▶️', formats: { post: 'Short (vertical)', story: 'Short' } },
  facebook: { icon: '👥', formats: { post: 'Feed post', story: 'Story' } },
  x: { icon: '🐦', formats: { post: 'Tweet thread', story: 'Fleet' } },
  linkedin: { icon: '💼', formats: { post: 'Professional post', story: 'Story' } },
  'linkedin-org': { icon: '🏢', formats: { post: 'Company post', story: 'Company post' } },
  snapchat: { icon: '👻', formats: { post: 'Snap', story: 'Story' } },
  pinterest: { icon: '📌', formats: { post: 'Pin', story: 'Idea Pin' } },
  discord: { icon: '💬', formats: { post: 'Message', story: 'Message' } },
  reddit: { icon: '🤖', formats: { post: 'Post', story: 'Post' } },
}

// Inner component that uses useSearchParams
function GeneratePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentPlan } = usePlan()

  // Mode: 'legacy' = old per-platform generation, 'workflow' = new caption workflow
  const [mode, setMode] = useState<'legacy' | 'workflow'>('legacy')

  // Content ID from URL (new database-backed flow)
  const [contentId, setContentId] = useState<string | null>(null)

  // Legacy mode state
  const [generating, setGenerating] = useState(false)
  const [selectedTone, setSelectedTone] = useState<CaptionTone>('engaging')
  const [showToneSelector, setShowToneSelector] = useState(true)
  const [uploadData, setUploadData] = useState<UploadData | null>(null)
  const [previews, setPreviews] = useState<Preview[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingHashtags, setEditingHashtags] = useState<number | null>(null)
  const [selectedPreviews, setSelectedPreviews] = useState<number[]>([])
  const [activeBrandVoice, setActiveBrandVoice] = useState<BrandVoiceProfile | null>(null)
  const [useBrandVoice, setUseBrandVoice] = useState(false)

  // Caption workflow state
  const [showCaptionWorkflow, setShowCaptionWorkflow] = useState(false)

  // Load upload data from database (if contentId) or localStorage (fallback)
  useEffect(() => {
    const loadData = async () => {
      const urlContentId = searchParams.get('contentId')

      // New flow: Load from database if contentId is present
      if (urlContentId) {
        try {
          const response = await fetch(`/api/content/${urlContentId}`)
          const result = await response.json()

          if (!response.ok || !result.success) {
            console.error('Failed to load content:', result.error)
            router.push('/upload')
            return
          }

          const content = result.content
          setContentId(urlContentId)

          // Parse processedUrls which contains our upload data
          const processedData = content.processedUrls as {
            files: Array<{
              publicUrl: string
              fileName: string
              fileSize: number
              mimeType: string
            }>
            uploadType: 'video' | 'image' | 'media' | 'text'
            contentType: ContentType
            selectedPlatforms: Platform[]
            contentDescription: string
            customHashtags: string
            textContent?: string
            urlContent?: string
          }

          // Convert to UploadData format with base64Data being the public URLs
          const filesWithUrls: UploadedFile[] = processedData.files.map((file, idx) => ({
            id: `db-${idx}`,
            name: file.fileName,
            type: file.mimeType,
            size: file.fileSize,
            base64Data: file.publicUrl, // Use public URL as the image source
          }))

          const uploadDataFromDb: UploadData = {
            uploadType: processedData.uploadType,
            contentType: processedData.contentType,
            selectedPlatforms: processedData.selectedPlatforms,
            contentDescription: processedData.contentDescription,
            customHashtags: processedData.customHashtags,
            files: filesWithUrls,
            textContent: processedData.textContent,
            urlContent: processedData.urlContent,
          }

          // Debug logging to trace content description from DB
          console.log('[Generate Page] Loaded from DB:', {
            contentId: urlContentId,
            hasContentDescription: !!processedData.contentDescription,
            contentDescription: processedData.contentDescription?.substring(0, 50),
            hasCustomHashtags: !!processedData.customHashtags,
          })

          setUploadData(uploadDataFromDb)

          // Check if we have previously generated captions (for drafts)
          // Format: { platform: { caption: string, hashtags: string[], ... } }
          const savedCaptions = content.generatedCaptions as Record<string, {
            caption?: string
            hashtags?: string[]
            usageMode?: string
            appliedAdaptations?: string[]
          }> | null

          // Generate initial previews based on selected platforms
          const initialPreviews = processedData.selectedPlatforms.map((platform, index) => {
            const filesForPlatform = getFilesForPlatform(platform, filesWithUrls, processedData.contentType)

            // Use saved caption if available, otherwise generate default
            const savedPlatformData = savedCaptions?.[platform] || savedCaptions?.default
            const savedCaption = savedPlatformData?.caption
            const caption = typeof savedCaption === 'string' && savedCaption.trim()
              ? savedCaption
              : generateDefaultCaption(platform, processedData.contentType, processedData.textContent, processedData.urlContent)

            // Use saved hashtags if available, otherwise generate defaults
            const hashtags = savedPlatformData?.hashtags && savedPlatformData.hashtags.length > 0
              ? savedPlatformData.hashtags
              : generateDefaultHashtags(platform, processedData.customHashtags)

            return {
              id: index + 1,
              platform,
              icon: PLATFORM_CONFIG[platform].icon,
              format: PLATFORM_CONFIG[platform].formats[processedData.contentType],
              caption,
              hashtags,
              files: filesForPlatform,
              currentFileIndex: 0,
              usageMode: savedPlatformData?.usageMode as Preview['usageMode'],
              appliedAdaptations: savedPlatformData?.appliedAdaptations,
            }
          })

          setPreviews(initialPreviews)
          setSelectedPreviews(initialPreviews.map(p => p.id))
          return
        } catch (error) {
          console.error('Error loading content from database:', error)
          // Fall through to localStorage fallback
        }
      }

      // Fallback: Load from localStorage (legacy flow)
      const data = localStorage.getItem('uploadData')
      if (data) {
        const parsed: UploadData = JSON.parse(data)

        // Load actual file data from IndexedDB
        try {
          const storedFiles = await fileStorage.getFiles()

          // Match files by ID and add base64 data
          const filesWithData = parsed.files.map(file => {
            const storedFile = storedFiles.find(sf => sf.id === file.id)
            return {
              ...file,
              base64Data: storedFile?.base64Data
            }
          })

          // Update upload data with complete file data
          const completeData = {
            ...parsed,
            files: filesWithData
          }

          setUploadData(completeData)

          // Generate initial previews based on selected platforms
          const initialPreviews = parsed.selectedPlatforms.map((platform, index) => {
            const filesForPlatform = getFilesForPlatform(platform, filesWithData, parsed.contentType)

            return {
              id: index + 1,
              platform,
              icon: PLATFORM_CONFIG[platform].icon,
              format: PLATFORM_CONFIG[platform].formats[parsed.contentType],
              caption: generateDefaultCaption(platform, parsed.contentType, parsed.textContent, parsed.urlContent),
              hashtags: generateDefaultHashtags(platform, parsed.customHashtags),
              files: filesForPlatform,
              currentFileIndex: 0
            }
          })

          setPreviews(initialPreviews)
          setSelectedPreviews(initialPreviews.map(p => p.id))
        } catch (error) {
          console.error('Error loading files from IndexedDB:', error)
          alert('Failed to load uploaded files. Please try uploading again.')
          router.push('/upload')
        }
      } else {
        router.push('/upload')
      }
    }

    loadData()
  }, [router, searchParams])

  const getPlatformLimit = (platform: Platform, contentType: ContentType): number => {
    // Platform limits for carousel/multi-media posts (verified 2025, synced with upload page)
    const limits: Record<Platform, { post: number, story: number }> = {
      instagram: { post: 20, story: 1 },  // Carousel: up to 20 images/videos (updated 2024)
      facebook: { post: 10, story: 1 },   // Multi-photo: up to 10 items
      tiktok: { post: 35, story: 1 },     // Photo carousel: up to 35 images (video: 1)
      snapchat: { post: 1, story: 1 },    // Single snap per post
      youtube: { post: 1, story: 1 },     // Single video per upload
      x: { post: 4, story: 1 },           // Up to 4 images per tweet (standard users)
      linkedin: { post: 20, story: 1 },   // Document carousel: up to 20 slides
      pinterest: { post: 5, story: 1 },   // Carousel pin: 2-5 images
      discord: { post: 10, story: 1 },    // Multi-attachment: up to 10
      reddit: { post: 20, story: 1 },     // Gallery posts: up to 20 images
    }
    return limits[platform]?.[contentType] || 1
  }

  const getFilesForPlatform = (platform: Platform, files: UploadedFile[], contentType: ContentType): UploadedFile[] => {
    const limit = getPlatformLimit(platform, contentType)
    if (limit === 1 && files.length > 1) {
      return [files[0]]
    }
    return files.slice(0, limit)
  }

  const generateDefaultCaption = (
    platform: Platform,
    contentType: ContentType,
    textContent?: string,
    urlContent?: string
  ): string => {
    // If user provided text content, use it (with URL appended if present)
    if (textContent || urlContent) {
      let caption = textContent || ''
      // Append URL if provided and not already in the text
      if (urlContent && !caption.includes(urlContent)) {
        caption = caption ? `${caption}\n\n${urlContent}` : urlContent
      }
      return caption
    }

    // Fallback to default captions if no user content
    const captions: Record<Platform, string> = {
      tiktok: 'Transform your content strategy with AI! 🚀 See how ReGenr helps creators save 10+ hours per week.',
      instagram: 'Swipe to see how AI is changing content creation 👉\n\nReGenr transforms one video into posts for every platform. No more manual editing!',
      youtube: 'The SECRET to posting on every platform without burnout | Try ReGenr today',
      facebook: 'Check out how AI is revolutionizing content creation! 🎯\n\nWith ReGenr, one upload = content for all platforms.',
      x: 'Creators: Stop wasting hours on manual repurposing.\n\nReGenr AI:\n• Upload once\n• Generate for all platforms\n• Edit & schedule\n• Track performance\n\nGame changer 🔥',
      linkedin: 'Content repurposing doesn\'t have to be painful.\n\nI\'ve been using AI to transform one video into platform-specific posts for TikTok, Instagram, YouTube, and more.\n\nThe result? 10+ hours saved per week and 3x more engagement.\n\nHere\'s my workflow:',
      snapchat: 'New content drop! 💫 Created with AI magic ✨',
      pinterest: 'Save this for later! 📌 Creative inspiration powered by AI ✨',
      discord: 'Check out what I just created! 🎮 Made with ReGenr AI 🚀',
      reddit: 'What does everyone think about this? Would love to hear your thoughts! r/YourSubreddit',
    }
    return captions[platform] || ''
  }

  const generateDefaultHashtags = (platform: Platform, customHashtags: string): string[] => {
    const baseHashtags: Record<Platform, string[]> = {
      tiktok: ['#ContentCreation', '#AITools', '#CreatorTips', '#SocialMedia'],
      instagram: ['#Instagram', '#ContentMarketing', '#CreatorEconomy'],
      youtube: ['#YouTubeShorts', '#ContentCreator', '#AIContentCreation'],
      facebook: ['#FacebookCreator', '#ContentStrategy', '#SocialMediaMarketing'],
      x: ['#CreatorTools', '#AIforCreators'],
      linkedin: ['#ContentStrategy', '#MarketingAutomation', '#CreatorEconomy'],
      snapchat: ['#SnapCreator', '#ContentCreation'],
      pinterest: ['#PinterestInspiration', '#SaveForLater', '#CreativeIdeas'],
      discord: [],
      reddit: [],
    }

    const platformTags = baseHashtags[platform] || []
    const customTags = customHashtags ? customHashtags.split(/[,\s]+/).map(tag =>
      tag.startsWith('#') ? tag : `#${tag}`
    ).filter(tag => tag.length > 1) : []

    return [...new Set([...platformTags, ...customTags])].slice(0, 5)
  }

  const tones = [
    { id: 'professional' as CaptionTone, label: 'Professional', icon: '💼', description: 'Formal and business-focused' },
    { id: 'engaging' as CaptionTone, label: 'Engaging', icon: '✨', description: 'Fun and attention-grabbing' },
    { id: 'casual' as CaptionTone, label: 'Casual', icon: '😊', description: 'Friendly and relaxed' },
  ]

  const handleEditCaption = (id: number, newCaption: string) => {
    setPreviews(prev =>
      prev.map(p => p.id === id ? { ...p, caption: newCaption, usageMode: 'manual_edit' } : p)
    )
  }

  const handleRegenerate = async (id: number) => {
    setGenerating(true)
    setShowToneSelector(true)

    try {
      const preview = previews.find(p => p.id === id)
      if (!preview || !uploadData) {
        setGenerating(false)
        return
      }

      const rawMediaData = preview.files[0]?.base64Data
      const fileType = preview.files[0]?.type || ''
      const isVideo = fileType.startsWith('video/')

      // Determine imageData for AI analysis
      let imageData: string | undefined = undefined

      if (rawMediaData) {
        // For videos, extract a frame for AI analysis
        if (isVideo) {
          console.log('Extracting frame from video for AI analysis...')
          const frameData = await extractVideoFrame(rawMediaData)
          if (frameData) {
            imageData = frameData
            console.log('Video frame extracted successfully')
          } else {
            console.warn('Could not extract video frame, using description only')
          }
        } else if (rawMediaData.startsWith('http://') || rawMediaData.startsWith('https://')) {
          // Already a URL - use it directly
          imageData = rawMediaData
        } else if (rawMediaData.startsWith('data:')) {
          // Base64 image data - check size
          const estimatedSize = rawMediaData.length * 0.75
          const maxSize = 4 * 1024 * 1024 // 4MB limit
          if (estimatedSize < maxSize) {
            imageData = rawMediaData
          } else {
            console.warn('Image too large for caption API, generating from description only')
          }
        }
      }

      const apiEndpoint = currentPlan === 'pro' && useBrandVoice && activeBrandVoice
        ? '/api/brand-voice/generate'
        : '/api/generate-caption'

      const requestBody = currentPlan === 'pro' && useBrandVoice && activeBrandVoice
        ? {
            content: uploadData.contentDescription || `Content for ${preview.platform}`,
            platform: preview.platform,
            brandVoiceProfile: activeBrandVoice,
            tone: selectedTone === 'professional' ? 'professional' :
                  selectedTone === 'casual' ? 'casual' : 'default',
            includeEmojis: true,
            includeHashtags: true,
            includeCTA: true
          }
        : {
            platform: preview.platform,
            tone: selectedTone,
            description: uploadData.contentDescription,
            hashtags: uploadData.customHashtags,
            imageData,
            urlContent: uploadData?.urlContent,
            textContent: uploadData?.textContent,
          }

      // Debug logging
      console.log('[Generate Page] Sending to API:', {
        endpoint: apiEndpoint,
        platform: preview.platform,
        hasDescription: !!uploadData.contentDescription,
        description: uploadData.contentDescription?.substring(0, 50),
        hasHashtags: !!uploadData.customHashtags,
      })

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate caption')
      }

      const data = await response.json()

      // Append URL to AI-generated caption if urlContent exists
      let finalCaption = data.caption
      if (uploadData?.urlContent && !finalCaption.includes(uploadData.urlContent)) {
        finalCaption = finalCaption ? `${finalCaption}\n\n${uploadData.urlContent}` : uploadData.urlContent
      }

      setPreviews(prev =>
        prev.map(p =>
          p.id === id
            ? { ...p, caption: finalCaption, usageMode: 'full_rewrite' }
            : p
        )
      )

    } catch (error: any) {
      console.error('Error generating caption:', error)
      alert(`Failed to generate caption: ${error.message}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleAddHashtag = (id: number, hashtag: string) => {
    setPreviews(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, hashtags: [...p.hashtags, hashtag] }
          : p
      )
    )
  }

  const handleRemoveHashtag = (id: number, tagIndex: number) => {
    setPreviews(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, hashtags: p.hashtags.filter((_, i) => i !== tagIndex) }
          : p
      )
    )
  }

  const handleFileNavigation = (previewId: number, direction: 'prev' | 'next') => {
    setPreviews(prev =>
      prev.map(p => {
        if (p.id === previewId) {
          const newIndex = direction === 'next'
            ? Math.min(p.currentFileIndex + 1, p.files.length - 1)
            : Math.max(p.currentFileIndex - 1, 0)
          return { ...p, currentFileIndex: newIndex }
        }
        return p
      })
    )
  }

  const handleSingleContentSelection = (previewId: number, fileIndex: number) => {
    setPreviews(prev =>
      prev.map(p => {
        if (p.id === previewId && uploadData) {
          const selectedFile = uploadData.files[fileIndex]
          return { ...p, files: [selectedFile], currentFileIndex: 0 }
        }
        return p
      })
    )
  }

  const togglePreview = (id: number) => {
    setSelectedPreviews(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handleProceed = async () => {
    if (selectedPreviews.length === 0) {
      alert('Please select at least one preview to continue')
      return
    }

    try {
      // If we have a contentId, save captions to the database
      if (contentId) {
        const generatedCaptions: Record<string, {
          caption: string
          hashtags: string[]
          usageMode?: string
          appliedAdaptations?: string[]
        }> = {}

        previews.filter(p => selectedPreviews.includes(p.id)).forEach(preview => {
          generatedCaptions[preview.platform] = {
            caption: preview.caption,
            hashtags: preview.hashtags,
            usageMode: preview.usageMode,
            appliedAdaptations: preview.appliedAdaptations,
          }
        })

        // Save captions to the database
        await fetch(`/api/content/${contentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ generatedCaptions }),
        })

        // Redirect with contentId - schedule page will load from DB
        router.push(`/schedule?contentId=${contentId}`)
      } else {
        // Fallback to localStorage (legacy flow)
        // Don't store base64 data in localStorage - it's too large
        // Instead, store only metadata and file IDs for IndexedDB lookup
        const selectedDataForStorage = previews.filter(p => selectedPreviews.includes(p.id)).map(preview => ({
          id: preview.id,
          platform: preview.platform,
          caption: preview.caption,
          hashtags: preview.hashtags,
          usageMode: preview.usageMode,
          appliedAdaptations: preview.appliedAdaptations,
          currentFileIndex: preview.currentFileIndex,
          files: preview.files.map(file => ({
            id: file.id,
            name: file.name,
            type: file.type,
            size: file.size,
            // Only store URL if it's a URL (not base64) - URLs are small
            base64Data: file.base64Data?.startsWith('http') ? file.base64Data : undefined,
          }))
        }))
        localStorage.setItem('selectedPreviews', JSON.stringify(selectedDataForStorage))
        // Also save contentType for localStorage flow
        if (uploadData?.contentType) {
          localStorage.setItem('contentType', uploadData.contentType)
        }
        router.push('/schedule')
      }
    } catch (error) {
      console.error('Error saving selected previews:', error)
      // Fallback to localStorage even if DB save fails
      try {
        // Minimal data without base64
        const minimalData = previews.filter(p => selectedPreviews.includes(p.id)).map(preview => ({
          id: preview.id,
          platform: preview.platform,
          caption: preview.caption,
          hashtags: preview.hashtags,
          files: preview.files.map(file => ({
            id: file.id,
            name: file.name,
            type: file.type,
            size: file.size,
          }))
        }))
        localStorage.setItem('selectedPreviews', JSON.stringify(minimalData))
        // Also save contentType for localStorage flow
        if (uploadData?.contentType) {
          localStorage.setItem('contentType', uploadData.contentType)
        }
        router.push('/schedule')
      } catch (fallbackError) {
        alert('Unable to save selection. Please try again.')
      }
    }
  }

  // Caption Workflow handlers
  const handleCaptionWorkflowComplete = (data: {
    primaryCaption: PrimaryCaption
    platformInstances: Record<SocialPlatform, PlatformCaptionInstance>
    analyticsMetadata: CaptionAnalyticsMetadata[]
  }) => {
    // Convert workflow data to previews
    const newPreviews: Preview[] = []

    Object.entries(data.platformInstances).forEach(([platform, instance], index) => {
      if (!instance.enabled) return

      // Find matching platform in uploadData
      const localPlatform = Object.entries(PLATFORM_MAP).find(([_, sp]) => sp === platform)?.[0] as Platform
      if (!localPlatform || !uploadData) return

      const filesForPlatform = getFilesForPlatform(localPlatform, uploadData.files, uploadData.contentType)

      newPreviews.push({
        id: index + 1,
        platform: localPlatform,
        icon: PLATFORM_CONFIG[localPlatform].icon,
        format: PLATFORM_CONFIG[localPlatform].formats[uploadData.contentType],
        caption: instance.caption,
        hashtags: instance.hashtags,
        files: filesForPlatform,
        currentFileIndex: 0,
        usageMode: instance.usageMode,
        appliedAdaptations: instance.appliedAdaptations,
      })
    })

    setPreviews(newPreviews)
    setSelectedPreviews(newPreviews.map(p => p.id))
    setShowCaptionWorkflow(false)
    setMode('legacy') // Switch back to legacy view for final review
  }

  if (!uploadData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  // Show Caption Workflow modal
  if (showCaptionWorkflow) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/dashboard" className="flex items-center gap-3">
                  <Image src="/brand/regenr-icon-clean-1024.png" alt="ReGenr Logo" width={40} height={40} className="object-contain" />
                  <span className="text-2xl font-bold text-primary">ReGenr</span>
                </Link>
                <span className="text-text-secondary text-sm">/ Caption Workflow</span>
              </div>
              <button
                onClick={() => setShowCaptionWorkflow(false)}
                className="text-text-secondary hover:text-text-primary px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">Caption Workflow</h1>
            <p className="text-text-secondary">
              Generate a primary caption and distribute it across platforms with full control.
            </p>
          </div>

          <CaptionWorkflow
            availablePlatforms={uploadData.selectedPlatforms.map(p => PLATFORM_MAP[p])}
            initialCaption={uploadData.contentDescription}
            initialHashtags={uploadData.customHashtags.split(/[,\s]+/).filter(h => h.length > 0)}
            contentDescription={uploadData.contentDescription}
            imageData={uploadData.files[0]?.base64Data}
            mediaType={uploadData.uploadType}
            tone={selectedTone}
            urlContent={uploadData.urlContent}
            textContent={uploadData.textContent}
            onComplete={handleCaptionWorkflowComplete}
            onCancel={() => setShowCaptionWorkflow(false)}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-3">
                <Image src="/brand/regenr-icon-clean-1024.png" alt="ReGenr Logo" width={40} height={40} className="object-contain" />
                <span className="text-2xl font-bold text-primary">ReGenr</span>
              </Link>
              <span className="text-text-secondary text-sm">/ AI Repurpose Results</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-text-secondary hover:text-primary transition-colors">Dashboard</Link>
              <Link href="/upload" className="text-text-secondary hover:text-primary transition-colors">Upload</Link>
              <Link href="/schedule" className="text-text-secondary hover:text-primary transition-colors">Schedule</Link>
              <Link href="/analytics" className="text-text-secondary hover:text-primary transition-colors">Analytics</Link>
              <Link href="/settings" className="text-text-secondary hover:text-primary transition-colors">Settings</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-2">AI Repurpose Results</h1>
          <p className="text-text-secondary text-lg">
            ReGenr created {previews.length} optimized previews for your selected platforms
          </p>
          {uploadData.files.length > 1 && (
            <p className="text-primary text-sm mt-2">
              📸 {uploadData.files.length} items uploaded • {uploadData.contentType} format
            </p>
          )}
        </div>

        {/* Caption Workflow CTA */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📝</span>
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">Use Caption Workflow</h3>
                <p className="text-sm text-text-secondary">
                  Generate one primary caption and distribute it across platforms with full control over adaptations.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCaptionWorkflow(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <span>✨</span>
              Start Workflow
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2 text-purple-700">
              <span>🔒</span>
              <span>Locked primary caption</span>
            </div>
            <div className="flex items-center gap-2 text-purple-700">
              <span>🎯</span>
              <span>Platform-specific adaptations</span>
            </div>
            <div className="flex items-center gap-2 text-purple-700">
              <span>📊</span>
              <span>Analytics tracking</span>
            </div>
            <div className="flex items-center gap-2 text-purple-700">
              <span>✂️</span>
              <span>No unwanted rewrites</span>
            </div>
          </div>
        </div>

        {/* Tone Selector */}
        {showToneSelector && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-text-primary">Select Caption Tone</h2>
                <p className="text-sm text-text-secondary mt-1">Choose the tone for AI-generated captions</p>
              </div>
              <button
                onClick={() => setShowToneSelector(false)}
                className="text-text-secondary hover:text-text-primary text-2xl"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {tones.map((tone) => (
                <button
                  key={tone.id}
                  onClick={() => setSelectedTone(tone.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedTone === tone.id
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{tone.icon}</div>
                  <h3 className="font-semibold text-text-primary text-sm mb-1">{tone.label}</h3>
                  <p className="text-xs text-text-secondary">{tone.description}</p>
                </button>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 flex items-center gap-2">
                <span>💡</span>
                <span>Tip: Click "🔄 Regenerate" on any preview to apply the selected tone</span>
              </p>
            </div>
          </div>
        )}

        {/* Brand Voice Manager - Pro Plan Only */}
        {currentPlan === 'pro' && (
          <div className="mb-8">
            <BrandVoiceManager
              onProfileUpdate={(profile) => {
                setActiveBrandVoice(profile)
                setUseBrandVoice(!!profile)
              }}
              currentProfile={activeBrandVoice}
            />
            {activeBrandVoice && (
              <div className="mt-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="useBrandVoice"
                    checked={useBrandVoice}
                    onChange={(e) => setUseBrandVoice(e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="useBrandVoice" className="font-medium text-gray-900">
                    Generate captions using "{activeBrandVoice.name}" voice profile
                  </label>
                </div>
                <div className="text-sm text-purple-700">
                  {activeBrandVoice.confidence.overall}% confidence
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats Bar */}
        <div className="bg-gradient-brand text-white rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-white/80 text-sm mb-1">Content Type</div>
              <div className="text-2xl font-bold capitalize">{uploadData.contentType}</div>
            </div>
            <div>
              <div className="text-white/80 text-sm mb-1">Platforms</div>
              <div className="text-2xl font-bold">{previews.length} versions</div>
            </div>
            <div>
              <div className="text-white/80 text-sm mb-1">Selected</div>
              <div className="text-2xl font-bold">{selectedPreviews.length} to export</div>
            </div>
            <div>
              <div className="text-white/80 text-sm mb-1">Time Saved</div>
              <div className="text-2xl font-bold">~{previews.length * 15} minutes</div>
            </div>
          </div>
        </div>

        {/* Previews Grid */}
        <div className="space-y-6 mb-8">
          {previews.map((preview) => (
            <div
              key={preview.id}
              className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all ${
                selectedPreviews.includes(preview.id) ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <PlatformLogo platform={PLATFORM_MAP[preview.platform]} size="lg" variant="color" />
                    <div>
                      <h3 className="text-xl font-bold text-text-primary capitalize">{preview.platform}</h3>
                      <p className="text-sm text-text-secondary">{preview.format}</p>
                      {preview.files.length > 1 && (
                        <p className="text-xs text-primary mt-1">{preview.files.length} items available</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Usage mode badge */}
                    {preview.usageMode && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        preview.usageMode === 'identical' ? 'bg-green-100 text-green-700' :
                        preview.usageMode === 'manual_edit' ? 'bg-blue-100 text-blue-700' :
                        preview.usageMode === 'ai_adapted' ? 'bg-purple-100 text-purple-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {preview.usageMode === 'identical' ? 'Identical' :
                         preview.usageMode === 'manual_edit' ? 'Edited' :
                         preview.usageMode === 'ai_adapted' ? 'Adapted' : 'Rewritten'}
                      </span>
                    )}
                    <button
                      onClick={() => togglePreview(preview.id)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        selectedPreviews.includes(preview.id)
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {selectedPreviews.includes(preview.id) ? '✓ Selected' : 'Select'}
                    </button>
                  </div>
                </div>

                {/* Preview Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Thumbnail(s) */}
                  <div className="md:col-span-1">
                    <div className="relative">
                      <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center relative overflow-hidden">
                        {/* Show media preview if files exist (including for text posts with featured media) */}
                        {preview.files[preview.currentFileIndex]?.base64Data ? (
                          // Check if it's a video file
                          preview.files[preview.currentFileIndex].type?.startsWith('video/') ? (
                            <video
                              src={preview.files[preview.currentFileIndex].base64Data}
                              className="w-full h-full object-cover"
                              controls
                              muted
                              playsInline
                            />
                          ) : (
                            <img
                              src={preview.files[preview.currentFileIndex].base64Data}
                              alt={`Preview ${preview.currentFileIndex + 1}`}
                              className="w-full h-full object-cover"
                            />
                          )
                        ) : uploadData.uploadType === 'text' ? (
                          // Text-only content without media
                          <div className="p-4 text-center">
                            <span className="text-4xl mb-2 block">📝</span>
                            <p className="text-sm text-gray-600">Text Content</p>
                          </div>
                        ) : (
                          <div className="text-6xl">
                            {uploadData.uploadType === 'video' ? '🎬' : '🖼️'}
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                          {preview.platform}
                        </div>
                      </div>

                      {/* Navigation for multi-content platforms */}
                      {preview.files.length > 1 &&
                       getPlatformLimit(preview.platform, uploadData.contentType) > 1 && (
                        <div className="flex items-center justify-between mt-2">
                          <button
                            onClick={() => handleFileNavigation(preview.id, 'prev')}
                            disabled={preview.currentFileIndex === 0}
                            className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                          >
                            ←
                          </button>
                          <span className="text-sm text-gray-600">
                            {preview.currentFileIndex + 1} / {preview.files.length}
                          </span>
                          <button
                            onClick={() => handleFileNavigation(preview.id, 'next')}
                            disabled={preview.currentFileIndex === preview.files.length - 1}
                            className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                          >
                            →
                          </button>
                        </div>
                      )}

                      {/* Content selector for single-upload platforms */}
                      {getPlatformLimit(preview.platform, uploadData.contentType) === 1 &&
                       uploadData.files.length > 1 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-600 mb-2">
                            Select content for {preview.platform} (single item only):
                          </p>
                          <div className="flex gap-2 overflow-x-auto">
                            {uploadData.files.map((file, idx) => {
                              const isSelected = preview.files[0]?.id === file.id
                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleSingleContentSelection(preview.id, idx)}
                                  className={`relative w-16 h-16 rounded flex-shrink-0 overflow-hidden border-2 ${
                                    isSelected
                                      ? 'border-primary ring-2 ring-primary/30'
                                      : 'border-gray-300 hover:border-gray-400'
                                  }`}
                                >
                                  {file.base64Data ? (
                                    <img src={file.base64Data} alt={`Option ${idx + 1}`} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-sm">{idx + 1}</div>
                                  )}
                                  {isSelected && (
                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                      <span className="text-white bg-primary rounded-full w-6 h-6 flex items-center justify-center text-xs">✓</span>
                                    </div>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Thumbnail strip for multi-content platforms */}
                      {preview.files.length > 1 &&
                       getPlatformLimit(preview.platform, uploadData.contentType) > 1 && (
                        <div className="flex gap-2 mt-3 overflow-x-auto">
                          {preview.files.map((file, idx) => (
                            <button
                              key={idx}
                              onClick={() => setPreviews(prev =>
                                prev.map(p => p.id === preview.id ? { ...p, currentFileIndex: idx } : p)
                              )}
                              className={`w-12 h-12 rounded flex-shrink-0 overflow-hidden border-2 ${
                                idx === preview.currentFileIndex ? 'border-primary' : 'border-gray-300'
                              }`}
                            >
                              {file.base64Data ? (
                                <img src={file.base64Data} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs">{idx + 1}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Caption & Hashtags */}
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Caption</label>
                        <button
                          onClick={() => setEditingId(editingId === preview.id ? null : preview.id)}
                          className="text-primary hover:text-primary-hover text-sm font-medium"
                        >
                          {editingId === preview.id ? 'Done' : '✏️ Edit'}
                        </button>
                      </div>

                      {/* Caption Support Warning for Stories */}
                      {uploadData?.contentType === 'story' && (
                        <>
                          {/* Instagram Story (image) - No caption support */}
                          {preview.platform === 'instagram' && uploadData?.uploadType === 'image' && (
                            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <span className="text-amber-500 flex-shrink-0">⚠️</span>
                                <p className="text-sm text-amber-800">
                                  <strong>Instagram Stories don't support captions.</strong> Your caption won't appear on this Story. Consider adding text directly to your image before uploading.
                                </p>
                              </div>
                            </div>
                          )}
                          {/* Instagram Reel (video) - Caption supported */}
                          {preview.platform === 'instagram' && uploadData?.uploadType === 'video' && (
                            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <span className="text-green-500 flex-shrink-0">✓</span>
                                <p className="text-sm text-green-800">
                                  <strong>This will publish as a Reel.</strong> Your caption will appear with your video.
                                </p>
                              </div>
                            </div>
                          )}
                          {/* Facebook Story - Limited caption support */}
                          {preview.platform === 'facebook' && uploadData?.uploadType === 'image' && (
                            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <span className="text-amber-500 flex-shrink-0">⚠️</span>
                                <p className="text-sm text-amber-800">
                                  <strong>Facebook Stories have limited caption support.</strong> Your caption may not display as expected.
                                </p>
                              </div>
                            </div>
                          )}
                          {/* X / LinkedIn - Posts to feed instead */}
                          {(preview.platform === 'x' || preview.platform === 'linkedin') && (
                            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <span className="text-blue-500 flex-shrink-0">ℹ️</span>
                                <p className="text-sm text-blue-800">
                                  <strong>{preview.platform === 'x' ? 'X' : 'LinkedIn'} doesn't support Stories.</strong> This will post to your feed instead, and your caption will appear normally.
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* LinkedIn Analytics Notice */}
                      {preview.platform === 'linkedin' && (
                        <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-xs text-gray-600 flex items-center gap-2">
                            <span>💼</span>
                            <span><strong>Personal:</strong> Limited analytics</span>
                            <span className="text-gray-400">|</span>
                            <span><strong>Company:</strong> <span className="text-green-600">Full analytics</span></span>
                          </p>
                        </div>
                      )}

                      {editingId === preview.id ? (
                        <textarea
                          value={preview.caption}
                          onChange={(e) => handleEditCaption(preview.id, e.target.value)}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg input-focus resize-none"
                        />
                      ) : (
                        <p className="text-text-primary bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                          {preview.caption}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Hashtags</label>
                        <button
                          onClick={() => setEditingHashtags(editingHashtags === preview.id ? null : preview.id)}
                          className="text-primary hover:text-primary-hover text-sm font-medium"
                        >
                          {editingHashtags === preview.id ? 'Done' : '✏️ Edit'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {preview.hashtags.map((tag, i) => (
                          <span key={i} className="inline-flex items-center gap-1 badge-primary">
                            {tag}
                            {editingHashtags === preview.id && (
                              <button
                                onClick={() => handleRemoveHashtag(preview.id, i)}
                                className="text-xs hover:text-red-600"
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                      {editingHashtags === preview.id && (
                        <input
                          type="text"
                          placeholder="Add hashtag (press Enter)"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget
                              const value = input.value.trim().replace('#', '')
                              if (value && !preview.hashtags.includes(`#${value}`)) {
                                handleAddHashtag(preview.id, `#${value}`)
                                input.value = ''
                              }
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg input-focus text-sm"
                        />
                      )}
                    </div>

                    {/* Applied adaptations */}
                    {preview.appliedAdaptations && preview.appliedAdaptations.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {preview.appliedAdaptations.map((adaptation, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                            {adaptation}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleRegenerate(preview.id)}
                        disabled={generating}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        {generating ? '⏳ Regenerating...' : '🔄 Regenerate'}
                      </button>
                      <button
                        onClick={() => togglePreview(preview.id)}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                          selectedPreviews.includes(preview.id)
                            ? 'bg-primary text-white hover:bg-primary-hover'
                            : 'bg-primary/10 text-primary hover:bg-primary/20'
                        }`}
                      >
                        {selectedPreviews.includes(preview.id) ? '✓ Keep' : 'Keep'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Link
            href="/upload"
            className="text-text-secondary hover:text-primary font-medium"
          >
            ← Back to Upload
          </Link>
          <button
            onClick={handleProceed}
            disabled={selectedPreviews.length === 0}
            className="btn-primary text-lg px-8 py-4"
          >
            Proceed to Export ({selectedPreviews.length}) →
          </button>
        </div>
      </main>
    </div>
  )
}

// Main export with Suspense wrapper for useSearchParams
export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    }>
      <GeneratePageContent />
    </Suspense>
  )
}
