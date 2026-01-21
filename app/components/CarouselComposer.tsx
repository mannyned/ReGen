'use client'

import { useState, useCallback } from 'react'
import { Badge, PlatformLogo } from './ui'
import type { SocialPlatform } from '@/lib/types/social'

// ============================================
// TYPES
// ============================================

interface UploadedFileData {
  file: File
  previewUrl: string
  fileId: string
}

type Platform = 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'x' | 'linkedin' | 'linkedin-org' | 'snapchat' | 'pinterest' | 'discord' | 'reddit'

interface CarouselConstraints {
  minItems: number
  maxItems: number
  allowVideo: boolean
  description: string
}

interface CarouselComposerProps {
  files: UploadedFileData[]
  selectedPlatforms: Platform[]
  platformConstraints: Record<Platform, CarouselConstraints>
  onReorder: (files: UploadedFileData[]) => void
  onRemove: (index: number) => void
  uploadType: 'video' | 'image' | 'media'
  contentType: 'post' | 'story'
}

// Map Platform type to SocialPlatform for logo component
const PLATFORM_ID_MAP: Record<Platform, SocialPlatform> = {
  'instagram': 'instagram',
  'tiktok': 'tiktok',
  'youtube': 'youtube',
  'facebook': 'facebook',
  'x': 'twitter',
  'linkedin': 'linkedin',
  'linkedin-org': 'linkedin-org',
  'snapchat': 'snapchat',
  'pinterest': 'pinterest',
  'discord': 'discord',
  'reddit': 'reddit',
}

// ============================================
// CAROUSEL COMPOSER COMPONENT
// ============================================

