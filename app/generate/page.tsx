'use client'

import { useState } from 'react'
import Link from 'next/link'

type Tone = 'casual' | 'professional' | 'engaging'

export default function GeneratePage() {
  const [tone, setTone] = useState<Tone>('engaging')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<{ caption: string; hashtags: string[] }>>([])

  const handleGenerate = async () => {
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setSuggestions([
        {
          caption: 'Transform your content strategy with AI-powered insights! 🚀',
          hashtags: ['#ContentMarketing', '#AI', '#SocialMedia', '#MarketingTips']
        },
        {
          caption: 'Unlock the power of AI to repurpose your content across every platform seamlessly.',
          hashtags: ['#DigitalMarketing', '#ContentCreation', '#AITools', '#Productivity']
        },
        {
          caption: 'Say goodbye to manual content creation. Let AI do the heavy lifting! ✨',
          hashtags: ['#Automation', '#ContentStrategy', '#MarketingAutomation', '#GrowthHacking']
        }
      ])
      setLoading(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-teal-600">
              🚀 ReGen
            </Link>
            <nav className="flex gap-6">
              <Link href="/upload" className="text-gray-600 hover:text-gray-900">Upload</Link>
              <Link href="/generate" className="text-teal-600 font-semibold">Generate</Link>
              <Link href="/schedule" className="text-gray-600 hover:text-gray-900">Schedule</Link>
              <Link href="/analytics" className="text-gray-600 hover:text-gray-900">Analytics</Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Caption Generator</h1>
          <p className="text-gray-600">Generate engaging captions and hashtags for your content</p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Describe your content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all resize-none"
              placeholder="E.g., A video about productivity tips for remote workers..."
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Tone
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setTone('casual')}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                  tone === 'casual'
                    ? 'bg-gradient-to-r from-teal-400 to-teal-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                😊 Casual
              </button>
              <button
                onClick={() => setTone('professional')}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                  tone === 'professional'
                    ? 'bg-gradient-to-r from-teal-400 to-teal-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💼 Professional
              </button>
              <button
                onClick={() => setTone('engaging')}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                  tone === 'engaging'
                    ? 'bg-gradient-to-r from-teal-400 to-teal-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ✨ Engaging
              </button>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!content || loading}
            className="w-full bg-gradient-to-r from-teal-400 to-teal-600 text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? '✨ Generating...' : '✨ Generate Captions'}
          </button>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Generated Suggestions</h2>
            <div className="space-y-6">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-600 font-bold">
                      {index + 1}
                    </span>
                    <button className="text-teal-600 hover:text-teal-700 font-semibold text-sm">
                      📋 Copy
                    </button>
                  </div>
                  <p className="text-gray-900 text-lg mb-4">{suggestion.caption}</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestion.hashtags.map((tag, i) => (
                      <span
                        key={i}
                        className="inline-block bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generation History */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Generations</h2>
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="divide-y divide-gray-200">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-6 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium mb-1">
                        Sample caption for content generation #{i}
                      </p>
                      <p className="text-sm text-gray-600">Generated 2 hours ago • Engaging tone</p>
                    </div>
                    <button className="text-teal-600 hover:text-teal-700 font-semibold text-sm">
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
