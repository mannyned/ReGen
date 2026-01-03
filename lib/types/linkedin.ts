/**
 * LinkedIn API Types
 *
 * Types for LinkedIn posting and analytics.
 */

// ============================================
// ORGANIZATION TYPES
// ============================================

export interface LinkedInOrganization {
  id: string;
  name: string;
  vanityName?: string;
  logoUrl?: string;
}

// ============================================
// POST TYPES
// ============================================

export type LinkedInVisibility = 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN';

export interface LinkedInPostOptions {
  text: string;
  linkUrl?: string;
  imageUrl?: string;
  visibility?: LinkedInVisibility;
  organizationId?: string; // Optional: post to organization instead of personal profile
}

export interface LinkedInPostResult {
  success: boolean;
  postId?: string;  // LinkedIn post URN (urn:li:share:...)
  postUrl?: string;
  error?: string;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateLinkedInPostRequest {
  text: string;
  linkUrl?: string;
  imageUrl?: string;
  visibility?: LinkedInVisibility;
  organizationId?: string; // Optional: post to organization instead of personal profile
}

export interface CreateLinkedInPostResponse {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
  code?: string;
}

export interface GetLinkedInStatusResponse {
  connected: boolean;
  displayName?: string;
  avatarUrl?: string;
  linkedInId?: string;
  expiresAt?: string;
  organizations?: LinkedInOrganization[];
  primaryOrganization?: LinkedInOrganization | null;
}

// ============================================
// LINKEDIN API TYPES
// ============================================

export interface LinkedInUGCPost {
  author: string;  // urn:li:person:{id}
  lifecycleState: 'PUBLISHED';
  specificContent: {
    'com.linkedin.ugc.ShareContent': {
      shareCommentary: {
        text: string;
      };
      shareMediaCategory: 'NONE' | 'ARTICLE' | 'IMAGE';
      media?: LinkedInMedia[];
    };
  };
  visibility: {
    'com.linkedin.ugc.MemberNetworkVisibility': LinkedInVisibility;
  };
}

export interface LinkedInMedia {
  status: 'READY';
  description?: {
    text: string;
  };
  originalUrl?: string;
  title?: {
    text: string;
  };
}

export interface LinkedInApiError {
  serviceErrorCode: number;
  message: string;
  status: number;
}
