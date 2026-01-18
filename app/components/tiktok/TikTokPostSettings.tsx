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
  settings: TikTokPostSettingsData
  onChange: (settings: TikTokPostSettingsData) => void
  disabled?: boolean
}

const PRIVACY_LABELS: Record<TikTokPrivacyLevel, string> = {
  PUBLIC_TO_EVERYONE: 'Public',
  MUTUAL_FOLLOW_FRIENDS: 'Friends',
  FOLLOWER_OF_CREATOR: 'Followers Only',
  SELF_ONLY: 'Private (Only Me)',
}

/**
 * TikTok Post Settings Component
 * Implements TikTok Content Sharing Guidelines UX requirements
 */
export function TikTokPostSettings({
  isVideo,
  settings,
  onChange,
  disabled = false,
}: TikTokPostSettingsProps) {
  const [creatorInfo, setCreatorInfo] = useState<TikTokCreatorInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch creator info on mount
  useEffect(() => {
    async function fetchCreatorInfo() {
      try {
        setLoading(true)
        const response = await fetch('/api/tiktok/creator-info')
        const data = await response.json()

        if (data.success && data.creatorInfo) {
          setCreatorInfo(data.creatorInfo)
        } else {
          setError(data.error || 'Failed to load TikTok account info')
        }
      } catch (err) {
        setError('Failed to connect to TikTok')
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
      brandContentType: enabled ? null : null, // Reset type when toggling
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

  // Check if publish should be disabled
  const isPublishDisabled =
    !settings.privacyLevel ||
    (settings.brandContentToggle && !settings.brandContentType) ||
    !settings.agreedToTerms

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
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Creator Info Display */}
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
          <div>
            <p className="font-semibold">Posting to @{creatorInfo?.displayName}</p>
            <p className="text-xs text-gray-400">
              {creatorInfo?.followerCount
                ? `${creatorInfo.followerCount.toLocaleString()} followers`
                : 'TikTok Account'}
            </p>
          </div>
          <div className="ml-auto">
            <span className="text-2xl">🎵</span>
          </div>
        </div>
      </div>

      {/* Privacy Level Selection - Required, no default */}
      <div className="p-4 bg-white border border-gray-200 rounded-xl">
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Who can view this video? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(creatorInfo?.privacyLevelOptions || ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY']).map((level) => {
            const isDisabled =
              disabled ||
              (settings.brandContentToggle && level === 'SELF_ONLY')
            const isSelected = settings.privacyLevel === level

            return (
              <button
                key={level}
                type="button"
                onClick={() => !isDisabled && handlePrivacyChange(level)}
                disabled={isDisabled}
                className={`p-3 rounded-lg text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-gray-900 text-white'
                    : isDisabled
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {PRIVACY_LABELS[level]}
                {isDisabled && settings.brandContentToggle && level === 'SELF_ONLY' && (
                  <span className="block text-xs mt-1 text-gray-400">
                    Not available for branded content
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {!settings.privacyLevel && (
          <p className="text-xs text-orange-600 mt-2">Please select a privacy level</p>
        )}
      </div>

      {/* Interaction Settings - Default unchecked */}
      <div className="p-4 bg-white border border-gray-200 rounded-xl">
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Allow others to:
        </label>
        <div className="space-y-3">
          {/* Comments */}
          <label className={`flex items-center justify-between p-3 rounded-lg ${
            creatorInfo?.commentDisabled ? 'bg-gray-100 opacity-50' : 'bg-gray-50 hover:bg-gray-100'
          }`}>
            <div>
              <span className="font-medium text-gray-900">Comment</span>
              <p className="text-xs text-gray-500">Let viewers comment on your video</p>
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
            <label className={`flex items-center justify-between p-3 rounded-lg ${
              creatorInfo?.duetDisabled ? 'bg-gray-100 opacity-50' : 'bg-gray-50 hover:bg-gray-100'
            }`}>
              <div>
                <span className="font-medium text-gray-900">Duet</span>
                <p className="text-xs text-gray-500">Let others create Duets with your video</p>
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
            <label className={`flex items-center justify-between p-3 rounded-lg ${
              creatorInfo?.stitchDisabled ? 'bg-gray-100 opacity-50' : 'bg-gray-50 hover:bg-gray-100'
            }`}>
              <div>
                <span className="font-medium text-gray-900">Stitch</span>
                <p className="text-xs text-gray-500">Let others use clips from your video</p>
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
      </div>

      {/* Commercial Content Disclosure */}
      <div className="p-4 bg-white border border-gray-200 rounded-xl">
        <label className="flex items-center justify-between mb-3">
          <div>
            <span className="font-semibold text-gray-900">Content disclosure</span>
            <p className="text-xs text-gray-500">Does this content promote a brand, product, or service?</p>
          </div>
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
        </label>

        {settings.brandContentToggle && (
          <div className="mt-4 space-y-3 animate-fadeIn">
            <p className="text-sm text-gray-600 mb-3">Select the type of branded content:</p>

            {/* Your Brand */}
            <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
              settings.brandContentType === 'YOUR_BRAND'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}>
              <input
                type="radio"
                name="brandContentType"
                checked={settings.brandContentType === 'YOUR_BRAND'}
                onChange={() => handleBrandContentType('YOUR_BRAND')}
                disabled={disabled}
                className="mt-1"
              />
              <div>
                <span className="font-medium">Your Brand</span>
                <p className={`text-xs mt-1 ${
                  settings.brandContentType === 'YOUR_BRAND' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Your video will be labeled as &quot;Promotional content&quot;
                </p>
              </div>
            </label>

            {/* Branded Content / Paid Partnership */}
            <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
              settings.brandContentType === 'BRANDED_CONTENT'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}>
              <input
                type="radio"
                name="brandContentType"
                checked={settings.brandContentType === 'BRANDED_CONTENT'}
                onChange={() => handleBrandContentType('BRANDED_CONTENT')}
                disabled={disabled}
                className="mt-1"
              />
              <div>
                <span className="font-medium">Branded Content</span>
                <p className={`text-xs mt-1 ${
                  settings.brandContentType === 'BRANDED_CONTENT' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Your video will be labeled as &quot;Paid partnership&quot;
                </p>
              </div>
            </label>

            {!settings.brandContentType && (
              <p className="text-xs text-orange-600">Please select a branded content type</p>
            )}
          </div>
        )}
      </div>

      {/* Legal Disclosures */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.agreedToTerms}
            onChange={(e) => onChange({ ...settings, agreedToTerms: e.target.checked })}
            disabled={disabled}
            className="mt-1 w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
          />
          <div className="text-sm text-gray-600">
            By posting, you agree to TikTok&apos;s{' '}
            <a
              href="https://www.tiktok.com/legal/page/row/music-usage-confirmation/en"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-900 underline hover:no-underline"
            >
              Music Usage Confirmation
            </a>
            {settings.brandContentToggle && (
              <>
                {' '}and{' '}
                <a
                  href="https://www.tiktok.com/legal/page/row/bc-policy/en"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-900 underline hover:no-underline"
                >
                  Branded Content Policy
                </a>
              </>
            )}
            .
          </div>
        </label>
      </div>

      {/* Processing Notice */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Video processing may take a few minutes after posting.
        </p>
      </div>

      {/* Validation Summary */}
      {isPublishDisabled && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-xs text-orange-700 font-medium">Complete the following to publish:</p>
          <ul className="text-xs text-orange-600 mt-1 space-y-1">
            {!settings.privacyLevel && <li>• Select who can view this video</li>}
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
