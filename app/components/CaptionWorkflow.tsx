'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, Badge, PlatformLogo } from './ui'
import type { SocialPlatform } from '@/lib/types/social'
import type {
  PrimaryCaption,
  PlatformCaptionInstance,
  CaptionWorkflowState,
  CaptionUsageMode,
  CaptionAdaptation,
  CaptionAnalyticsMetadata,
} from '@/lib/types/caption'
import {
  PLATFORM_CHARACTER_LIMITS,
  checkCaptionLimit,
  countEmojis,
  countLineBreaks,
  generateContentHash,
  calculateSimilarity,
  createPlatformInstance,
} from '@/lib/types/caption'
import {
  applyAdaptation,
  applyAdaptations,
  getRecommendedAdaptations,
  autoFitPlatform,
  ADAPTATION_DESCRIPTIONS,
} from '@/lib/utils/captionAdaptations'

// ============================================
// TYPES
// ============================================

interface CaptionWorkflowProps {
  availablePlatforms: SocialPlatform[]
  initialCaption?: string
  initialHashtags?: string[]
  contentDescription?: string
  imageData?: string
  tone?: 'professional' | 'engaging' | 'casual'
  onComplete: (data: {
    primaryCaption: PrimaryCaption
    platformInstances: Record<SocialPlatform, PlatformCaptionInstance>
    analyticsMetadata: CaptionAnalyticsMetadata[]
  }) => void
  onCancel?: () => void
}

type WorkflowStep = 'source' | 'generate' | 'distribute' | 'review'

// ============================================
// COMPONENT
// ============================================

