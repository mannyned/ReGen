'use client'

import { useState } from 'react'
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

  const platforms = [
    { id: 'tiktok' as Platform, name: 'TikTok', icon: '🎵', color: 'bg-pink-100 text-pink-700 border-pink-300' },
    { id: 'instagram' as Platform, name: 'Instagram', icon: '📷', color: 'bg-purple-100 text-purple-700 border-purple-300' },
    { id: 'youtube' as Platform, name: 'YouTube', icon: '▶️', color: 'bg-red-100 text-red-700 border-red-300' },
    { id: 'facebook' as Platform, name: 'Facebook', icon: '👥', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { id: 'x' as Platform, name: 'X (Twitter)', icon: '🐦', color: 'bg-gray-100 text-gray-700 border-gray-300' },
    { id: 'linkedin' as Platform, name: 'LinkedIn', icon: '💼', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  ]

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
    // Handle file drop
  }

  const handleGenerate = () => {
    // Validate input
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform')
      return
    }

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
              <Link href="/analytics" className="text-text-secondary hover:text-primary transition-colors">Analytics</Link>
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
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 font-semibold transition-all ${
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
                </button>
              ))}
            </div>

            <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-text-primary">
                <span className="font-semibold">{selectedPlatforms.length} platforms selected</span> - ReGen will create optimized versions for each platform
              </p>
            </div>
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
