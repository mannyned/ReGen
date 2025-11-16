'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type CaptionTone = 'professional' | 'engaging' | 'casual'

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
  const [selectedTone, setSelectedTone] = useState<CaptionTone>('engaging')
  const [showToneSelector, setShowToneSelector] = useState(true)
  const [uploadedFileName, setUploadedFileName] = useState<string>('')
  const [uploadedFileType, setUploadedFileType] = useState<string>('')

  // Load uploaded file info from localStorage
  useEffect(() => {
    const fileName = localStorage.getItem('uploadedFileName')
    const fileType = localStorage.getItem('uploadedFileType')

    if (fileName) setUploadedFileName(fileName)
    if (fileType) setUploadedFileType(fileType)
  }, [])

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
  const [editingHashtags, setEditingHashtags] = useState<number | null>(null)
  const [selectedPreviews, setSelectedPreviews] = useState<number[]>([1, 2, 3])

  const tones = [
    { id: 'professional' as CaptionTone, label: 'Professional', icon: '💼', description: 'Formal and business-focused' },
    { id: 'engaging' as CaptionTone, label: 'Engaging', icon: '✨', description: 'Fun and attention-grabbing' },
    { id: 'casual' as CaptionTone, label: 'Casual', icon: '😊', description: 'Friendly and relaxed' },
  ]

  const sampleCaptionsByTone = {
    professional: {
      tiktok: "Sharing insights on how AI technology is transforming content creation workflows. This innovative approach helps teams maintain consistent quality across all platforms.",
      instagram: "Professional tip: Strategic content repurposing increases reach by 300%.\n\nDiscover how leading brands leverage AI to optimize their social media strategy.",
      youtube: "The Complete Guide to Professional Content Repurposing | Industry Best Practices",
      twitter: "Enterprise content teams: AI-powered repurposing reduces production time by 85%.\n\nKey benefits:\n• Consistent messaging\n• Scalable output\n• Data-driven optimization\n\nLearn more ↓",
      linkedin: "Content repurposing is no longer optional—it's essential for competitive advantage.\n\nAfter implementing AI-driven workflows, our team achieved:\n✓ 3x content output\n✓ 40% cost reduction\n✓ Improved cross-platform consistency\n\nHere's our framework:"
    },
    engaging: {
      tiktok: "🚀 OMG you NEED to see this! We just dropped something absolutely game-changing for content creators everywhere! Drop a 🔥 if you're ready to level up your content game! 💪✨",
      instagram: "Swipe to see how AI is changing content creation 👉\n\nThis is literally THE secret weapon every creator needs! 🎯💥\n\nWho else is ready to 10x their content? 🙋‍♀️",
      youtube: "This AI Tool Changed EVERYTHING About My Content Strategy! (You Won't Believe #3) 🤯",
      twitter: "POV: You just discovered the content creation hack that saves 10+ hours per week 🤯\n\nCreators are calling it a \"game changer\" 🔥\n\nHere's why everyone's switching:",
      linkedin: "Hot take: Manual content repurposing is dead 💀\n\nI've been testing this AI approach for 30 days and the results are INSANE:\n\n📈 300% more engagement\n⚡ 85% time saved\n🎯 Better targeting\n\nThread below 👇"
    },
    casual: {
      tiktok: "Hey everyone! Just wanted to share something cool we've been working on. It's been a fun journey and we think you'll really like it. Let us know what you think! 😊",
      instagram: "Quick update: been trying out this new content thing and it's pretty neat!\n\nSwipe through to see how it works. Let me know if you have questions! 💬",
      youtube: "Just sharing some thoughts on content creation | My new workflow",
      twitter: "So I've been using this new approach for my content and it's actually pretty helpful.\n\nFigured I'd share in case anyone else is interested. Happy to chat about it!",
      linkedin: "Wanted to share something that's been making my content workflow easier lately.\n\nIt's nothing revolutionary, but it's saved me quite a bit of time. Thought some of you might find it useful too.\n\nHappy to discuss if you're curious!"
    }
  }

  const handleEditCaption = (id: number, newCaption: string) => {
    setPreviews(prev =>
      prev.map(p => p.id === id ? { ...p, caption: newCaption } : p)
    )
  }

  const handleRegenerate = (id: number) => {
    setGenerating(true)
    setShowToneSelector(true)
    // Simulate API call
    setTimeout(() => {
      const preview = previews.find(p => p.id === id)
      if (preview) {
        const platformKey = preview.platform.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').replace(' ', '') as keyof typeof sampleCaptionsByTone.professional
        const newCaption = sampleCaptionsByTone[selectedTone][platformKey] || 'New AI-generated caption with fresh perspective! ✨'

        setPreviews(prev =>
          prev.map(p =>
            p.id === id
              ? {
                  ...p,
                  caption: newCaption
                }
              : p
          )
        )
      }
      setGenerating(false)
    }, 1500)
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
                    <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center text-6xl relative overflow-hidden">
                      {preview.thumbnail}
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                        {preview.platform}
                      </div>
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