export function CarouselComposer({
  files,
  selectedPlatforms,
  platformConstraints,
  onReorder,
  onRemove,
  uploadType,
  contentType,
}: CarouselComposerProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Get platform display name
  const getPlatformName = (platform: Platform): string => {
    return platform === 'x' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1)
  }

  // Calculate which items will be used/truncated per platform
  const getPlatformItemStatus = useCallback((platform: Platform) => {
    const constraints = platformConstraints[platform]
    const hasVideo = files.some(f => f.file.type.startsWith('video/'))

    let usableItems = files.length
    let videoWarning = false

    // If platform doesn't allow video in carousels and we have videos
    if (hasVideo && !constraints.allowVideo && files.length > 1) {
      const imageCount = files.filter(f => !f.file.type.startsWith('video/')).length
      usableItems = imageCount
      videoWarning = true
    }

    const willUse = Math.min(usableItems, constraints.maxItems)
    const willTruncate = Math.max(0, usableItems - constraints.maxItems)

    return {
      willUse,
      willTruncate,
      maxItems: constraints.maxItems,
      videoWarning,
      belowMinimum: files.length > 1 && files.length < constraints.minItems,
    }
  }, [files, platformConstraints])

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())

    // Add a slight delay to allow the visual to update
    setTimeout(() => {
      const element = e.target as HTMLElement
      element.style.opacity = '0.5'
    }, 0)
  }

  // Handle drag end
  const handleDragEnd = (e: React.DragEvent) => {
    const element = e.target as HTMLElement
    element.style.opacity = '1'
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  // Handle drop
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDragOverIndex(null)
      return
    }

    // Reorder the files
    const newFiles = [...files]
    const [draggedItem] = newFiles.splice(draggedIndex, 1)
    newFiles.splice(dropIndex, 0, draggedItem)

    onReorder(newFiles)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Move item up/down (for keyboard/button navigation)
  const moveItem = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= files.length) return

    const newFiles = [...files]
    const [item] = newFiles.splice(fromIndex, 1)
    newFiles.splice(toIndex, 0, item)
    onReorder(newFiles)
  }

  if (files.length === 0) return null

  return (
    <div className="space-y-6">
      {/* Carousel Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text-primary text-lg">
            Carousel Items ({files.length})
          </h3>
          <p className="text-sm text-text-secondary">
            Drag to reorder. First item will be the cover.
          </p>
        </div>

        {files.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">Tip:</span>
            <Badge variant="secondary" className="text-xs">
              Hold & drag to reorder
            </Badge>
          </div>
        )}
      </div>

      {/* Draggable Items Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {files.map((fileData, index) => {
          const isVideo = fileData.file.type.startsWith('video/')
          const isDragging = draggedIndex === index
          const isDropTarget = dragOverIndex === index

          // Check which platforms will truncate this item
          const truncatedPlatforms = selectedPlatforms.filter(platform => {
            const constraints = platformConstraints[platform]
            const hasVideoRestriction = isVideo && !constraints.allowVideo && files.length > 1

            if (hasVideoRestriction) return true

            // Will this item be beyond the limit?
            let effectiveIndex = index
            if (!constraints.allowVideo) {
              // Count only images before this one
              effectiveIndex = files.slice(0, index + 1).filter(f => !f.file.type.startsWith('video/')).length - 1
            }

            return effectiveIndex >= constraints.maxItems
          })

          const isTruncated = truncatedPlatforms.length > 0

          return (
            <div
              key={fileData.fileId}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={`
                relative group cursor-grab active:cursor-grabbing
                rounded-xl overflow-hidden border-2 transition-all duration-200
                ${isDragging ? 'opacity-50 scale-95' : ''}
                ${isDropTarget ? 'border-primary border-dashed scale-105' : 'border-transparent'}
                ${isTruncated ? 'ring-2 ring-amber-400 ring-offset-2' : ''}
                hover:shadow-lg
              `}
            >
              {/* Preview */}
              <div className="aspect-square bg-black">
                {isVideo ? (
                  <video
                    src={fileData.previewUrl}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <img
                    src={fileData.previewUrl}
                    alt={`Item ${index + 1}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                )}
              </div>

              {/* Order Badge */}
              <div className={`
                absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center
                text-xs font-bold shadow-lg
                ${index === 0 ? 'bg-primary text-white' : 'bg-white text-gray-700'}
              `}>
                {index + 1}
              </div>

              {/* Media Type Badge */}
              {isVideo && (
                <div className="absolute top-2 right-10 px-2 py-0.5 bg-black/70 text-white text-xs rounded-full">
                  Video
                </div>
              )}

              {/* Truncation Warning Badge */}
              {isTruncated && (
                <div className="absolute bottom-2 left-2 right-10 px-2 py-1 bg-amber-500/90 text-white text-[10px] rounded-lg">
                  Not on: {truncatedPlatforms.slice(0, 2).map(getPlatformName).join(', ')}
                  {truncatedPlatforms.length > 2 && ` +${truncatedPlatforms.length - 2}`}
                </div>
              )}

              {/* Remove Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(index)
                }}
                className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                title="Remove"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Reorder Buttons (visible on hover for accessibility) */}
              <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {index > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      moveItem(index, 'up')
                    }}
                    className="w-6 h-6 bg-white/90 hover:bg-white text-gray-700 rounded-full flex items-center justify-center shadow"
                    title="Move up"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {index < files.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      moveItem(index, 'down')
                    }}
                    className="w-6 h-6 bg-white/90 hover:bg-white text-gray-700 rounded-full flex items-center justify-center shadow"
                    title="Move down"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Drag Handle Indicator */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Platform Preview Section */}
      {selectedPlatforms.length > 0 && files.length > 1 && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-text-primary mb-3">
            Platform Distribution Preview
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedPlatforms.map(platform => {
              const status = getPlatformItemStatus(platform)
              const hasIssue = status.willTruncate > 0 || status.videoWarning || status.belowMinimum

              return (
                <div
                  key={platform}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border transition-colors
                    ${hasIssue ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}
                  `}
                >
                  <PlatformLogo
                    platform={PLATFORM_ID_MAP[platform]}
                    size="md"
                    variant="color"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">
                      {getPlatformName(platform)}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      {status.willTruncate > 0 ? (
                        <span className="text-amber-700">
                          {status.willUse} of {files.length} items
                        </span>
                      ) : (
                        <span className="text-green-700">
                          All {files.length} items
                        </span>
                      )}

                      {status.videoWarning && (
                        <span className="text-amber-600">(videos skipped)</span>
                      )}
                    </div>
                  </div>

                  {/* Status Icon */}
                  {hasIssue ? (
                    <span className="text-amber-500 text-lg">⚠️</span>
                  ) : (
                    <span className="text-green-500 text-lg">✓</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-4 text-xs text-text-secondary">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-primary"></span>
              <span>Cover image</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-3 rounded bg-amber-400"></span>
              <span>Will be skipped on some platforms</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-green-500">✓</span>
              <span>All items included</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CarouselComposer
