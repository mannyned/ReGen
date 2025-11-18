'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type UploadType = 'video' | 'image' | 'text'
type Platform = 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'x' | 'linkedin'

export default function UploadPage() {
  const router = useRouter()
  const [uploadType, setUploadType] = useState<UploadType>('video')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram', 'tiktok'])
  const [dragActive, setDragActive] = useState(false)
  const [textContent, setTextContent] = useState('')
  const [urlContent, setUrlContent] = useState('')
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([])
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [contentDescription, setContentDescription] = useState('')
  const [customHashtags, setCustomHashtags] = useState('')

  const platforms = [
    { id: 'tiktok' as Platform, name: 'TikTok', icon: '🎵', color: 'bg-pink-100 text-pink-700 border-pink-300' },
    { id: 'instagram' as Platform, name: 'Instagram', icon: '📷', color: 'bg-purple-100 text-purple-700 border-purple-300' },
    { id: 'youtube' as Platform, name: 'YouTube', icon: '▶️', color: 'bg-red-100 text-red-700 border-red-300' },
    { id: 'facebook' as Platform, name: 'Facebook', icon: '👥', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { id: 'x' as Platform, name: 'X (Twitter)', icon: '🐦', color: 'bg-gray-100 text-gray-700 border-gray-300' },
    { id: 'linkedin' as Platform, name: 'LinkedIn', icon: '💼', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  ]

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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    // Validate file type
    const isVideo = uploadType === 'video' && file.type.startsWith('video/')
    const isImage = uploadType === 'image' && file.type.startsWith('image/')

    if (!isVideo && !isImage) {
      alert(`Please select a ${uploadType} file`)
      return
    }

    setUploadedFile(file)

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    // Store in localStorage for generate page
    localStorage.setItem('uploadedFileName', file.name)
    localStorage.setItem('uploadedFileType', uploadType)
  }

  const handleGenerate = () => {
    // Validate input
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform')
      return
    }

    // Validate content
    if (uploadType !== 'text' && !uploadedFile) {
      alert('Please upload a file first')
      return
    }

    if (uploadType === 'text' && !textContent && !urlContent) {
      alert('Please enter text or URL content')
      return
    }

    // Store selected platforms and content info for generate page
    localStorage.setItem('selectedPlatforms', JSON.stringify(selectedPlatforms))
    localStorage.setItem('contentDescription', contentDescription)
    localStorage.setItem('customHashtags', customHashtags)

    // Navigate to generate page
    router.push('/generate')
  }

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
          {/* Step 1: Choose Upload Type */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                1
              </div>
              <h2 className="text-2xl font-bold text-text-primary">Choose Content Source</h2>
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

            {/* Upload Area */}
            <div className="mt-6">
              {uploadType !== 'text' ? (
                <>
                  {!uploadedFile ? (
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
                        Drop your {uploadType} here
                      </h3>
                      <p className="text-text-secondary mb-6">
                        or click to browse from your computer
                      </p>
                      <input
                        type="file"
                        accept={uploadType === 'video' ? 'video/*' : 'image/*'}
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="inline-block btn-primary cursor-pointer"
                      >
                        Choose File
                      </label>
                    </div>
                  ) : (
                    <div className="border-2 border-primary rounded-xl p-6 bg-primary/5">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">✅</span>
                            <div>
                              <h3 className="font-semibold text-text-primary">File Uploaded Successfully</h3>
                              <p className="text-sm text-text-secondary">{uploadedFile.name}</p>
                              <p className="text-xs text-text-secondary">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>

                          {/* Preview */}
                          <div className="rounded-lg overflow-hidden bg-black max-w-md">
                            {uploadType === 'video' ? (
                              <video
                                src={previewUrl}
                                controls
                                className="w-full"
                              />
                            ) : (
                              <img
                                src={previewUrl}
                                alt="Preview"
                                className="w-full h-auto"
                              />
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setUploadedFile(null)
                            setPreviewUrl('')
                            URL.revokeObjectURL(previewUrl)
                          }}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                        >
                          Remove
                        </button>
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
                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 font-semibold transition-all relative ${
                      selectedPlatforms.includes(platform.id)
                        ? `${platform.color} border-current`
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl">{platform.icon}</span>
                    <span>{platform.name}</span>
                    {selectedPlatforms.includes(platform.id) && (
                      <span className="ml-auto text-lg">✓</span>
                    )}
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
