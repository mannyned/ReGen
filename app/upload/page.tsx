'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fileStorage, fileToBase64, generateFileId } from '../utils/fileStorage'
import { AppHeader, Card, Badge, PlatformLogo } from '../components/ui'
import type { SocialPlatform } from '@/lib/types/social'

type UploadType = 'video' | 'image' | 'text'
type Platform = 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'x' | 'linkedin' | 'snapchat' | 'pinterest' | 'discord'

// Map Platform type to SocialPlatform for logo component
const PLATFORM_ID_MAP: Record<Platform, SocialPlatform> = {
  'instagram': 'instagram',
  'tiktok': 'tiktok',
  'youtube': 'youtube',
  'facebook': 'facebook',
  'x': 'twitter',
  'linkedin': 'linkedin',
  'snapchat': 'snapchat',
  'pinterest': 'pinterest',
  'discord': 'discord',
}
type ContentType = 'post' | 'story'

interface UploadedFileData {
  file: File
  previewUrl: string
  fileId: string
}

const PLATFORM_LIMITS = {
  instagram: { post: 6, story: 6 },
  facebook: { post: 6, story: 6 },
  tiktok: { post: 1, story: 1 },
  snapchat: { post: 1, story: 1 },
  youtube: { post: 1, story: 1 },
  x: { post: 4, story: 1 },
  linkedin: { post: 1, story: 1 },
  pinterest: { post: 1, story: 1 },
  discord: { post: 1, story: 1 },
}

const platforms = [
  { id: 'tiktok' as Platform, name: 'TikTok', icon: '🎵', color: 'bg-gradient-to-br from-gray-900 to-cyan-500' },
  { id: 'instagram' as Platform, name: 'Instagram', icon: '📷', color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  { id: 'youtube' as Platform, name: 'YouTube', icon: '▶️', color: 'bg-gradient-to-br from-red-600 to-red-500' },
  { id: 'facebook' as Platform, name: 'Facebook', icon: '👥', color: 'bg-gradient-to-br from-blue-600 to-blue-500' },
  { id: 'x' as Platform, name: 'X (Twitter)', icon: '𝕏', color: 'bg-gradient-to-br from-gray-900 to-gray-700' },
  { id: 'linkedin' as Platform, name: 'LinkedIn', icon: '💼', color: 'bg-gradient-to-br from-blue-700 to-blue-600' },
  { id: 'snapchat' as Platform, name: 'Snapchat', icon: '👻', color: 'bg-gradient-to-br from-yellow-400 to-yellow-500' },
  { id: 'pinterest' as Platform, name: 'Pinterest', icon: '📌', color: 'bg-gradient-to-br from-red-600 to-red-500' },
  { id: 'discord' as Platform, name: 'Discord', icon: '💬', color: 'bg-gradient-to-br from-indigo-600 to-indigo-500' },
]

export default function UploadPage() {
  const router = useRouter()
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

  useEffect(() => {
    setMounted(true)
    const savedPlatforms = localStorage.getItem('connectedPlatforms')
    if (savedPlatforms) {
      const platformsList = JSON.parse(savedPlatforms)
      const connected = platformsList
        .filter((p: any) => p.connected)
        .map((p: any) => p.id === 'twitter' ? 'x' : p.id)
      setConnectedAccounts(connected)
    }
  }, [])

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
      const isVideo = uploadType === 'video' && file.type.startsWith('video/')
      const isImage = uploadType === 'image' && file.type.startsWith('image/')

      if (!isVideo && !isImage) {
        alert(`File "${file.name}" is not a valid ${uploadType} file`)
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

  const handleGenerate = async () => {
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform')
      return
    }

    if (uploadType !== 'text' && uploadedFiles.length === 0) {
      alert('Please upload at least one file')
      return
    }

    if (uploadType === 'text' && !textContent && !urlContent) {
      alert('Please enter text or URL content')
      return
    }

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
    } catch (error) {
      console.error('Error storing files:', error)
      alert('Failed to process files. Please try again with smaller files or fewer items.')
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
            </div>

            {/* Upload Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { type: 'video' as UploadType, icon: '🎬', title: 'Upload Video', desc: 'MP4, MOV, AVI up to 500MB' },
                { type: 'image' as UploadType, icon: '🖼️', title: 'Upload Image', desc: 'JPG, PNG, GIF up to 10MB' },
                { type: 'text' as UploadType, icon: '📝', title: 'Paste Text/URL', desc: 'Or import from link' },
              ].map((option) => (
                <button
                  key={option.type}
                  onClick={() => setUploadType(option.type)}
                  className={`group p-5 rounded-2xl border-2 transition-all text-left ${
                    uploadType === option.type
                      ? 'border-primary bg-primary/5 shadow-lg'
                      : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-4xl mb-3 transition-transform group-hover:scale-110">{option.icon}</div>
                  <h3 className={`font-bold mb-1 ${uploadType === option.type ? 'text-primary' : 'text-text-primary'}`}>
                    {option.title}
                  </h3>
                  <p className="text-sm text-text-secondary">{option.desc}</p>
                </button>
              ))}
            </div>

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
                      <div className="text-6xl mb-4">{uploadType === 'video' ? '🎬' : '🖼️'}</div>
                      <h3 className="text-xl font-semibold text-text-primary mb-2">
                        Drop your {uploadType}s here
                      </h3>
                      <p className="text-text-secondary mb-6">
                        or click to browse from your computer
                        {maxUploadLimit > 1 && (
                          <span className="block text-sm mt-2 text-primary font-medium">
                            {uploadedFiles.length}/{maxUploadLimit} files uploaded
                          </span>
                        )}
                      </p>
                      <input
                        type="file"
                        accept={uploadType === 'video' ? 'video/*' : 'image/*'}
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
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-text-primary">
                          Uploaded Files ({uploadedFiles.length}/{maxUploadLimit})
                        </h3>
                        {uploadedFiles.length < maxUploadLimit && (
                          <label
                            htmlFor="file-upload-more"
                            className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                          >
                            + Add More
                            <input
                              type="file"
                              accept={uploadType === 'video' ? 'video/*' : 'image/*'}
                              onChange={handleFileSelect}
                              multiple={maxUploadLimit > 1}
                              className="hidden"
                              id="file-upload-more"
                            />
                          </label>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {uploadedFiles.map((fileData, index) => (
                          <div key={index} className="border-2 border-primary/30 rounded-xl p-4 bg-primary/5">
                            <div className="flex items-start gap-4">
                              <div className="w-24 h-24 rounded-lg overflow-hidden bg-black flex-shrink-0">
                                {uploadType === 'video' ? (
                                  <video src={fileData.previewUrl} className="w-full h-full object-cover" muted />
                                ) : (
                                  <img src={fileData.previewUrl} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-text-primary truncate">{fileData.file.name}</p>
                                <p className="text-sm text-text-secondary">
                                  {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                                <Badge variant="primary" className="mt-2">Item {index + 1}</Badge>
                              </div>
                              <button
                                onClick={() => removeFile(index)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
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
                      placeholder="Paste your content here..."
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
                      placeholder="https://example.com/post..."
                    />
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
                    {!isConnected && (
                      <div className="absolute top-2 left-2 w-3 h-3 bg-orange-500 rounded-full" title="Not connected" />
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
              disabled={selectedPlatforms.length === 0}
              className="group btn-primary text-lg px-8 py-4 flex items-center gap-2"
            >
              Generate Previews
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
