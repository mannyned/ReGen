'use client'

import { useState, useEffect } from 'react'
import type { TikTokPrivacyLevel, TikTokBrandContentType, TikTokCreatorInfo } from '@/lib/types/tiktok'

export interface TikTokPostSettingsData {
  privacyLevel: TikTokPrivacyLevel | null
  allowComments: boolean
  allowDuet: boolean
  allowStitch: boolean
  brandContentToggle: boolean
  brandContentType: TikTokBrandContentType
  agreedToTerms: boolean
}

interface TikTokPostSettingsProps {
  isVideo: boolean
  caption?: string // Caption/title to display (Point 2a)
  settings: TikTokPostSettingsData
  onChange: (settings: TikTokPostSettingsData) => void
  disabled?: boolean
}

const PRIVACY_LABELS: Record<TikTokPrivacyLevel, { label: string; description: string }> = {
  PUBLIC_TO_EVERYONE: { label: 'Public', description: 'Everyone on TikTok' },
  MUTUAL_FOLLOW_FRIENDS: { label: 'Friends', description: 'Mutual followers only' },
  FOLLOWER_OF_CREATOR: { label: 'Followers', description: 'Your followers only' },
  SELF_ONLY: { label: 'Private', description: 'Only you' },
}

/**
 * TikTok Post Settings Component
 *
 * Implements TikTok Content Sharing Guidelines UX requirements
 * in the EXACT order specified by TikTok:
 *
 * Point 1: Creator Info Retrieval & Validation
 * Point 2: Mandatory Metadata Fields (Title, Privacy, Interactions)
 * Point 3: Commercial Content Disclosure
 * Point 4: Compliance Declarations
 * Point 5: User Control & Awareness
 *
 * @see https://developers.tiktok.com/doc/content-sharing-guidelines
 */
