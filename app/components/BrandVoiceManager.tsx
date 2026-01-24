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
  const [trainingMethod, setTrainingMethod] = useState<'content' | 'custom'>('content')
  const [trainingContent, setTrainingContent] = useState('')
  const [customTone, setCustomTone] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<BrandVoiceAnalysis | null>(null)
  const [profiles, setProfiles] = useState<BrandVoiceProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<BrandVoiceProfile | null>(currentProfile || null)
  const [showCreateProfile, setShowCreateProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [editingProfile, setEditingProfile] = useState<BrandVoiceProfile | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

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

  const handleCreateCustomToneProfile = () => {
    if (!newProfileName || !customTone.trim()) return

    // Parse the custom tone input to create a profile
    const toneWords = customTone.toLowerCase().split(/[,\s]+/).filter(w => w.length > 0)

    // Map common tone descriptors to profile attributes
    const toneMapping: Record<string, { formality: string; emotion: string; personality: string }> = {
      'witty': { formality: 'casual', emotion: 'playful', personality: 'witty' },
      'funny': { formality: 'casual', emotion: 'humorous', personality: 'entertaining' },
      'engaging': { formality: 'conversational', emotion: 'enthusiastic', personality: 'engaging' },
      'professional': { formality: 'professional', emotion: 'confident', personality: 'authoritative' },
      'casual': { formality: 'casual', emotion: 'friendly', personality: 'approachable' },
      'friendly': { formality: 'casual', emotion: 'warm', personality: 'friendly' },
      'inspirational': { formality: 'conversational', emotion: 'inspiring', personality: 'motivational' },
      'educational': { formality: 'professional', emotion: 'informative', personality: 'knowledgeable' },
      'bold': { formality: 'direct', emotion: 'confident', personality: 'bold' },
      'playful': { formality: 'casual', emotion: 'playful', personality: 'fun' },
      'sarcastic': { formality: 'casual', emotion: 'sarcastic', personality: 'witty' },
      'motivational': { formality: 'conversational', emotion: 'inspiring', personality: 'motivational' },
      'authentic': { formality: 'conversational', emotion: 'genuine', personality: 'authentic' },
      'edgy': { formality: 'casual', emotion: 'bold', personality: 'edgy' },
      'warm': { formality: 'friendly', emotion: 'warm', personality: 'caring' },
      'humorous': { formality: 'casual', emotion: 'humorous', personality: 'entertaining' },
    }

    // Determine attributes based on input
    let formality = 'conversational'
    let emotion = 'engaging'
    let personality = 'authentic'

    for (const word of toneWords) {
      const mapping = toneMapping[word]
      if (mapping) {
        formality = mapping.formality
        emotion = mapping.emotion
        personality = mapping.personality
        break // Use first matching tone
      }
    }

    const newProfile: BrandVoiceProfile = {
      id: `profile_${Date.now()}`,
      userId: 'current_user',
      name: newProfileName,
      description: `Custom tone: ${customTone}`,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      toneAttributes: {
        formality,
        emotion,
        personality,
        humor: toneWords.some(w => ['funny', 'witty', 'humorous', 'sarcastic', 'playful'].includes(w)) ? 'high' : 'moderate',
        energy: toneWords.some(w => ['engaging', 'bold', 'edgy', 'motivational'].includes(w)) ? 'high' : 'moderate'
      },
      stylePatterns: {
        sentenceLength: 'mixed',
        vocabulary: toneWords.some(w => ['professional', 'educational'].includes(w)) ? 'sophisticated' : 'conversational',
        punctuationStyle: toneWords.some(w => ['bold', 'edgy', 'engaging'].includes(w)) ? 'expressive' : 'standard',
        paragraphStructure: 'varied'
      },
      contentPreferences: {
        hashtagUsage: 'moderate',
        emojiUsage: toneWords.some(w => ['playful', 'funny', 'casual', 'friendly'].includes(w)) ? 'frequent' : 'moderate',
        ctaStyle: 'conversational',
        contentLength: 'medium'
      },
      learnedPatterns: {
        commonPhrases: [],
        signatureWords: toneWords,
        openingStyles: [],
        closingStyles: [],
        hashtagPatterns: [],
        emojiPreferences: []
      },
      trainingContent: {
        samples: [],
        totalSamples: 0,
        lastAnalyzedAt: new Date()
      },
      confidence: {
        overall: 75, // Custom tone profiles start at 75% confidence
        toneAccuracy: 80,
        styleAccuracy: 70,
        vocabularyMatch: 75
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
    setCustomTone('')
    setIsTrainingMode(false)
  }

  const handleSelectProfile = (profile: BrandVoiceProfile | null) => {
    setSelectedProfile(profile)
    onProfileUpdate(profile)
    localStorage.setItem('activeBrandVoiceProfile', profile ? profile.id : '')
  }

  const handleEditProfile = (profile: BrandVoiceProfile) => {
    setEditingProfile(profile)
    setNewProfileName(profile.name)
    // If it has a custom tone description, use that
    if (profile.description?.startsWith('Custom tone:')) {
      setCustomTone(profile.description.replace('Custom tone: ', ''))
      setTrainingMethod('custom')
    } else {
      setTrainingMethod('custom')
      // Reconstruct tone from attributes
      const toneWords = []
      if (profile.toneAttributes.personality) toneWords.push(profile.toneAttributes.personality)
      if (profile.toneAttributes.emotion) toneWords.push(profile.toneAttributes.emotion)
      setCustomTone(toneWords.join(', '))
    }
    setIsTrainingMode(true)
  }

  const handleUpdateProfile = () => {
    if (!editingProfile || !newProfileName.trim()) return

    const toneWords = customTone.toLowerCase().split(/[,\s]+/).filter(w => w.length > 0)

    const toneMapping: Record<string, { formality: string; emotion: string; personality: string }> = {
      'witty': { formality: 'casual', emotion: 'playful', personality: 'witty' },
      'funny': { formality: 'casual', emotion: 'humorous', personality: 'entertaining' },
      'engaging': { formality: 'conversational', emotion: 'enthusiastic', personality: 'engaging' },
      'professional': { formality: 'professional', emotion: 'confident', personality: 'authoritative' },
      'casual': { formality: 'casual', emotion: 'friendly', personality: 'approachable' },
      'friendly': { formality: 'casual', emotion: 'warm', personality: 'friendly' },
      'inspirational': { formality: 'conversational', emotion: 'inspiring', personality: 'motivational' },
      'educational': { formality: 'professional', emotion: 'informative', personality: 'knowledgeable' },
      'bold': { formality: 'direct', emotion: 'confident', personality: 'bold' },
      'playful': { formality: 'casual', emotion: 'playful', personality: 'fun' },
      'sarcastic': { formality: 'casual', emotion: 'sarcastic', personality: 'witty' },
      'motivational': { formality: 'conversational', emotion: 'inspiring', personality: 'motivational' },
      'authentic': { formality: 'conversational', emotion: 'genuine', personality: 'authentic' },
      'edgy': { formality: 'casual', emotion: 'bold', personality: 'edgy' },
      'warm': { formality: 'friendly', emotion: 'warm', personality: 'caring' },
      'humorous': { formality: 'casual', emotion: 'humorous', personality: 'entertaining' },
    }

    let formality = 'conversational'
    let emotion = 'engaging'
    let personality = 'authentic'

    for (const word of toneWords) {
      const mapping = toneMapping[word]
      if (mapping) {
        formality = mapping.formality
        emotion = mapping.emotion
        personality = mapping.personality
        break
      }
    }

    const updatedProfile: BrandVoiceProfile = {
      ...editingProfile,
      name: newProfileName,
      description: `Custom tone: ${customTone}`,
      updatedAt: new Date(),
      toneAttributes: {
        formality,
        emotion,
        personality,
        humor: toneWords.some(w => ['funny', 'witty', 'humorous', 'sarcastic', 'playful'].includes(w)) ? 'high' : 'moderate',
        energy: toneWords.some(w => ['engaging', 'bold', 'edgy', 'motivational'].includes(w)) ? 'high' : 'moderate'
      },
      stylePatterns: {
        sentenceLength: 'mixed',
        vocabulary: toneWords.some(w => ['professional', 'educational'].includes(w)) ? 'sophisticated' : 'conversational',
        punctuationStyle: toneWords.some(w => ['bold', 'edgy', 'engaging'].includes(w)) ? 'expressive' : 'standard',
        paragraphStructure: 'varied'
      },
      contentPreferences: {
        hashtagUsage: 'moderate',
        emojiUsage: toneWords.some(w => ['playful', 'funny', 'casual', 'friendly'].includes(w)) ? 'frequent' : 'moderate',
        ctaStyle: 'conversational',
        contentLength: 'medium'
      },
      learnedPatterns: {
        ...editingProfile.learnedPatterns,
        signatureWords: toneWords,
      }
    }

    const updatedProfiles = profiles.map(p =>
      p.id === editingProfile.id ? updatedProfile : p
    )
    setProfiles(updatedProfiles)
    localStorage.setItem('brandVoiceProfiles', JSON.stringify(updatedProfiles))

    // Update selected profile if it was the one being edited
    if (selectedProfile?.id === editingProfile.id) {
      setSelectedProfile(updatedProfile)
      onProfileUpdate(updatedProfile)
    }

    // Reset form
    setEditingProfile(null)
    setNewProfileName('')
    setCustomTone('')
    setIsTrainingMode(false)
  }

  const handleDeleteProfile = (profileId: string) => {
    const updatedProfiles = profiles.filter(p => p.id !== profileId)
    setProfiles(updatedProfiles)
    localStorage.setItem('brandVoiceProfiles', JSON.stringify(updatedProfiles))

    // If deleted profile was selected, clear selection
    if (selectedProfile?.id === profileId) {
      setSelectedProfile(null)
      onProfileUpdate(null)
      localStorage.setItem('activeBrandVoiceProfile', '')
    }

    setShowDeleteConfirm(null)
  }

  const handleCancelEdit = () => {
    setEditingProfile(null)
    setNewProfileName('')
    setCustomTone('')
    setTrainingContent('')
    setAnalysis(null)
    setIsTrainingMode(false)
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
          onClick={() => {
            if (isTrainingMode) {
              handleCancelEdit()
            } else {
              setIsTrainingMode(true)
            }
          }}
          className="px-4 py-2 bg-white border border-purple-300 text-purple-700 rounded-lg font-medium hover:bg-purple-50 transition-colors"
        >
          {isTrainingMode ? (editingProfile ? 'Cancel Edit' : 'Close Training') : '+ Train New Voice'}
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
                <div className="text-xs text-gray-500 mt-1">Uses your selected Caption Tone</div>
              </button>

              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={`relative p-4 rounded-lg border-2 transition-all ${
                    selectedProfile?.id === profile.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Edit/Delete buttons */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditProfile(profile)
                      }}
                      className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-100 rounded transition-colors"
                      title="Edit profile"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowDeleteConfirm(profile.id)
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                      title="Delete profile"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Delete confirmation */}
                  {showDeleteConfirm === profile.id && (
                    <div className="absolute inset-0 bg-white rounded-lg border-2 border-red-300 p-3 flex flex-col items-center justify-center z-10">
                      <p className="text-sm text-gray-700 mb-3 text-center">Delete this voice?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteProfile(profile.id)}
                          className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Profile content - clickable area */}
                  <button
                    onClick={() => handleSelectProfile(profile)}
                    className="w-full text-left"
                  >
                    <div className="font-semibold text-gray-900 pr-16">{profile.name}</div>
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
                </div>
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
          {/* Training Method Toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setTrainingMethod('content')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                trainingMethod === 'content'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Analyze Content
            </button>
            <button
              onClick={() => setTrainingMethod('custom')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                trainingMethod === 'custom'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Set Custom Tone
            </button>
          </div>

          {/* Content Analysis Method */}
          {trainingMethod === 'content' && (
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Train from Your Content</h4>
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
          )}

          {/* Custom Tone Method */}
          {trainingMethod === 'custom' && (
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">
                {editingProfile ? `Edit Voice: ${editingProfile.name}` : 'Set Your Tone'}
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Describe your desired tone using keywords like: witty, funny, engaging, professional,
                casual, inspirational, bold, playful, sarcastic, authentic, edgy, warm
              </p>

              <input
                type="text"
                value={customTone}
                onChange={(e) => setCustomTone(e.target.value)}
                placeholder="e.g., Witty, Funny and Engaging"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />

              {/* Quick Tone Presets */}
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Quick presets:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Witty & Engaging',
                    'Professional & Confident',
                    'Casual & Friendly',
                    'Bold & Inspirational',
                    'Playful & Fun',
                    'Authentic & Warm'
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setCustomTone(preset)}
                      className={`px-3 py-1 text-xs rounded-full border transition-all ${
                        customTone === preset
                          ? 'bg-purple-100 border-purple-400 text-purple-700'
                          : 'border-gray-300 text-gray-600 hover:border-purple-300 hover:text-purple-600'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview of detected attributes */}
              {customTone.trim() && (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-600 mb-2">Detected style:</p>
                  <div className="flex flex-wrap gap-2">
                    {customTone.toLowerCase().split(/[,\s]+/).filter(w => w.length > 2).map((word, i) => (
                      <span key={i} className="px-2 py-1 bg-white text-purple-700 rounded text-xs font-medium">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Create/Update Profile Form */}
              <div className="mt-4 space-y-3 pt-4 border-t border-gray-200">
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Profile name (e.g., 'My Fun Voice', 'Brand Personality')"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={editingProfile ? handleUpdateProfile : handleCreateCustomToneProfile}
                    disabled={!customTone.trim() || !newProfileName.trim()}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingProfile ? 'Update Voice Profile' : 'Create Voice Profile'}
                  </button>
                  {editingProfile && (
                    <button
                      onClick={handleCancelEdit}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Analysis Results - Only show for content analysis method */}
          {trainingMethod === 'content' && analysis && (
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