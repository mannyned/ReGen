'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { fileStorage } from '../utils/fileStorage'
import { usePlan } from '../context/PlanContext'
import BrandVoiceManager from '../components/BrandVoiceManager'
import { BrandVoiceProfile } from '../types/brandVoice'

type CaptionTone = 'professional' | 'engaging' | 'casual'
type Platform = 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'x' | 'linkedin' | 'snapchat'
type ContentType = 'post' | 'story'

interface UploadedFile {
  id?: string
  name: string
  type: string
  size: number
  base64Data?: string
}

interface UploadData {
  uploadType: 'video' | 'image' | 'text'
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
}

// Platform configuration
const PLATFORM_CONFIG = {
  tiktok: { icon: '🎵', formats: { post: '15-60s vertical video', story: '15s story' } },
  instagram: { icon: '📷', formats: { post: 'Carousel/Reel', story: 'Story (15s)' } },
  youtube: { icon: '▶️', formats: { post: 'Short (vertical)', story: 'Short' } },
  facebook: { icon: '👥', formats: { post: 'Feed post', story: 'Story' } },
  x: { icon: '🐦', formats: { post: 'Tweet thread', story: 'Fleet' } },
  linkedin: { icon: '💼', formats: { post: 'Professional post', story: 'Story' } },
  snapchat: { icon: '👻', formats: { post: 'Snap', story: 'Story' } },
}