export function TikTokPostSettings({
  isVideo,
  caption,
  settings,
  onChange,
  disabled = false,
}: TikTokPostSettingsProps) {
  const [creatorInfo, setCreatorInfo] = useState<TikTokCreatorInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch creator info on mount (Point 1)
  useEffect(() => {
    async function fetchCreatorInfo() {
      try {
        setLoading(true)
        const response = await fetch('/api/tiktok/creator-info')
        const data = await response.json()

        if (data.success && data.creatorInfo) {
          setCreatorInfo(data.creatorInfo)

          // Point 1: Check if posting limits are reached
          if (data.creatorInfo.postingLimitReached) {
            setError('You have reached your daily posting limit. Please try again later.')
          }
        } else {
          // Use defaults if we can't fetch creator info
          console.warn('[TikTok] Could not fetch creator info:', data.error)
          setCreatorInfo({
            displayName: 'TikTok User',
            privacyLevelOptions: ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'],
            commentDisabled: false,
            duetDisabled: false,
            stitchDisabled: false,
            maxVideoPostPerDay: 10,
          })
        }
      } catch (err) {
        console.error('[TikTok] Creator info fetch error:', err)
        setCreatorInfo({
          displayName: 'TikTok User',
          privacyLevelOptions: ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'],
          commentDisabled: false,
          duetDisabled: false,
          stitchDisabled: false,
          maxVideoPostPerDay: 10,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCreatorInfo()
  }, [])

  // Handle privacy change - branded content cannot be private
  const handlePrivacyChange = (level: TikTokPrivacyLevel) => {
    onChange({ ...settings, privacyLevel: level })
  }

  // Handle brand content toggle
  const handleBrandContentToggle = (enabled: boolean) => {
    const newSettings = {
      ...settings,
      brandContentToggle: enabled,
      brandContentType: enabled ? null : null,
    }

    // If enabling branded content and privacy is private, switch to public
    if (enabled && settings.privacyLevel === 'SELF_ONLY') {
      newSettings.privacyLevel = 'PUBLIC_TO_EVERYONE'
    }

    onChange(newSettings)
  }

  // Handle brand content type selection
  const handleBrandContentType = (type: TikTokBrandContentType) => {
    onChange({ ...settings, brandContentType: type })
  }

  // Get dynamic compliance text based on branded content selection (Point 4)
  const getComplianceText = () => {
    if (settings.brandContentToggle && settings.brandContentType === 'BRANDED_CONTENT') {
      return {
        text: 'Branded Content Policy and Music Usage Confirmation',
        links: [
          { text: 'Branded Content Policy', url: 'https://www.tiktok.com/legal/page/row/bc-policy/en' },
          { text: 'Music Usage Confirmation', url: 'https://www.tiktok.com/legal/page/row/music-usage-confirmation/en' },
        ]
      }
    }
    // Default: Music Usage Confirmation only (for no disclosure or Your Brand)
    return {
      text: 'Music Usage Confirmation',
      links: [
        { text: 'Music Usage Confirmation', url: 'https://www.tiktok.com/legal/page/row/music-usage-confirmation/en' },
      ]
    }
  }

  // Check if publish should be disabled
  const isPublishDisabled =
    !settings.privacyLevel ||
    (settings.brandContentToggle && !settings.brandContentType) ||
    !settings.agreedToTerms

  const complianceInfo = getComplianceText()

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-48" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-center gap-2 text-red-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium">{error}</p>
        </div>
        <p className="text-xs text-red-500 mt-2">Please try again later or contact support.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ============================================ */}
      {/* POINT 1: Creator Info Retrieval & Validation */}
      {/* ============================================ */}
      <div className="p-4 bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl text-white">
        <div className="flex items-center gap-3">
          {creatorInfo?.avatarUrl ? (
            <img
              src={creatorInfo.avatarUrl}
              alt={creatorInfo.displayName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-cyan-400 flex items-center justify-center text-white font-bold">
              {creatorInfo?.displayName?.[0] || 'T'}
            </div>
          )}
          <div className="flex-1">
            <p className="font-semibold">Posting to @{creatorInfo?.displayName}</p>
            <p className="text-xs text-gray-400">
              {creatorInfo?.followerCount
                ? `${creatorInfo.followerCount.toLocaleString()} followers`
                : 'TikTok Account'}
            </p>
          </div>
          <div className="text-2xl">🎵</div>
        </div>
      </div>

      {/* ============================================ */}
      {/* POINT 2a: Title (Caption Preview) */}
      {/* ============================================ */}
      {caption && (
        <div className="p-4 bg-white border border-gray-200 rounded-xl">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Caption
          </label>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
              {caption.length > 300 ? `${caption.substring(0, 300)}...` : caption}
            </p>
            {caption.length > 150 && (
              <p className="text-xs text-gray-500 mt-2">
                {caption.length} / 2,200 characters
              </p>
            )}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* POINT 2b: Privacy Level Selection */}
      {/* Required field, no default value */}
      {/* ============================================ */}
      <div className="p-4 bg-white border border-gray-200 rounded-xl">
        <label className="block text-sm font-semibold text-gray-900 mb-1">
          Who can view this {isVideo ? 'video' : 'post'}? <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Select who can see your content on TikTok
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(creatorInfo?.privacyLevelOptions || ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY']).map((level) => {
            const isDisabled =
              disabled ||
              (settings.brandContentToggle && level === 'SELF_ONLY')
            const isSelected = settings.privacyLevel === level
            const privacyInfo = PRIVACY_LABELS[level]

            return (
              <button
                key={level}
                type="button"
                onClick={() => !isDisabled && handlePrivacyChange(level)}
                disabled={isDisabled}
                className={`p-3 rounded-lg text-left transition-all ${
                  isSelected
                    ? 'bg-gray-900 text-white ring-2 ring-gray-900'
                    : isDisabled
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="font-medium text-sm">{privacyInfo.label}</span>
                <span className={`block text-xs mt-0.5 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                  {privacyInfo.description}
                </span>
                {isDisabled && settings.brandContentToggle && level === 'SELF_ONLY' && (
                  <span className="block text-xs mt-1 text-orange-500">
                    Not available for branded content
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {!settings.privacyLevel && (
          <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Please select a privacy level
          </p>
        )}
      </div>

      {/* ============================================ */}
      {/* POINT 2c: Interaction Abilities */}
      {/* Default unchecked, with Music Usage declaration */}
      {/* ============================================ */}
      <div className="p-4 bg-white border border-gray-200 rounded-xl">
        <label className="block text-sm font-semibold text-gray-900 mb-1">
          Allow others to:
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Control how viewers can interact with your content
        </p>
        <div className="space-y-2">
          {/* Comments - All content types */}
          <label className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${
            creatorInfo?.commentDisabled ? 'bg-gray-100 opacity-50 cursor-not-allowed' : 'bg-gray-50 hover:bg-gray-100'
          }`}>
            <div className="flex-1">
              <span className="font-medium text-gray-900 text-sm">Comment</span>
              <p className="text-xs text-gray-500">Let viewers comment on your {isVideo ? 'video' : 'post'}</p>
              {creatorInfo?.commentDisabled && (
                <p className="text-xs text-orange-500 mt-1">Disabled in your TikTok settings</p>
              )}
            </div>
            <input
              type="checkbox"
              checked={settings.allowComments}
              onChange={(e) => onChange({ ...settings, allowComments: e.target.checked })}
              disabled={disabled || creatorInfo?.commentDisabled}
              className="w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
          </label>

          {/* Duet - Video only */}
          {isVideo && (
            <label className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${
              creatorInfo?.duetDisabled ? 'bg-gray-100 opacity-50 cursor-not-allowed' : 'bg-gray-50 hover:bg-gray-100'
            }`}>
              <div className="flex-1">
                <span className="font-medium text-gray-900 text-sm">Duet</span>
                <p className="text-xs text-gray-500">Let others create side-by-side Duets with your video</p>
                {creatorInfo?.duetDisabled && (
                  <p className="text-xs text-orange-500 mt-1">Disabled in your TikTok settings</p>
                )}
              </div>
              <input
                type="checkbox"
                checked={settings.allowDuet}
                onChange={(e) => onChange({ ...settings, allowDuet: e.target.checked })}
                disabled={disabled || creatorInfo?.duetDisabled}
                className="w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
            </label>
          )}

          {/* Stitch - Video only */}
          {isVideo && (
            <label className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${
              creatorInfo?.stitchDisabled ? 'bg-gray-100 opacity-50 cursor-not-allowed' : 'bg-gray-50 hover:bg-gray-100'
            }`}>
              <div className="flex-1">
                <span className="font-medium text-gray-900 text-sm">Stitch</span>
                <p className="text-xs text-gray-500">Let others use clips from your video in their content</p>
                {creatorInfo?.stitchDisabled && (
                  <p className="text-xs text-orange-500 mt-1">Disabled in your TikTok settings</p>
                )}
              </div>
              <input
                type="checkbox"
                checked={settings.allowStitch}
                onChange={(e) => onChange({ ...settings, allowStitch: e.target.checked })}
                disabled={disabled || creatorInfo?.stitchDisabled}
                className="w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
            </label>
          )}
        </div>

        {/* Music Usage Declaration - Required per Point 2c */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            By posting, you agree to TikTok&apos;s{' '}
            <a
              href="https://www.tiktok.com/legal/page/row/music-usage-confirmation/en"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-900 underline hover:no-underline"
            >
              Music Usage Confirmation
            </a>
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* POINT 3: Commercial Content Disclosure */}
      {/* Toggle default OFF */}
      {/* ============================================ */}
      <div className="p-4 bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-semibold text-gray-900">
            Content disclosure
          </label>
          <button
            type="button"
            onClick={() => handleBrandContentToggle(!settings.brandContentToggle)}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.brandContentToggle ? 'bg-gray-900' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.brandContentToggle ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Turn on if this content promotes a brand, product, or service
        </p>

        {settings.brandContentToggle && (
          <div className="mt-4 space-y-3 animate-fadeIn">
            <p className="text-sm text-gray-700 font-medium">Select content type:</p>

            {/* Your Brand */}
            <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border-2 ${
              settings.brandContentType === 'YOUR_BRAND'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-gray-50 hover:bg-gray-100 border-transparent'
            }`}>
              <input
                type="radio"
                name="brandContentType"
                checked={settings.brandContentType === 'YOUR_BRAND'}
                onChange={() => handleBrandContentType('YOUR_BRAND')}
                disabled={disabled}
                className="mt-0.5"
              />
              <div className="flex-1">
                <span className="font-medium text-sm">Your Brand</span>
                <p className={`text-xs mt-1 ${
                  settings.brandContentType === 'YOUR_BRAND' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  You are promoting your own brand, business, or products
                </p>
                <p className={`text-xs mt-1 ${
                  settings.brandContentType === 'YOUR_BRAND' ? 'text-cyan-300' : 'text-cyan-600'
                }`}>
                  → Your {isVideo ? 'video' : 'post'} will be labeled as &quot;Promotional content&quot;
                </p>
              </div>
            </label>

            {/* Branded Content / Paid Partnership */}
            <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border-2 ${
              settings.brandContentType === 'BRANDED_CONTENT'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-gray-50 hover:bg-gray-100 border-transparent'
            }`}>
              <input
                type="radio"
                name="brandContentType"
                checked={settings.brandContentType === 'BRANDED_CONTENT'}
                onChange={() => handleBrandContentType('BRANDED_CONTENT')}
                disabled={disabled}
                className="mt-0.5"
              />
              <div className="flex-1">
                <span className="font-medium text-sm">Branded Content</span>
                <p className={`text-xs mt-1 ${
                  settings.brandContentType === 'BRANDED_CONTENT' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  This is a paid partnership or sponsored content
                </p>
                <p className={`text-xs mt-1 ${
                  settings.brandContentType === 'BRANDED_CONTENT' ? 'text-cyan-300' : 'text-cyan-600'
                }`}>
                  → Your {isVideo ? 'video' : 'post'} will be labeled as &quot;Paid partnership&quot;
                </p>
              </div>
            </label>

            {!settings.brandContentType && (
              <p className="text-xs text-orange-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Please select a content type to continue
              </p>
            )}
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* POINT 4: Compliance Declarations */}
      {/* Dynamic text based on branded content selection */}
      {/* ============================================ */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.agreedToTerms}
            onChange={(e) => onChange({ ...settings, agreedToTerms: e.target.checked })}
            disabled={disabled}
            className="mt-0.5 w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
          />
          <div className="flex-1">
            <span className="text-sm text-gray-900 font-medium">
              I agree to TikTok&apos;s terms <span className="text-red-500">*</span>
            </span>
            <p className="text-xs text-gray-600 mt-1">
              By posting, I agree to TikTok&apos;s{' '}
              {complianceInfo.links.map((link, index) => (
                <span key={link.url}>
                  {index > 0 && ' and '}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-900 underline hover:no-underline"
                  >
                    {link.text}
                  </a>
                </span>
              ))}
              .
            </p>
          </div>
        </label>
        {!settings.agreedToTerms && (
          <p className="text-xs text-orange-600 mt-2 ml-8 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            You must agree to continue
          </p>
        )}
      </div>

      {/* ============================================ */}
      {/* POINT 5: User Control & Awareness */}
      {/* Processing notice */}
      {/* ============================================ */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700 flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Your {isVideo ? 'video' : 'content'} will be sent to TikTok for processing.
            This may take a few minutes. You&apos;ll be notified when it&apos;s published.
          </span>
        </p>
      </div>

      {/* Validation Summary */}
      {isPublishDisabled && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-xs text-orange-700 font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Complete the following to publish:
          </p>
          <ul className="text-xs text-orange-600 mt-1 space-y-1 ml-5">
            {!settings.privacyLevel && <li>• Select who can view this {isVideo ? 'video' : 'post'}</li>}
            {settings.brandContentToggle && !settings.brandContentType && (
              <li>• Select branded content type</li>
            )}
            {!settings.agreedToTerms && <li>• Agree to TikTok&apos;s terms</li>}
          </ul>
        </div>
      )}
    </div>
  )
}

export default TikTokPostSettings
