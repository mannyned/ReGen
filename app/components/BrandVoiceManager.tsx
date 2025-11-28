'use client'

import { useState, useEffect } from 'react'
import { BrandVoiceProfile, BrandVoiceAnalysis } from '../types/brandVoice'
import { usePlan } from '../context/PlanContext'

interface BrandVoiceManagerProps {
  onProfileUpdate: (profile: BrandVoiceProfile | null) => void
  currentProfile?: BrandVoiceProfile | null
}

export default function BrandVoiceManager({ onProfileUpdate, currentProfile }: BrandVoiceManagerProps) {
  const { currentPlan } = usePlan()
  const [isTrainingMode, setIsTrainingMode] = useState(false)
  const [trainingContent, setTrainingContent] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<BrandVoiceAnalysis | null>(null)
  const [profiles, setProfiles] = useState<BrandVoiceProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<BrandVoiceProfile | null>(currentProfile || null)
  const [showCreateProfile, setShowCreateProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')

  // Only available for Pro users
  if (currentPlan !== 'pro') {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl">🎯</span>
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                AI Brand Voice
                <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-xs font-bold">
                  PRO ONLY
                </span>
              </h3>
              <p className="text-sm text-gray-600">
                Let AI learn your unique voice and generate content that sounds exactly like you
              </p>
            </div>
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90">
            Upgrade to Pro
          </button>
        </div>
      </div>
    )
  }

  const handleAnalyzeContent = async () => {
    if (trainingContent.length < 50) {
      alert('Please provide at least 50 characters of content for analysis')
      return
    }

    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/brand-voice/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: trainingContent,
          platform: 'general'
        })
      })

      const data = await response.json()
      if (data.success) {
        setAnalysis(data.analysis)
      }
    } catch (error) {
      console.error('Analysis error:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleCreateProfile = () => {
    if (!newProfileName || !analysis) return

    const newProfile: BrandVoiceProfile = {
      id: `profile_${Date.now()}`,
      userId: 'current_user',
      name: newProfileName,
      description: `Brand voice profile created from analysis`,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      toneAttributes: analysis.detectedTone,
      stylePatterns: analysis.detectedStyle,
      contentPreferences: analysis.detectedPreferences,
      learnedPatterns: {
        commonPhrases: [],
        signatureWords: [],
        openingStyles: [],
        closingStyles: [],
        hashtagPatterns: [],
        emojiPreferences: []
      },
      trainingContent: {
        samples: [{
          id: `sample_${Date.now()}`,
          content: trainingContent,
          platform: 'general',
          performance: { engagement: 0, reach: 0 },
          analyzedAt: new Date()
        }],
        totalSamples: 1,
        lastAnalyzedAt: new Date()
      },
      confidence: {
        overall: analysis.confidenceScore,
        toneAccuracy: analysis.confidenceScore,
        styleAccuracy: analysis.confidenceScore - 5,
        vocabularyMatch: analysis.confidenceScore - 3
      }
    }

    const updatedProfiles = [...profiles, newProfile]
    setProfiles(updatedProfiles)
    setSelectedProfile(newProfile)
    onProfileUpdate(newProfile)
    localStorage.setItem('brandVoiceProfiles', JSON.stringify(updatedProfiles))

    // Reset form
    setShowCreateProfile(false)
    setNewProfileName('')
    setTrainingContent('')
    setAnalysis(null)
    setIsTrainingMode(false)
  }

  const handleSelectProfile = (profile: BrandVoiceProfile | null) => {
    setSelectedProfile(profile)
    onProfileUpdate(profile)
    localStorage.setItem('activeBrandVoiceProfile', profile ? profile.id : '')
  }

  // Load profiles on mount
  useEffect(() => {
    const savedProfiles = localStorage.getItem('brandVoiceProfiles')
    if (savedProfiles) {
      const parsed = JSON.parse(savedProfiles)
      setProfiles(parsed)

      const activeProfileId = localStorage.getItem('activeBrandVoiceProfile')
      if (activeProfileId) {
        const active = parsed.find((p: BrandVoiceProfile) => p.id === activeProfileId)
        if (active) {
          setSelectedProfile(active)
          onProfileUpdate(active)
        }
      }
    }
  }, [])

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            🎯 AI Brand Voice
            <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-xs font-bold animate-pulse">
              ⭐ PRO
            </span>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Generate content in your unique voice and style
          </p>
        </div>
        <button
          onClick={() => setIsTrainingMode(!isTrainingMode)}
          className="px-4 py-2 bg-white border border-purple-300 text-purple-700 rounded-lg font-medium hover:bg-purple-50 transition-colors"
        >
          {isTrainingMode ? 'Close Training' : '+ Train New Voice'}
        </button>
      </div>

      {/* Profile Selection */}
      {!isTrainingMode && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Active Voice Profile
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => handleSelectProfile(null)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  !selectedProfile
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">Default Voice</div>
                <div className="text-xs text-gray-500 mt-1">Standard caption generation</div>
              </button>

              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleSelectProfile(profile)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedProfile?.id === profile.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{profile.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {profile.toneAttributes.formality} • {profile.toneAttributes.emotion}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                        style={{ width: `${profile.confidence.overall}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">{profile.confidence.overall}%</span>
                  </div>
                </button>
              ))}

              {profiles.length < 3 && (
                <button
                  onClick={() => setIsTrainingMode(true)}
                  className="p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-400 transition-all"
                >
                  <div className="text-3xl mb-2">➕</div>
                  <div className="text-sm text-gray-600">Create New Voice</div>
                </button>
              )}
            </div>
          </div>

          {selectedProfile && (
            <div className="bg-white rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-gray-900">Voice Characteristics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Tone:</span>
                  <p className="font-medium capitalize">{selectedProfile.toneAttributes.formality}</p>
                </div>
                <div>
                  <span className="text-gray-500">Emotion:</span>
                  <p className="font-medium capitalize">{selectedProfile.toneAttributes.emotion}</p>
                </div>
                <div>
                  <span className="text-gray-500">Style:</span>
                  <p className="font-medium capitalize">{selectedProfile.stylePatterns.vocabulary}</p>
                </div>
                <div>
                  <span className="text-gray-500">Emojis:</span>
                  <p className="font-medium capitalize">{selectedProfile.contentPreferences.emojiUsage}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Training Mode */}
      {isTrainingMode && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Train New Brand Voice</h4>
            <p className="text-sm text-gray-600 mb-4">
              Paste 3-5 examples of your best-performing content. The AI will analyze your writing style,
              tone, and patterns to create a unique voice profile.
            </p>

            <textarea
              value={trainingContent}
              onChange={(e) => setTrainingContent(e.target.value)}
              placeholder="Paste your content here... (minimum 50 characters)"
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />

            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-500">
                {trainingContent.length} characters
              </span>
              <button
                onClick={handleAnalyzeContent}
                disabled={isAnalyzing || trainingContent.length < 50}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Content'}
              </button>
            </div>
          </div>

          {/* Analysis Results */}
          {analysis && (
            <div className="bg-white rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-gray-900">Analysis Results</h4>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-xs text-purple-600 mb-1">Formality</div>
                  <div className="font-semibold capitalize">{analysis.detectedTone.formality}</div>
                </div>
                <div className="p-3 bg-pink-50 rounded-lg">
                  <div className="text-xs text-pink-600 mb-1">Emotion</div>
                  <div className="font-semibold capitalize">{analysis.detectedTone.emotion}</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-xs text-purple-600 mb-1">Personality</div>
                  <div className="font-semibold capitalize">{analysis.detectedTone.personality}</div>
                </div>
                <div className="p-3 bg-pink-50 rounded-lg">
                  <div className="text-xs text-pink-600 mb-1">Sentence Style</div>
                  <div className="font-semibold capitalize">{analysis.detectedStyle.sentenceLength}</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-xs text-purple-600 mb-1">Emoji Usage</div>
                  <div className="font-semibold capitalize">{analysis.detectedPreferences.emojiUsage}</div>
                </div>
                <div className="p-3 bg-pink-50 rounded-lg">
                  <div className="text-xs text-pink-600 mb-1">Confidence</div>
                  <div className="font-semibold">{analysis.confidenceScore}%</div>
                </div>
              </div>

              {!showCreateProfile && (
                <button
                  onClick={() => setShowCreateProfile(true)}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90"
                >
                  Save as Voice Profile
                </button>
              )}

              {showCreateProfile && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="Enter profile name (e.g., 'Professional', 'Casual', 'Brand Voice')"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateProfile}
                      disabled={!newProfileName}
                      className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      Create Profile
                    </button>
                    <button
                      onClick={() => setShowCreateProfile(false)}
                      className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}