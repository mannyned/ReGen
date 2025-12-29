/**
 * Snapchat API Types
 *
 * Types for Snapchat Login Kit and Creative Kit.
 *
 * Note: Snapchat does NOT have a public server-side posting API.
 * Content sharing is done via Creative Kit (client-side, user-initiated).
 */

// ============================================
// LOGIN KIT TYPES
// ============================================

export interface SnapchatUserInfo {
  externalId: string;
  displayName: string;
  bitmojiAvatar?: string;
}

export interface GetSnapchatStatusResponse {
  connected: boolean;
  displayName?: string;
  avatarUrl?: string;
  snapchatId?: string;
  expiresAt?: string;
}

// ============================================
// CREATIVE KIT SHARE TYPES
// ============================================

/**
 * Snapchat sharing is user-initiated via Creative Kit.
 * The app generates a share payload that opens Snapchat's composer.
 *
 * Supported content types:
 * - Photo/Video with stickers
 * - URL attachment (story links)
 * - Lens/Filter
 */

export type SnapchatShareType = 'photo' | 'video' | 'url' | 'lens';

export interface SnapchatShareOptions {
  type: SnapchatShareType;
  mediaUrl?: string;      // URL to photo/video (must be accessible)
  caption?: string;       // Caption text
  attachmentUrl?: string; // Swipe-up link
  stickerUrl?: string;    // Sticker image URL
  lensUUID?: string;      // For lens sharing
}

export interface SnapchatSharePayload {
  shareUrl: string;       // URL to open Snapchat share
  webShareUrl?: string;   // Web fallback URL
  deepLinkUrl?: string;   // Deep link for mobile
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface GenerateSnapchatShareRequest {
  type: SnapchatShareType;
  mediaUrl?: string;
  caption?: string;
  attachmentUrl?: string;
}

export interface GenerateSnapchatShareResponse {
  success: boolean;
  shareUrl?: string;
  webShareUrl?: string;
  error?: string;
  code?: string;
}

// ============================================
// CREATIVE KIT WEB SHARE TYPES
// ============================================

/**
 * For web-based sharing, Snapchat provides a web share flow.
 * The user is redirected to Snapchat to complete the share.
 *
 * Flow:
 * 1. App generates share URL with content parameters
 * 2. User clicks share button
 * 3. User is redirected to Snapchat (app or web)
 * 4. User completes share in Snapchat
 * 5. User returns to app (optional callback)
 *
 * Note: Completion cannot be confirmed server-side.
 * Track as "initiated" rather than "completed".
 */

export interface SnapchatWebShareParams {
  attachmentUrl: string;    // URL to attach to the story
  clientId: string;         // Snapchat app client ID
  redirectUrl?: string;     // Return URL after share
  utm_source?: string;      // Tracking parameter
  utm_content?: string;     // Tracking parameter
}

export interface SnapchatShareEvent {
  status: 'initiated' | 'completed' | 'cancelled';
  timestamp: Date;
  contentId?: string;       // Internal content reference
}
