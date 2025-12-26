'use client'

import { memo, useState, useCallback } from 'react'
import type { SocialPlatform } from '@/lib/types/social'

// ============================================
// PLATFORM LOGO COMPONENT
// Brand-compliant social media logos
// ============================================
//
// TRADEMARK NOTICE:
// All social media logos and brand assets are trademarks of their respective owners:
// - Instagram, Facebook: Meta Platforms, Inc.
// - TikTok: ByteDance Ltd.
// - X (Twitter): X Corp.
// - YouTube: Google LLC
// - LinkedIn: Microsoft Corporation
// - Snapchat: Snap Inc.
// - Pinterest: Pinterest, Inc.
// - Discord: Discord, Inc.
//
// These logos are used in accordance with each platform's brand guidelines.
// Do not modify, recolor, or distort these logos beyond approved variants.
// ============================================

export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type LogoVariant = 'color' | 'monochrome' | 'white' | 'dark'

interface PlatformLogoProps {
  platform: SocialPlatform
  size?: LogoSize
  variant?: LogoVariant
  className?: string
  showBackground?: boolean
  onClick?: () => void
  ariaLabel?: string
}

// Size configurations (in pixels)
const SIZES: Record<LogoSize, { width: number; height: number; minTouchTarget: number }> = {
  xs: { width: 16, height: 16, minTouchTarget: 24 },
  sm: { width: 20, height: 20, minTouchTarget: 32 },
  md: { width: 24, height: 24, minTouchTarget: 44 },
  lg: { width: 32, height: 32, minTouchTarget: 44 },
  xl: { width: 48, height: 48, minTouchTarget: 48 },
}

// Official brand colors
const BRAND_COLORS: Record<SocialPlatform, { primary: string; secondary?: string; background: string }> = {
  instagram: {
    primary: '#E4405F',
    secondary: '#833AB4',
    background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
  },
  facebook: {
    primary: '#1877F2',
    background: '#1877F2',
  },
  tiktok: {
    primary: '#000000',
    secondary: '#EE1D52',
    background: '#000000',
  },
  twitter: {
    primary: '#000000', // X uses black
    background: '#000000',
  },
  youtube: {
    primary: '#FF0000',
    background: '#FF0000',
  },
  linkedin: {
    primary: '#0A66C2',
    background: '#0A66C2',
  },
  snapchat: {
    primary: '#FFFC00',
    background: '#FFFC00',
  },
  pinterest: {
    primary: '#E60023',
    background: '#E60023',
  },
  discord: {
    primary: '#5865F2',
    background: '#5865F2',
  },
}

// Platform display names for accessibility
const PLATFORM_NAMES: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  twitter: 'X (formerly Twitter)',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  snapchat: 'Snapchat',
  pinterest: 'Pinterest',
  discord: 'Discord',
}

// ============================================
// SVG LOGO COMPONENTS
// Official logos as inline SVGs for performance
// ============================================

interface LogoSvgProps {
  width: number
  height: number
  variant: LogoVariant
  className?: string
}