export default function GeneratePage() {
  const router = useRouter()
  const { currentPlan } = usePlan()
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

  // Load upload data from localStorage and files from IndexedDB
  useEffect(() => {
    const loadData = async () => {
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
            // Determine how many files this platform will use
            const filesForPlatform = getFilesForPlatform(platform, filesWithData, parsed.contentType)

            return {
              id: index + 1,
              platform,
              icon: PLATFORM_CONFIG[platform].icon,
              format: PLATFORM_CONFIG[platform].formats[parsed.contentType],
              caption: generateDefaultCaption(platform, parsed.contentType),
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
        // If no upload data, redirect back to upload page
        router.push('/upload')
      }
    }

    loadData()
  }, [router])

  const getPlatformLimit = (platform: Platform, contentType: ContentType): number => {
    const limits: Record<Platform, { post: number, story: number }> = {
      instagram: { post: 6, story: 6 },
      facebook: { post: 6, story: 6 },
      tiktok: { post: 1, story: 1 },
      snapchat: { post: 1, story: 1 },
      youtube: { post: 1, story: 1 },
      x: { post: 4, story: 1 },
      linkedin: { post: 1, story: 1 }
    }
    return limits[platform]?.[contentType] || 1
  }

  const getFilesForPlatform = (platform: Platform, files: UploadedFile[], contentType: ContentType): UploadedFile[] => {
    const limit = getPlatformLimit(platform, contentType)

    // For single-content platforms with multiple files available,
    // initially select the first file (user can change this later)
    if (limit === 1 && files.length > 1) {
      return [files[0]]
    }

    return files.slice(0, limit)
  }

  const generateDefaultCaption = (platform: Platform, contentType: ContentType): string => {
    const captions: Record<Platform, string> = {
      tiktok: 'Transform your content strategy with AI! 🚀 See how ReGen helps creators save 10+ hours per week.',
      instagram: 'Swipe to see how AI is changing content creation 👉\n\nReGen transforms one video into posts for every platform. No more manual editing!',
      youtube: 'The SECRET to posting on every platform without burnout | Try ReGen today',
      facebook: 'Check out how AI is revolutionizing content creation! 🎯\n\nWith ReGen, one upload = content for all platforms.',
      x: 'Creators: Stop wasting hours on manual repurposing.\n\nReGen AI:\n• Upload once\n• Generate for all platforms\n• Edit & schedule\n• Track performance\n\nGame changer 🔥',
      linkedin: 'Content repurposing doesn\'t have to be painful.\n\nI\'ve been using AI to transform one video into platform-specific posts for TikTok, Instagram, YouTube, and more.\n\nThe result? 10+ hours saved per week and 3x more engagement.\n\nHere\'s my workflow:',
      snapchat: 'New content drop! 💫 Created with AI magic ✨'
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
      snapchat: ['#SnapCreator', '#ContentCreation']
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
      prev.map(p => p.id === id ? { ...p, caption: newCaption } : p)
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

      // Get the first file's data for AI analysis (if available)
      const imageData = preview.files[0]?.base64Data

      console.log('Generating caption with OpenAI...')
      console.log('Platform:', preview.platform)
      console.log('Tone:', selectedTone)
      console.log('Description:', uploadData.contentDescription || '(none)')
      console.log('Hashtags:', uploadData.customHashtags || '(none)')
      console.log('Image data:', imageData ? 'Present' : 'Not available')

      // Use Brand Voice API if Pro user with active brand voice, otherwise use standard API
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
            imageData: imageData,
          }

      // Call the appropriate API
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate caption')
      }

      const data = await response.json()
      console.log('Generated caption:', data.caption)

      // Update the preview with the new AI-generated caption
      setPreviews(prev =>
        prev.map(p =>
          p.id === id
            ? {
                ...p,
                caption: data.caption
              }
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
          // Replace the single file with the selected one
          const selectedFile = uploadData.files[fileIndex]
          return {
            ...p,
            files: [selectedFile],
            currentFileIndex: 0
          }
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

  const handleProceed = () => {
    if (selectedPreviews.length === 0) {
      alert('Please select at least one preview to continue')
      return
    }

    // Save selected previews for schedule page (without base64 data to avoid quota issues)
    const selectedData = previews.filter(p => selectedPreviews.includes(p.id)).map(preview => ({
      ...preview,
      files: preview.files.map(file => ({
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size
        // Exclude base64Data to avoid localStorage quota issues
      }))
    }))

    try {
      localStorage.setItem('selectedPreviews', JSON.stringify(selectedData))
      router.push('/schedule')
    } catch (error) {
      console.error('Error saving selected previews:', error)
      alert('Unable to save selection. The data might be too large. Please try with fewer items.')
    }
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-3">
                <Image src="/logo.png" alt="ReGen Logo" width={168} height={168} className="object-contain" />
                <span className="text-2xl font-bold text-primary">ReGen</span>
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
            ReGen created {previews.length} optimized previews for your selected platforms
          </p>
          {uploadData.files.length > 1 && (
            <p className="text-primary text-sm mt-2">
              📸 {uploadData.files.length} items uploaded • {uploadData.contentType} format
            </p>
          )}
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
                selectedPreviews.includes(preview.id)
                  ? 'ring-2 ring-primary'
                  : ''
              }`}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{preview.icon}</span>
                    <div>
                      <h3 className="text-xl font-bold text-text-primary">{preview.platform}</h3>
                      <p className="text-sm text-text-secondary">{preview.format}</p>
                      {preview.files.length > 1 && (
                        <p className="text-xs text-primary mt-1">
                          {preview.files.length} items available
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
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
                      {/* Main preview */}
                      <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center relative overflow-hidden">
                        {uploadData.uploadType === 'text' ? (
                          <div className="p-4 text-center">
                            <span className="text-4xl mb-2 block">📝</span>
                            <p className="text-sm text-gray-600">Text Content</p>
                          </div>
                        ) : preview.files[preview.currentFileIndex]?.base64Data ? (
                          <img
                            src={preview.files[preview.currentFileIndex].base64Data}
                            alt={`Preview ${preview.currentFileIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
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
                                    <img
                                      src={file.base64Data}
                                      alt={`Option ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-sm">
                                      {idx + 1}
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                      <span className="text-white bg-primary rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                        ✓
                                      </span>
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
                                prev.map(p => p.id === preview.id
                                  ? { ...p, currentFileIndex: idx }
                                  : p
                                )
                              )}
                              className={`w-12 h-12 rounded flex-shrink-0 overflow-hidden border-2 ${
                                idx === preview.currentFileIndex
                                  ? 'border-primary'
                                  : 'border-gray-300'
                              }`}
                            >
                              {file.base64Data ? (
                                <img
                                  src={file.base64Data}
                                  alt={`Thumb ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs">
                                  {idx + 1}
                                </div>
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