export function CaptionWorkflow({
  availablePlatforms,
  initialCaption,
  initialHashtags = [],
  contentDescription,
  imageData,
  tone = 'engaging',
  onComplete,
  onCancel,
}: CaptionWorkflowProps) {
  // Workflow state
  const [step, setStep] = useState<WorkflowStep>('source')
  const [sourcePlatform, setSourcePlatform] = useState<SocialPlatform>('instagram')
  const [isGenerating, setIsGenerating] = useState(false)

  // Primary caption state
  const [primaryCaption, setPrimaryCaption] = useState<PrimaryCaption | null>(null)
  const [isLocked, setIsLocked] = useState(true)
  const [editingPrimary, setEditingPrimary] = useState(false)
  const [tempPrimaryContent, setTempPrimaryContent] = useState('')

  // Platform instances state
  const [platformInstances, setPlatformInstances] = useState<Record<SocialPlatform, PlatformCaptionInstance>>(
    {} as Record<SocialPlatform, PlatformCaptionInstance>
  )
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([])

  // Platform editing state
  const [editingPlatform, setEditingPlatform] = useState<SocialPlatform | null>(null)
  const [tempPlatformContent, setTempPlatformContent] = useState('')
  const [showAdaptationMenu, setShowAdaptationMenu] = useState<SocialPlatform | null>(null)

  // Feedback message state
  const [feedbackMessage, setFeedbackMessage] = useState<{ message: string; type: 'success' | 'warning' } | null>(null)

  // Ref for adaptation menu (to detect clicks outside)
  const adaptationMenuRef = useRef<HTMLDivElement>(null)

  // Close adaptation menu when clicking outside
  useEffect(() => {
    if (!showAdaptationMenu) return

    const handleClickOutside = (event: MouseEvent) => {
      if (adaptationMenuRef.current && !adaptationMenuRef.current.contains(event.target as Node)) {
        setShowAdaptationMenu(null)
      }
    }

    // Use setTimeout to avoid immediate close when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAdaptationMenu])

  // Show temporary feedback message
  const showFeedback = (message: string, type: 'success' | 'warning' = 'success') => {
    setFeedbackMessage({ message, type })
    setTimeout(() => setFeedbackMessage(null), 4000)
  }

  // ============================================
  // GENERATE PRIMARY CAPTION
  // ============================================

  const generateCaption = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: sourcePlatform,
          tone,
          description: contentDescription,
          imageData,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate caption')

      const data = await response.json()
      const caption = data.caption || 'Your engaging caption here...'
      const hashtags = extractHashtags(caption)
      const cleanCaption = removeHashtagsFromCaption(caption)

      const newPrimaryCaption: PrimaryCaption = {
        id: `caption_${Date.now()}`,
        content: cleanCaption,
        hashtags: [...hashtags, ...initialHashtags],
        sourcePlatform,
        generatedAt: new Date(),
        generatedBy: 'ai',
        isLocked: true,
        metadata: {
          tone,
          contentDescription,
          imageAnalysis: data.imageAnalysis,
        },
      }

      setPrimaryCaption(newPrimaryCaption)
      initializePlatformInstances(newPrimaryCaption)
      setStep('distribute')
    } catch (error) {
      console.error('Error generating caption:', error)
      // Fallback to default caption
      const fallbackCaption: PrimaryCaption = {
        id: `caption_${Date.now()}`,
        content: initialCaption || getDefaultCaption(sourcePlatform),
        hashtags: initialHashtags,
        sourcePlatform,
        generatedAt: new Date(),
        generatedBy: 'manual',
        isLocked: true,
        metadata: { tone, contentDescription },
      }
      setPrimaryCaption(fallbackCaption)
      initializePlatformInstances(fallbackCaption)
      setStep('distribute')
    } finally {
      setIsGenerating(false)
    }
  }

  const useManualCaption = () => {
    const manualCaption: PrimaryCaption = {
      id: `caption_${Date.now()}`,
      content: initialCaption || '',
      hashtags: initialHashtags,
      sourcePlatform,
      generatedAt: new Date(),
      generatedBy: 'manual',
      isLocked: true,
      metadata: { tone, contentDescription },
    }
    setPrimaryCaption(manualCaption)
    initializePlatformInstances(manualCaption)
    setStep('distribute')
  }

  // ============================================
  // PLATFORM INSTANCES
  // ============================================

  const initializePlatformInstances = (caption: PrimaryCaption) => {
    const instances: Record<SocialPlatform, PlatformCaptionInstance> = {} as Record<SocialPlatform, PlatformCaptionInstance>

    for (const platform of availablePlatforms) {
      instances[platform] = createPlatformInstance(platform, caption)
      // Auto-select source platform
      if (platform === caption.sourcePlatform) {
        instances[platform].enabled = true
      }
    }

    setPlatformInstances(instances)
    setSelectedPlatforms([caption.sourcePlatform])
  }

  const togglePlatform = (platform: SocialPlatform) => {
    setPlatformInstances(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        enabled: !prev[platform].enabled,
      },
    }))
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  // ============================================
  // CAPTION CONTROLS
  // ============================================

  const resetToOriginal = (platform: SocialPlatform) => {
    if (!primaryCaption) return

    const limitCheck = checkCaptionLimit(primaryCaption.content, primaryCaption.hashtags, platform)

    setPlatformInstances(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        caption: primaryCaption.content,
        hashtags: [...primaryCaption.hashtags],
        usageMode: 'identical',
        appliedAdaptations: [],
        characterCount: limitCheck.currentLength,
        isOverLimit: limitCheck.isOverLimit,
        warningLevel: limitCheck.warningLevel,
        hasUserEdits: false,
      },
    }))
  }

  const startEditing = (platform: SocialPlatform) => {
    setEditingPlatform(platform)
    setTempPlatformContent(platformInstances[platform].caption)
  }

  const saveEdit = (platform: SocialPlatform) => {
    const limitCheck = checkCaptionLimit(tempPlatformContent, platformInstances[platform].hashtags, platform)

    setPlatformInstances(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        caption: tempPlatformContent,
        usageMode: 'manual_edit',
        characterCount: limitCheck.currentLength,
        isOverLimit: limitCheck.isOverLimit,
        warningLevel: limitCheck.warningLevel,
        hasUserEdits: true,
        lastEditedAt: new Date(),
      },
    }))
    setEditingPlatform(null)
    setTempPlatformContent('')
  }

  const cancelEdit = () => {
    setEditingPlatform(null)
    setTempPlatformContent('')
  }

  const applyAdaptationToPlatform = (platform: SocialPlatform, adaptation: CaptionAdaptation) => {
    // Visual confirmation that function was called
    console.log('=== applyAdaptationToPlatform CALLED ===')
    console.log('Platform:', platform)
    console.log('Adaptation:', adaptation)
    console.log('platformInstances keys:', Object.keys(platformInstances))

    // Debug: Show visual confirmation
    const debugMessage = `Applying ${adaptation} to ${platform}...`
    showFeedback(debugMessage, 'success')

    const instance = platformInstances[platform]
    if (!instance) {
      console.error('No instance found for platform:', platform)
      console.error('Available platforms:', Object.keys(platformInstances))
      return
    }

    const limits = PLATFORM_CHARACTER_LIMITS[platform]

    console.log('Instance found:', instance)
    console.log('Original caption:', instance.caption)
    console.log('Original hashtags:', instance.hashtags)
    console.log('Caption length:', instance.caption.length)

    // Determine appropriate options for each adaptation
    let options: { customValue?: number | string } = {}

    switch (adaptation) {
      case 'shorten':
        // For shorten, use platform limit or reduce by 30% if under limit
        const currentLen = instance.caption.length
        if (currentLen > limits.caption) {
          options.customValue = limits.caption
        } else {
          // Shorten to 70% of current length for visible effect
          options.customValue = Math.max(50, Math.floor(currentLen * 0.7))
        }
        console.log('Shorten target length:', options.customValue)
        break
      case 'reduce_hashtags':
        // Reduce to 3 hashtags
        options.customValue = 3
        break
      case 'reduce_emojis':
        // Reduce to 2 emojis
        options.customValue = 2
        break
      default:
        // Other adaptations don't need custom values
        break
    }

    const result = applyAdaptation(
      instance.caption,
      instance.hashtags,
      adaptation,
      options
    )

    console.log('Result caption:', result.caption)
    console.log('Result hashtags:', result.hashtags)

    // Check if anything actually changed
    const captionChanged = result.caption !== instance.caption
    const hashtagsChanged = JSON.stringify(result.hashtags) !== JSON.stringify(instance.hashtags)

    if (!captionChanged && !hashtagsChanged) {
      // Nothing changed - show feedback to user
      const adaptationName = ADAPTATION_DESCRIPTIONS[adaptation]?.label || adaptation
      showFeedback(`"${adaptationName}" had no effect - the caption doesn't have content to modify for this adaptation.`, 'warning')
      setShowAdaptationMenu(null)
      return
    }

    const limitCheck = checkCaptionLimit(result.caption, result.hashtags, platform)

    const adaptationName = ADAPTATION_DESCRIPTIONS[adaptation]?.label || adaptation

    console.log('=== UPDATING STATE ===')
    console.log('New caption to set:', result.caption)
    console.log('New hashtags to set:', result.hashtags)

    setPlatformInstances(prev => {
      const updated = {
        ...prev,
        [platform]: {
          ...prev[platform],
          caption: result.caption,
          hashtags: result.hashtags,
          usageMode: 'ai_adapted' as CaptionUsageMode,
          appliedAdaptations: [...prev[platform].appliedAdaptations, adaptation],
          characterCount: limitCheck.currentLength,
          isOverLimit: limitCheck.isOverLimit,
          warningLevel: limitCheck.warningLevel,
          hasUserEdits: true,
          lastEditedAt: new Date(),
        },
      }
      console.log('Updated platformInstances:', updated[platform])
      return updated
    })

    // Show success feedback (will replace the "Applying..." message)
    console.log('Showing success feedback')
    setTimeout(() => {
      showFeedback(`Applied "${adaptationName}" to ${platform} caption successfully!`)
    }, 100)
    setShowAdaptationMenu(null)
  }

  const autoFit = (platform: SocialPlatform) => {
    const instance = platformInstances[platform]
    const result = autoFitPlatform(instance.caption, instance.hashtags, platform)

    if (result.wasModified) {
      const limitCheck = checkCaptionLimit(result.caption, result.hashtags, platform)

      setPlatformInstances(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          caption: result.caption,
          hashtags: result.hashtags,
          usageMode: 'ai_adapted',
          appliedAdaptations: [...prev[platform].appliedAdaptations, 'shorten'],
          characterCount: limitCheck.currentLength,
          isOverLimit: limitCheck.isOverLimit,
          isTruncated: true,
          warningLevel: limitCheck.warningLevel,
          hasUserEdits: true,
          lastEditedAt: new Date(),
        },
      }))
    }
  }

  // ============================================
  // PRIMARY CAPTION EDITING
  // ============================================

  const startEditingPrimary = () => {
    if (!primaryCaption) return
    setTempPrimaryContent(primaryCaption.content)
    setEditingPrimary(true)
  }

  const savePrimaryEdit = () => {
    if (!primaryCaption) return

    const updatedCaption: PrimaryCaption = {
      ...primaryCaption,
      content: tempPrimaryContent,
      originalContent: primaryCaption.originalContent || primaryCaption.content,
    }

    setPrimaryCaption(updatedCaption)

    // Update all platform instances that are still 'identical'
    const updatedInstances = { ...platformInstances }
    for (const platform of Object.keys(updatedInstances) as SocialPlatform[]) {
      if (updatedInstances[platform].usageMode === 'identical') {
        const limitCheck = checkCaptionLimit(tempPrimaryContent, updatedCaption.hashtags, platform)
        updatedInstances[platform] = {
          ...updatedInstances[platform],
          caption: tempPrimaryContent,
          characterCount: limitCheck.currentLength,
          isOverLimit: limitCheck.isOverLimit,
          warningLevel: limitCheck.warningLevel,
        }
      }
    }
    setPlatformInstances(updatedInstances)

    setEditingPrimary(false)
    setTempPrimaryContent('')
  }

  // ============================================
  // COMPLETE WORKFLOW
  // ============================================

  const handleComplete = () => {
    if (!primaryCaption) return

    // Generate analytics metadata for each enabled platform
    const analyticsMetadata: CaptionAnalyticsMetadata[] = []

    for (const platform of selectedPlatforms) {
      const instance = platformInstances[platform]
      if (!instance.enabled) continue

      const metadata: CaptionAnalyticsMetadata = {
        captionId: `${primaryCaption.id}_${platform}`,
        publishedAt: new Date(),
        platform,
        primaryCaptionId: primaryCaption.id,
        usageMode: instance.usageMode,
        appliedAdaptations: instance.appliedAdaptations,
        contentHash: generateContentHash(instance.caption, instance.hashtags),
        characterCount: instance.characterCount,
        hashtagCount: instance.hashtags.length,
        emojiCount: countEmojis(instance.caption),
        lineBreakCount: countLineBreaks(instance.caption),
        isIdenticalToPrimary: instance.usageMode === 'identical',
        similarityScore: calculateSimilarity(primaryCaption.content, instance.caption),
      }
      analyticsMetadata.push(metadata)
    }

    // Store metadata for analytics
    try {
      const stored = localStorage.getItem('captionAnalytics') || '[]'
      const existing = JSON.parse(stored)
      localStorage.setItem('captionAnalytics', JSON.stringify([...existing, ...analyticsMetadata]))
    } catch (e) {
      console.error('Failed to store caption analytics:', e)
    }

    onComplete({
      primaryCaption,
      platformInstances,
      analyticsMetadata,
    })
  }

  // ============================================
  // HELPERS
  // ============================================

  function extractHashtags(text: string): string[] {
    const matches = text.match(/#\w+/g) || []
    return matches.map(h => h.replace('#', ''))
  }

  function removeHashtagsFromCaption(text: string): string {
    return text.replace(/#\w+/g, '').replace(/\s+/g, ' ').trim()
  }

  function getDefaultCaption(platform: SocialPlatform): string {
    const defaults: Record<SocialPlatform, string> = {
      instagram: 'Check out this amazing content! What do you think?',
      tiktok: 'POV: You discovered something amazing',
      youtube: 'Watch till the end for a surprise!',
      twitter: 'This is worth sharing. Thoughts?',
      linkedin: 'Excited to share this insight with my network.',
      facebook: 'Had to share this with you all!',
      snapchat: 'You have to see this!',
    }
    return defaults[platform]
  }

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderCharacterCount = (instance: PlatformCaptionInstance) => {
    const limits = PLATFORM_CHARACTER_LIMITS[instance.platform]
    const percentage = (instance.characterCount / limits.caption) * 100

    return (
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              instance.warningLevel === 'exceeded'
                ? 'bg-red-500'
                : instance.warningLevel === 'approaching'
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${
          instance.warningLevel === 'exceeded'
            ? 'text-red-600'
            : instance.warningLevel === 'approaching'
            ? 'text-yellow-600'
            : 'text-text-secondary'
        }`}>
          {instance.characterCount}/{limits.caption}
        </span>
      </div>
    )
  }

  const renderUsageModeBadge = (mode: CaptionUsageMode) => {
    const configs: Record<CaptionUsageMode, { label: string; className: string }> = {
      identical: { label: 'Identical', className: 'bg-green-100 text-green-700' },
      manual_edit: { label: 'Edited', className: 'bg-blue-100 text-blue-700' },
      ai_adapted: { label: 'Adapted', className: 'bg-purple-100 text-purple-700' },
      full_rewrite: { label: 'Rewritten', className: 'bg-orange-100 text-orange-700' },
    }
    const config = configs[mode]
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    )
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-2">
          <div className={`rounded-xl p-4 shadow-lg ${
            feedbackMessage.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-start gap-3">
              <span className={`text-xl ${
                feedbackMessage.type === 'success' ? 'text-green-500' : 'text-yellow-500'
              }`}>
                {feedbackMessage.type === 'success' ? '✓' : '⚠️'}
              </span>
              <div className="flex-1">
                <p className={`text-sm ${
                  feedbackMessage.type === 'success' ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {feedbackMessage.message}
                </p>
              </div>
              <button
                onClick={() => setFeedbackMessage(null)}
                className={feedbackMessage.type === 'success'
                  ? 'text-green-600 hover:text-green-800'
                  : 'text-yellow-600 hover:text-yellow-800'
                }
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {(['source', 'generate', 'distribute', 'review'] as WorkflowStep[]).map((s, index) => (
          <div key={s} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
              ${step === s ? 'bg-primary text-white' :
                (['source', 'generate', 'distribute', 'review'].indexOf(step) > index
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500')}
            `}>
              {index + 1}
            </div>
            <span className={`ml-2 text-sm font-medium ${
              step === s ? 'text-primary' : 'text-text-secondary'
            }`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {index < 3 && (
              <div className={`w-12 h-0.5 mx-4 ${
                ['source', 'generate', 'distribute', 'review'].indexOf(step) > index
                  ? 'bg-green-500'
                  : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Source Platform */}
      {step === 'source' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Select Source Platform
          </h3>
          <p className="text-sm text-text-secondary mb-6">
            Choose the primary platform for your caption. The generated caption will be optimized
            for this platform and can then be distributed to others.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {availablePlatforms.map(platform => (
              <button
                key={platform}
                onClick={() => setSourcePlatform(platform)}
                className={`
                  p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2
                  ${sourcePlatform === platform
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'}
                `}
              >
                <PlatformLogo platform={platform} size="lg" variant="color" />
                <span className="text-sm font-medium capitalize">{platform}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep('generate')}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition-colors"
            >
              Continue
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-6 py-3 border border-gray-200 text-text-secondary rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Step 2: Generate Caption */}
      {step === 'generate' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Generate Primary Caption
          </h3>
          <p className="text-sm text-text-secondary mb-6">
            Generate an AI caption optimized for <span className="font-semibold capitalize">{sourcePlatform}</span>,
            or write your own. This will be your primary caption - the single source of truth.
          </p>

          {initialCaption && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-text-secondary mb-2">Your description:</p>
              <p className="text-sm text-text-primary">{initialCaption}</p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={generateCaption}
              disabled={isGenerating}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <span>✨</span>
                  Generate with AI
                </>
              )}
            </button>
            <button
              onClick={useManualCaption}
              disabled={isGenerating}
              className="flex-1 py-3 border border-gray-200 text-text-secondary rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Write Manually
            </button>
          </div>

          <button
            onClick={() => setStep('source')}
            className="w-full mt-4 py-2 text-text-secondary hover:text-text-primary transition-colors text-sm"
          >
            ← Back to source selection
          </button>
        </Card>
      )}

      {/* Step 3: Distribute to Platforms */}
      {step === 'distribute' && primaryCaption && (
        <div className="space-y-6">
          {/* Primary Caption Card */}
          <Card className="p-6 border-2 border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-xl">📝</span>
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">Primary Caption</h3>
                  <p className="text-xs text-text-secondary">
                    Source: <span className="capitalize">{primaryCaption.sourcePlatform}</span>
                    {primaryCaption.isLocked && (
                      <span className="ml-2 text-primary">🔒 Locked</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {!editingPrimary && (
                  <button
                    onClick={startEditingPrimary}
                    className="px-3 py-1.5 text-sm font-medium text-primary border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    Edit Primary
                  </button>
                )}
              </div>
            </div>

            {editingPrimary ? (
              <div>
                <textarea
                  value={tempPrimaryContent}
                  onChange={(e) => setTempPrimaryContent(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  rows={4}
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={savePrimaryEdit}
                    className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => { setEditingPrimary(false); setTempPrimaryContent(''); }}
                    className="px-4 py-2 text-text-secondary text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <p className="mt-2 text-xs text-text-secondary">
                  ⚠️ Editing the primary caption will update all platforms still using the identical version.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-white rounded-lg border border-gray-100">
                <p className="text-text-primary whitespace-pre-wrap">{primaryCaption.content}</p>
                {primaryCaption.hashtags.length > 0 && (
                  <p className="mt-2 text-primary text-sm">
                    {primaryCaption.hashtags.map(h => `#${h}`).join(' ')}
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Platform Selection */}
          <Card className="p-6">
            <h3 className="font-semibold text-text-primary mb-4">
              Select Platforms to Distribute
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Choose which platforms should receive this caption. Each platform starts with
              the identical caption but can be individually customized.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {availablePlatforms.map(platform => {
                const instance = platformInstances[platform]
                if (!instance) return null

                return (
                  <button
                    key={platform}
                    onClick={() => togglePlatform(platform)}
                    className={`
                      p-3 rounded-xl border-2 transition-all flex items-center gap-3
                      ${instance.enabled
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'}
                    `}
                  >
                    <div className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center
                      ${instance.enabled
                        ? 'border-primary bg-primary'
                        : 'border-gray-300'}
                    `}>
                      {instance.enabled && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <PlatformLogo platform={platform} size="sm" variant="color" />
                    <span className="text-sm font-medium capitalize">{platform}</span>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Platform Previews */}
          {selectedPlatforms.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-text-primary">Caption Previews</h3>

              {selectedPlatforms.map(platform => {
                const instance = platformInstances[platform]
                if (!instance || !instance.enabled) return null

                const recommendations = getRecommendedAdaptations(
                  platform,
                  instance.caption,
                  instance.hashtags
                )

                return (
                  <Card key={platform} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <PlatformLogo platform={platform} size="md" variant="color" />
                        <div>
                          <span className="font-semibold capitalize text-text-primary">{platform}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {renderUsageModeBadge(instance.usageMode)}
                            {instance.appliedAdaptations.length > 0 && (
                              <span className="text-xs text-text-secondary">
                                ({instance.appliedAdaptations.length} adaptations)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Warning indicators */}
                        {instance.warningLevel === 'exceeded' && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                            ⚠️ Over limit
                          </span>
                        )}
                        {instance.warningLevel === 'approaching' && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                            Near limit
                          </span>
                        )}

                        {/* Action buttons */}
                        <div className="relative" ref={showAdaptationMenu === platform ? adaptationMenuRef : undefined}>
                          <button
                            onClick={() => setShowAdaptationMenu(showAdaptationMenu === platform ? null : platform)}
                            className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Adapt ▾
                          </button>

                          {/* Adaptation menu */}
                          {showAdaptationMenu === platform && (
                            <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-2">
                              <p className="px-3 py-1 text-xs font-medium text-text-secondary border-b border-gray-100 mb-1">
                                Rule-based adaptations (no AI rewrite)
                              </p>
                              {Object.entries(ADAPTATION_DESCRIPTIONS).map(([key, desc]) => {
                                const adaptationKey = key as CaptionAdaptation
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      console.log('Adaptation clicked:', key, 'for platform:', platform)
                                      applyAdaptationToPlatform(platform, adaptationKey)
                                    }}
                                    className={`
                                      w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer
                                      ${recommendations.includes(adaptationKey) ? 'bg-primary/5' : ''}
                                    `}
                                  >
                                    <span>{desc.icon}</span>
                                    <div>
                                      <span className="text-sm font-medium text-text-primary">{desc.label}</span>
                                      {recommendations.includes(adaptationKey) && (
                                        <span className="ml-2 text-xs text-primary">Recommended</span>
                                      )}
                                      <p className="text-xs text-text-secondary">{desc.description}</p>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {instance.isOverLimit && (
                          <button
                            onClick={() => autoFit(platform)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                          >
                            Auto-fit
                          </button>
                        )}

                        {editingPlatform === platform ? (
                          <>
                            <button
                              onClick={() => saveEdit(platform)}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditing(platform)}
                              className="px-3 py-1.5 text-xs font-medium text-primary border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors"
                            >
                              Edit
                            </button>
                            {instance.usageMode !== 'identical' && (
                              <button
                                onClick={() => resetToOriginal(platform)}
                                className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                Reset
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Caption content */}
                    {editingPlatform === platform ? (
                      <textarea
                        value={tempPlatformContent}
                        onChange={(e) => setTempPlatformContent(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        rows={4}
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        {/* Debug: Show update timestamp */}
                        {instance.lastEditedAt && (
                          <p className="text-xs text-gray-400 mb-1">
                            Last updated: {new Date(instance.lastEditedAt).toLocaleTimeString()}
                          </p>
                        )}
                        <p className="text-sm text-text-primary whitespace-pre-wrap">
                          {instance.caption}
                        </p>
                        {instance.hashtags.length > 0 && (
                          <p className="mt-2 text-primary text-sm">
                            {instance.hashtags.map(h => `#${h}`).join(' ')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Character count bar */}
                    {renderCharacterCount(instance)}

                    {/* Applied adaptations */}
                    {instance.appliedAdaptations.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {instance.appliedAdaptations.map((adaptation, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full"
                          >
                            {ADAPTATION_DESCRIPTIONS[adaptation]?.icon} {ADAPTATION_DESCRIPTIONS[adaptation]?.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-4">
            <button
              onClick={() => setStep('review')}
              disabled={selectedPlatforms.length === 0}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Review & Confirm
            </button>
            <button
              onClick={() => setStep('source')}
              className="px-6 py-3 border border-gray-200 text-text-secondary rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 'review' && primaryCaption && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Review Caption Distribution
            </h3>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-primary">{selectedPlatforms.length}</p>
                <p className="text-xs text-text-secondary">Platforms</p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-green-600">
                  {Object.values(platformInstances).filter(i => i.enabled && i.usageMode === 'identical').length}
                </p>
                <p className="text-xs text-text-secondary">Identical</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {Object.values(platformInstances).filter(i => i.enabled && i.usageMode === 'manual_edit').length}
                </p>
                <p className="text-xs text-text-secondary">Edited</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {Object.values(platformInstances).filter(i => i.enabled && i.usageMode === 'ai_adapted').length}
                </p>
                <p className="text-xs text-text-secondary">Adapted</p>
              </div>
            </div>

            {/* Platform breakdown */}
            <div className="space-y-3">
              {selectedPlatforms.map(platform => {
                const instance = platformInstances[platform]
                if (!instance || !instance.enabled) return null

                return (
                  <div key={platform} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <PlatformLogo platform={platform} size="sm" variant="color" />
                      <span className="font-medium capitalize">{platform}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderUsageModeBadge(instance.usageMode)}
                      {instance.isOverLimit && (
                        <span className="text-red-500 text-xs">⚠️ Over limit</span>
                      )}
                      <span className="text-xs text-text-secondary">
                        {instance.characterCount} chars
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Warnings */}
            {Object.values(platformInstances).some(i => i.enabled && i.isOverLimit) && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Some platforms have captions exceeding their character limits. Consider using Auto-fit or editing them.</span>
                </p>
              </div>
            )}

            {/* Analytics notice */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 flex items-center gap-2">
                <span>📊</span>
                <span>Caption usage will be tracked for analytics. Compare performance of identical vs adapted captions in your analytics dashboard.</span>
              </p>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleComplete}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition-colors"
            >
              Confirm & Continue
            </button>
            <button
              onClick={() => setStep('distribute')}
              className="px-6 py-3 border border-gray-200 text-text-secondary rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Back to Edit
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default CaptionWorkflow