// Instagram Logo - Based on official brand guidelines
const InstagramLogo = memo(({ width, height, variant, className }: LogoSvgProps) => {
  const getColor = () => {
    switch (variant) {
      case 'white': return '#FFFFFF'
      case 'dark': return '#000000'
      case 'monochrome': return 'currentColor'
      default: return '#E4405F'
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
        fill={getColor()}
      />
    </svg>
  )
})
InstagramLogo.displayName = 'InstagramLogo'

// Facebook Logo - Based on official brand guidelines
const FacebookLogo = memo(({ width, height, variant, className }: LogoSvgProps) => {
  const getColor = () => {
    switch (variant) {
      case 'white': return '#FFFFFF'
      case 'dark': return '#000000'
      case 'monochrome': return 'currentColor'
      default: return '#1877F2'
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        fill={getColor()}
      />
    </svg>
  )
})
FacebookLogo.displayName = 'FacebookLogo'

// TikTok Logo - Based on official brand guidelines
const TikTokLogo = memo(({ width, height, variant, className }: LogoSvgProps) => {
  const isColor = variant === 'color'
  const getMainColor = () => {
    switch (variant) {
      case 'white': return '#FFFFFF'
      case 'dark': return '#000000'
      case 'monochrome': return 'currentColor'
      default: return '#000000'
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {isColor ? (
        <>
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.88 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.3 0 .59.04.86.12V9.4a6.33 6.33 0 00-.86-.06A6.34 6.34 0 003.15 15.7a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.25a8.16 8.16 0 004.77 1.52V7.33a4.85 4.85 0 01-1.01-.64z" fill="#EE1D52"/>
          <path d="M18.58 6.05a4.83 4.83 0 01-3.77-4.25V1.36h-3.45V15.03a2.89 2.89 0 01-2.88 2.88 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.3 0 .59.04.86.12V8.76a6.33 6.33 0 00-.86-.06 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.61a8.16 8.16 0 004.77 1.52V6.69a4.85 4.85 0 01-1.01-.64z" fill="#000000"/>
          <path d="M17.57 5.41a4.83 4.83 0 01-3.77-4.25V.72h-3.45v13.67a2.89 2.89 0 01-2.88 2.88 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.3 0 .59.04.86.12V8.12a6.33 6.33 0 00-.86-.06 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V7.97a8.16 8.16 0 004.77 1.52V6.05a4.85 4.85 0 01-1.01-.64z" fill="#69C9D0"/>
        </>
      ) : (
        <path
          d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.88 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.3 0 .59.04.86.12V9.4a6.33 6.33 0 00-.86-.06A6.34 6.34 0 003.15 15.7a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.25a8.16 8.16 0 004.77 1.52V7.33a4.85 4.85 0 01-1.01-.64z"
          fill={getMainColor()}
        />
      )}
    </svg>
  )
})
TikTokLogo.displayName = 'TikTokLogo'

// X (Twitter) Logo - Based on official brand guidelines
const XLogo = memo(({ width, height, variant, className }: LogoSvgProps) => {
  const getColor = () => {
    switch (variant) {
      case 'white': return '#FFFFFF'
      case 'dark': return '#000000'
      case 'monochrome': return 'currentColor'
      default: return '#000000'
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
        fill={getColor()}
      />
    </svg>
  )
})
XLogo.displayName = 'XLogo'

// YouTube Logo - Based on official brand guidelines
const YouTubeLogo = memo(({ width, height, variant, className }: LogoSvgProps) => {
  const getColor = () => {
    switch (variant) {
      case 'white': return '#FFFFFF'
      case 'dark': return '#000000'
      case 'monochrome': return 'currentColor'
      default: return '#FF0000'
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
        fill={getColor()}
      />
    </svg>
  )
})
YouTubeLogo.displayName = 'YouTubeLogo'

// LinkedIn Logo - Based on official brand guidelines
const LinkedInLogo = memo(({ width, height, variant, className }: LogoSvgProps) => {
  const getColor = () => {
    switch (variant) {
      case 'white': return '#FFFFFF'
      case 'dark': return '#000000'
      case 'monochrome': return 'currentColor'
      default: return '#0A66C2'
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
        fill={getColor()}
      />
    </svg>
  )
})
LinkedInLogo.displayName = 'LinkedInLogo'

// Snapchat Logo - Based on official brand guidelines
const SnapchatLogo = memo(({ width, height, variant, className }: LogoSvgProps) => {
  const getColor = () => {
    switch (variant) {
      case 'white': return '#FFFFFF'
      case 'dark': return '#000000'
      case 'monochrome': return 'currentColor'
      default: return '#FFFC00'
    }
  }

  const getStrokeColor = () => {
    switch (variant) {
      case 'color': return '#000000'
      default: return 'none'
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03a4.22 4.22 0 01-.74-.074c-.18-.029-.39-.06-.615-.06-.282 0-.584.029-.899.118-.419.12-.779.391-1.229.719-.66.494-1.486 1.109-2.768 1.109-.045 0-.089 0-.134-.015h-.089c-1.313 0-2.138-.615-2.799-1.109-.449-.33-.809-.599-1.229-.719-.314-.089-.614-.118-.898-.118-.255 0-.48.03-.674.06-.18.03-.359.074-.54.074h-.119c-.301 0-.494-.134-.569-.404a3.13 3.13 0 01-.135-.554c-.046-.194-.106-.479-.164-.569-1.873-.283-2.92-.702-3.16-1.271a.484.484 0 01-.044-.225c-.015-.24.164-.465.419-.509 3.266-.54 4.732-3.879 4.792-4.014l.014-.015c.182-.345.211-.644.12-.869-.195-.449-.884-.674-1.333-.809a8.56 8.56 0 01-.345-.12c-.823-.329-1.227-.719-1.212-1.168 0-.359.284-.689.733-.837.165-.061.344-.09.509-.09.12 0 .3.015.465.104.374.181.733.285 1.033.3.197 0 .326-.044.4-.089l-.029-.51-.002-.06c-.104-1.628-.23-3.654.299-4.847C7.859 1.068 11.216.793 12.206.793z"
        fill={getColor()}
        stroke={getStrokeColor()}
        strokeWidth={variant === 'color' ? 0.5 : 0}
      />
    </svg>
  )
})
SnapchatLogo.displayName = 'SnapchatLogo'

// Pinterest Logo - Based on official brand guidelines
const PinterestLogo = memo(({ width, height, variant, className }: LogoSvgProps) => {
  const getColor = () => {
    switch (variant) {
      case 'white': return '#FFFFFF'
      case 'dark': return '#000000'
      case 'monochrome': return 'currentColor'
      default: return '#E60023'
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"
        fill={getColor()}
      />
    </svg>
  )
})
PinterestLogo.displayName = 'PinterestLogo'

// Discord Logo - Based on official brand guidelines
const DiscordLogo = memo(({ width, height, variant, className }: LogoSvgProps) => {
  const getColor = () => {
    switch (variant) {
      case 'white': return '#FFFFFF'
      case 'dark': return '#000000'
      case 'monochrome': return 'currentColor'
      default: return '#5865F2'
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
        fill={getColor()}
      />
    </svg>
  )
})
DiscordLogo.displayName = 'DiscordLogo'

// Fallback Icon
const FallbackIcon = memo(({ width, height, className }: Omit<LogoSvgProps, 'variant'>) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
  </svg>
))
FallbackIcon.displayName = 'FallbackIcon'

// Logo component mapping
const LOGO_COMPONENTS: Record<SocialPlatform, React.FC<LogoSvgProps>> = {
  instagram: InstagramLogo,
  facebook: FacebookLogo,
  tiktok: TikTokLogo,
  twitter: XLogo,
  youtube: YouTubeLogo,
  linkedin: LinkedInLogo,
  snapchat: SnapchatLogo,
  pinterest: PinterestLogo,
  discord: DiscordLogo,
}

// ============================================
// MAIN PLATFORM LOGO COMPONENT
// ============================================

export const PlatformLogo = memo(function PlatformLogo({
  platform,
  size = 'md',
  variant = 'color',
  className = '',
  showBackground = false,
  onClick,
  ariaLabel,
}: PlatformLogoProps) {
  const [hasError, setHasError] = useState(false)

  const handleError = useCallback(() => {
    setHasError(true)
  }, [])

  const sizeConfig = SIZES[size]
  const brandColor = BRAND_COLORS[platform]
  const platformName = PLATFORM_NAMES[platform]
  const LogoComponent = LOGO_COMPONENTS[platform]

  const label = ariaLabel || `${platformName} logo`

  // Ensure minimum touch target for accessibility
  const containerStyle: React.CSSProperties = {
    minWidth: sizeConfig.minTouchTarget,
    minHeight: sizeConfig.minTouchTarget,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const backgroundStyle: React.CSSProperties = showBackground ? {
    background: brandColor.background,
    borderRadius: platform === 'snapchat' ? '50%' : '8px',
    padding: size === 'xs' ? '4px' : size === 'sm' ? '6px' : '8px',
  } : {}

  const isInteractive = !!onClick

  const content = (
    <span
      className={`inline-flex items-center justify-center transition-opacity ${
        isInteractive ? 'cursor-pointer hover:opacity-80 active:opacity-60' : ''
      } ${className}`}
      style={{ ...containerStyle, ...backgroundStyle }}
      role={isInteractive ? 'button' : 'img'}
      aria-label={label}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isInteractive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      } : undefined}
    >
      {hasError ? (
        <FallbackIcon
          width={sizeConfig.width}
          height={sizeConfig.height}
          className="text-gray-400"
        />
      ) : (
        <LogoComponent
          width={sizeConfig.width}
          height={sizeConfig.height}
          variant={variant}
          className="flex-shrink-0"
        />
      )}
    </span>
  )

  return content
})

// ============================================
// UTILITY EXPORTS
// ============================================

export { BRAND_COLORS, PLATFORM_NAMES, SIZES }

// Helper to get brand-safe background for a platform
export function getPlatformBackground(platform: SocialPlatform): string {
  return BRAND_COLORS[platform].background
}

// Helper to get platform display name
export function getPlatformDisplayName(platform: SocialPlatform): string {
  return PLATFORM_NAMES[platform]
}

// All supported platforms
export const SUPPORTED_PLATFORMS: SocialPlatform[] = [
  'instagram',
  'facebook',
  'tiktok',
  'twitter',
  'youtube',
  'linkedin',
  'snapchat',
  'pinterest',
  'discord',
]

export default PlatformLogo
