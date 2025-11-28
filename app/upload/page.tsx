'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { fileStorage, fileToBase64, generateFileId } from '../utils/fileStorage'

type UploadType = 'video' | 'image' | 'text'
type Platform = 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'x' | 'linkedin' | 'snapchat'
type ContentType = 'post' | 'story'

interface UploadedFileData {
  file: File
  previewUrl: string
  fileId: string
}

// Platform upload limits configuration
const PLATFORM_LIMITS = {
  instagram: { post: 6, story: 6 },
  facebook: { post: 6, story: 6 },
  tiktok: { post: 1, story: 1 },
  snapchat: { post: 1, story: 1 },
  youtube: { post: 1, story: 1 },
  x: { post: 4, story: 1 }, // X (Twitter) allows up to 4 images in a post
  linkedin: { post: 1, story: 1 }
}

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

  const platforms = [
    { id: 'tiktok' as Platform, name: 'TikTok', icon: '🎵', color: 'bg-pink-100 text-pink-700 border-pink-300' },
    { id: 'instagram' as Platform, name: 'Instagram', icon: '📷', color: 'bg-purple-100 text-purple-700 border-purple-300' },
    { id: 'youtube' as Platform, name: 'YouTube', icon: '▶️', color: 'bg-red-100 text-red-700 border-red-300' },
    { id: 'facebook' as Platform, name: 'Facebook', icon: '👥', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { id: 'x' as Platform, name: 'X (Twitter)', icon: '🐦', color: 'bg-gray-100 text-gray-700 border-gray-300' },
    { id: 'linkedin' as Platform, name: 'LinkedIn', icon: '💼', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
    { id: 'snapchat' as Platform, name: 'Snapchat', icon: '👻', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  ]

  // Calculate max upload limit based on selected platforms and content type
  const getMaxUploadLimit = () => {
    if (selectedPlatforms.length === 0) return 1

    // Find the MAXIMUM limit among selected platforms for the chosen content type
    // This allows users to upload multiple files and choose which one for single-content platforms
    const limits = selectedPlatforms.map(platform =>
      PLATFORM_LIMITS[platform]?.[contentType] || 1
    )
    return Math.max(...limits)
  }

  // Get platforms that support multiple uploads
  const getMultiUploadPlatforms = () => {
    return selectedPlatforms.filter(platform =>
      PLATFORM_LIMITS[platform]?.[contentType] > 1
    )
  }

  // Load connected accounts from localStorage
  useEffect(() => {
    const savedPlatforms = localStorage.getItem('connectedPlatforms')
    if (savedPlatforms) {
      const platforms = JSON.parse(savedPlatforms)
      const connected = platforms
        .filter((p: any) => p.connected)
        .map((p: any) => p.id === 'twitter' ? 'x' : p.id) // Map twitter to x for consistency
      setConnectedAccounts(connected)
    }
  }, [])

  // Clean up preview URLs when component unmounts
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

  const getMaxUploadLimitForPlatforms = (platforms: Platform[]) => {
    if (platforms.length === 0) return 1
    const limits = platforms.map(platform =>
      PLATFORM_LIMITS[platform]?.[contentType] || 1
    )
    // Use maximum limit to allow multiple uploads
    return Math.max(...limits)
  }

  // Get platforms that only support single content
  const getSingleUploadPlatforms = () => {
    return selectedPlatforms.filter(platform =>
      PLATFORM_LIMITS[platform]?.[contentType] === 1
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

    // Take only as many files as we have slots available
    const filesToProcess = files.slice(0, availableSlots)

    // Validate file types
    const validFiles: UploadedFileData[] = []

    for (const file of filesToProcess) {
      const isVideo = uploadType === 'video' && file.type.startsWith('video/')
      const isImage = uploadType === 'image' && file.type.startsWith('image/')

      if (!isVideo && !isImage) {
        alert(`File "${file.name}" is not a valid ${uploadType} file`)
        continue
      }

      // Create preview URL with unique ID
      const url = URL.createObjectURL(file)
      const fileId = generateFileId()
      validFiles.push({
        file,
        previewUrl: url,
        fileId
      })
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
    // Validate input
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform')
      return
    }

    // Validate content
    if (uploadType !== 'text' && uploadedFiles.length === 0) {
      alert('Please upload at least one file')
      return
    }

    if (uploadType === 'text' && !textContent && !urlContent) {
      alert('Please enter text or URL content')
      return
    }

    try {
      // Store files in IndexedDB
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

        // Only store metadata in localStorage
        fileMetadata.push({
          id: fileData.fileId,
          name: fileData.file.name,
          type: fileData.file.type,
          size: fileData.file.size
        })
      }

      // Store actual file data in IndexedDB
      await fileStorage.storeFiles(filesToStore)

      // Store metadata in localStorage (much smaller)
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

      // Navigate to generate page
      router.push('/generate')
    } catch (error) {
      console.error('Error storing files:', error)
      alert('Failed to process files. Please try again with smaller files or fewer items.')
    }
  }

  const maxUploadLimit = getMaxUploadLimit()
  const multiUploadPlatforms = getMultiUploadPlatforms()
  const singleUploadPlatforms = getSingleUploadPlatforms()

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
              <span className="text-text-secondary text-sm">/ Upload</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-text-secondary hover:text-primary transition-colors">Dashboard</Link>
              <Link href="/upload" className="text-primary font-semibold">Upload</Link>
              <Link href="/schedule" className="text-text-secondary hover:text-primary transition-colors">Schedule</Link>
              <Link href="/analytics" className="text-text-secondary hover:text-primary transition-colors">Analytics</Link>
              <Link href="/settings" className="text-text-secondary hover:text-primary transition-colors">Settings</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-2">Upload / Import Content</h1>
          <p className="text-text-secondary text-lg">Choose your content source and select target platforms</p>
        </div>

        <div className="space-y-8">
          {/* Step 1: Choose Upload Type and Content Type */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                1
              </div>
              <h2 className="text-2xl font-bold text-text-primary">Choose Content Source & Type</h2>
            </div>

            {/* Content Type Selection */}
            <div className="mb-6">
              <h3 className="font-semibold text-text-primary mb-3">Content Type</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => setContentType('post')}
                  className={`px-6 py-3 rounded-lg border-2 font-medium transition-all ${
                    contentType === 'post'
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  📱 Post / Feed
                </button>
                <button
                  onClick={() => setContentType('story')}
                  className={`px-6 py-3 rounded-lg border-2 font-medium transition-all ${
                    contentType === 'story'
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  ⏰ Story / Reel
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setUploadType('video')}
                className={`p-6 rounded-xl border-2 transition-all ${
                  uploadType === 'video'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-4xl mb-3">🎬</div>
                <h3 className="font-bold text-text-primary mb-1">Upload Video</h3>
                <p className="text-sm text-text-secondary">MP4, MOV, AVI up to 500MB</p>
              </button>

              <button
                onClick={() => setUploadType('image')}
                className={`p-6 rounded-xl border-2 transition-all ${
                  uploadType === 'image'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-4xl mb-3">🖼️</div>
                <h3 className="font-bold text-text-primary mb-1">Upload Image</h3>
                <p className="text-sm text-text-secondary">JPG, PNG, GIF up to 10MB</p>
              </button>

              <button
                onClick={() => setUploadType('text')}
                className={`p-6 rounded-xl border-2 transition-all ${
                  uploadType === 'text'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-4xl mb-3">📝</div>
                <h3 className="font-bold text-text-primary mb-1">Paste Text/URL</h3>
                <p className="text-sm text-text-secondary">Or import from link</p>
              </button>
            </div>

            {/* Upload Limit Info */}
            {selectedPlatforms.length > 0 && uploadType !== 'text' && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-lg">ℹ️</span>
                  <div>
                    <p className="text-sm text-blue-900 font-medium">
                      You can upload up to {maxUploadLimit} {maxUploadLimit === 1 ? 'file' : 'files'}
                    </p>
                    {singleUploadPlatforms.length > 0 && multiUploadPlatforms.length > 0 && (
                      <div className="text-xs text-blue-700 mt-1">
                        <p>• {multiUploadPlatforms.join(', ')}: Will use all {maxUploadLimit} items</p>
                        <p>• {singleUploadPlatforms.join(', ')}: You'll select 1 item during generation</p>
                      </div>
                    )}
                    {singleUploadPlatforms.length > 0 && multiUploadPlatforms.length === 0 && (
                      <p className="text-xs text-blue-700 mt-1">
                        All selected platforms support single content only
                      </p>
                    )}
                    {multiUploadPlatforms.length > 0 && singleUploadPlatforms.length === 0 && (
                      <p className="text-xs text-blue-700 mt-1">
                        All selected platforms support up to {maxUploadLimit} items
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Upload Area */}
            <div className="mt-6">
              {uploadType !== 'text' ? (
                <>
                  {/* File Upload Section */}
                  {uploadedFiles.length < maxUploadLimit && (
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`border-3 border-dashed rounded-xl p-12 text-center transition-all ${
                        dragActive
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-300 hover:border-primary'
                      }`}
                    >
                      <div className="text-6xl mb-4">
                        {uploadType === 'video' ? '🎬' : '🖼️'}
                      </div>
                      <h3 className="text-xl font-semibold text-text-primary mb-2">
                        Drop your {uploadType}s here
                      </h3>
                      <p className="text-text-secondary mb-6">
                        or click to browse from your computer
                        {maxUploadLimit > 1 && (
                          <span className="block text-sm mt-2">
                            You can select up to {maxUploadLimit} files ({uploadedFiles.length}/{maxUploadLimit} uploaded)
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

                  {/* Uploaded Files Display */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <div className="flex items-center justify-between">
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
                          <div key={index} className="border-2 border-primary rounded-xl p-4 bg-primary/5">
                            <div className="flex items-start gap-3">
                              {/* Preview Thumbnail */}
                              <div className="w-32 h-32 rounded-lg overflow-hidden bg-black flex-shrink-0">
                                {uploadType === 'video' ? (
                                  <video
                                    src={fileData.previewUrl}
                                    className="w-full h-full object-cover"
                                    muted
                                  />
                                ) : (
                                  <img
                                    src={fileData.previewUrl}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>

                              {/* File Info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-text-primary truncate">
                                  {index + 1}. {fileData.file.name}
                                </p>
                                <p className="text-sm text-text-secondary">
                                  {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                                {maxUploadLimit > 1 && (
                                  <p className="text-xs text-primary mt-1">
                                    Item {index + 1} of {maxUploadLimit}
                                  </p>
                                )}
                              </div>

                              {/* Remove Button */}
                              <button
                                onClick={() => removeFile(index)}
                                className="px-3 py-1 bg-red-50 text-red-600 rounded text-sm font-medium hover:bg-red-100 transition-colors"
                              >
                                Remove
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Paste Text Content
                    </label>
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg input-focus resize-none"
                      placeholder="Paste your content here..."
                    />
                  </div>
                  <div className="text-center text-text-secondary font-medium">OR</div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Import from URL
                    </label>
                    <input
                      type="url"
                      value={urlContent}
                      onChange={(e) => setUrlContent(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg input-focus"
                      placeholder="https://example.com/post..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* AI Generation Options */}
            <div className="mt-6 space-y-4 p-6 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🤖</span>
                <h3 className="font-semibold text-text-primary">AI Caption Generation (Optional)</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Description
                </label>
                <textarea
                  value={contentDescription}
                  onChange={(e) => setContentDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg input-focus resize-none"
                  placeholder="Describe your content... (e.g., 'Product launch video for new eco-friendly water bottle')"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Help AI generate better captions by describing what your content is about
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Hashtags
                </label>
                <input
                  type="text"
                  value={customHashtags}
                  onChange={(e) => setCustomHashtags(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg input-focus"
                  placeholder="#YourBrand #ProductLaunch #Sustainable"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Add hashtags you want included in the generated captions
                </p>
              </div>
            </div>
          </div>

          {/* Step 2: Select Platforms */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                2
              </div>
              <h2 className="text-2xl font-bold text-text-primary">Select Target Platforms</h2>
            </div>

            <p className="text-text-secondary mb-6">
              Choose which platforms you want to repurpose your content for
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {platforms.map((platform) => {
                const isConnected = connectedAccounts.includes(platform.id)
                const platformLimit = PLATFORM_LIMITS[platform.id]?.[contentType] || 1
                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 font-semibold transition-all relative ${
                      selectedPlatforms.includes(platform.id)
                        ? `${platform.color} border-current`
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full justify-center">
                      <span className="text-2xl">{platform.icon}</span>
                      <span>{platform.name}</span>
                      {selectedPlatforms.includes(platform.id) && (
                        <span className="ml-auto text-lg">✓</span>
                      )}
                    </div>
                    <span className="text-xs opacity-75">
                      {platformLimit === 1 ? 'Single' : `Up to ${platformLimit}`} {contentType}
                    </span>
                    {!isConnected && (
                      <span className="absolute top-1 right-1 w-3 h-3 bg-orange-500 rounded-full" title="Not connected" />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-text-primary">
                <span className="font-semibold">{selectedPlatforms.length} platforms selected</span> - ReGen will create optimized versions for each platform
              </p>
              {selectedPlatforms.length > 0 && (
                <div className="mt-2 text-xs text-text-secondary space-y-1">
                  {selectedPlatforms.map(platform => {
                    const limit = PLATFORM_LIMITS[platform]?.[contentType] || 1
                    return (
                      <div key={platform}>
                        • {platform}: {limit === 1 ? 'Single content' : `Up to ${limit} items`}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {connectedAccounts.length === 0 && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800 flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  <span>No accounts connected. <Link href="/settings" className="font-semibold underline">Connect your accounts</Link> to publish content.</span>
                </p>
              </div>
            )}

            {connectedAccounts.length > 0 && selectedPlatforms.some(p => !connectedAccounts.includes(p)) && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800 flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  <span>Some selected platforms are not connected. <Link href="/settings" className="font-semibold underline">Connect them</Link> to publish to all platforms.</span>
                </p>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="flex justify-between items-center">
            <Link
              href="/dashboard"
              className="text-text-secondary hover:text-primary font-medium"
            >
              ← Back to Dashboard
            </Link>
            <button
              onClick={handleGenerate}
              disabled={selectedPlatforms.length === 0}
              className="btn-primary text-lg px-8 py-4"
            >
              Generate Previews →
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}