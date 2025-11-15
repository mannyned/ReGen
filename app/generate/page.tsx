'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Preview = {
  id: number
  platform: string
  icon: string
  format: string
  caption: string
  hashtags: string[]
  thumbnail: string
}

export default function GeneratePage() {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [previews, setPreviews] = useState<Preview[]>([
    {
      id: 1,
      platform: 'TikTok',
      icon: '🎵',
      format: '15s vertical video',
      caption: 'Transform your content strategy with AI! 🚀 See how ReGen helps creators save 10+ hours per week.',
      hashtags: ['#ContentCreation', '#AITools', '#CreatorTips', '#SocialMedia'],
      thumbnail: '🎬'
    },
    {
      id: 2,
      platform: 'Instagram',
      icon: '📷',
      format: 'Carousel post (1:1)',
      caption: 'Swipe to see how AI is changing content creation 👉\n\nReGen transforms one video into posts for every platform. No more manual editing!',
      hashtags: ['#Instagram', '#ContentMarketing', '#CreatorEconomy'],
      thumbnail: '🖼️'
    },
    {
      id: 3,
      platform: 'YouTube',
      icon: '▶️',
      format: 'Short (vertical)',
      caption: 'The SECRET to posting on every platform without burnout | Try ReGen today',
      hashtags: ['#YouTubeShorts', '#ContentCreator', '#AIContentCreation'],
      thumbnail: '🎥'
    },
    {
      id: 4,
      platform: 'X (Twitter)',
      icon: '🐦',
      format: 'Tweet thread',
      caption: 'Creators: Stop wasting hours on manual repurposing.\n\nReGen AI:\n• Upload once\n• Generate for all platforms\n• Edit & schedule\n• Track performance\n\nGame changer 🔥',
      hashtags: ['#CreatorTools', '#AIforCreators'],
      thumbnail: '💬'
    },
    {
      id: 5,
      platform: 'LinkedIn',
      icon: '💼',
      format: 'Professional post',
      caption: 'Content repurposing doesn\'t have to be painful.\n\nI\'ve been using AI to transform one video into platform-specific posts for TikTok, Instagram, YouTube, and more.\n\nThe result? 10+ hours saved per week and 3x more engagement.\n\nHere\'s my workflow:',
      hashtags: ['#ContentStrategy', '#MarketingAutomation', '#CreatorEconomy'],
      thumbnail: '📊'
    }
  ])

  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedPreviews, setSelectedPreviews] = useState<number[]>([1, 2, 3])

  const handleEditCaption = (id: number, newCaption: string) => {
    setPreviews(prev =>
      prev.map(p => p.id === id ? { ...p, caption: newCaption } : p)
    )
  }

  const handleRegenerate = (id: number) => {
    setGenerating(true)
    // Simulate API call
    setTimeout(() => {
      // In a real app, this would fetch a new caption from the API
      setPreviews(prev =>
        prev.map(p =>
          p.id === id
            ? {
                ...p,
                caption: 'New AI-generated caption with fresh perspective! ✨ This is an example of regenerated content.'
              }
            : p
        )
      )
      setGenerating(false)
    }, 1500)
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
    router.push('/schedule')
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
              <Link href="/analytics" className="text-text-secondary hover:text-primary transition-colors">Analytics</Link>
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
        </div>

        {/* Stats Bar */}
        <div className="bg-gradient-brand text-white rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-white/80 text-sm mb-1">Platforms</div>
              <div className="text-2xl font-bold">{previews.length} versions created</div>
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
                  {/* Thumbnail */}
                  <div className="md:col-span-1">
                    <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center text-6xl">
                      {preview.thumbnail}
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
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Hashtags</label>
                      <div className="flex flex-wrap gap-2">
                        {preview.hashtags.map((tag, i) => (
                          <span key={i} className="badge-primary">
                            {tag}
                          </span>
                        ))}
                        <button className="px-3 py-1 text-sm text-primary hover:text-primary-hover font-medium">
                          + Add
                        </button>
                      </div>
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
