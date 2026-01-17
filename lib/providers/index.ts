/**
 * OAuth Providers Index
 *
 * This file exports all available OAuth providers and auto-registers them
 * with the OAuth engine when imported.
 *
 * Import this file in your application entry point or API routes
 * to ensure all providers are registered before use.
 *
 * Example:
 * ```ts
 * import '@/lib/providers'; // Registers all providers
 * import { OAuthEngine } from '@/lib/oauth/engine';
 *
 * const provider = OAuthEngine.getProvider('meta');
 * ```
 */

// Import all providers - this triggers registration with the engine
export { metaProvider } from './meta';
export { tiktokProvider } from './tiktok';
export { googleProvider } from './google';
export { xProvider } from './x';
export { linkedinProvider } from './linkedin';
export { linkedinOrgProvider } from './linkedin-org';
export { snapchatProvider } from './snapchat';

// Re-export types for convenience
export type { OAuthProvider, OAuthProviderInterface } from '../oauth/types';

// Export provider configurations for reference
export const PROVIDER_CONFIGS = {
  meta: {
    displayName: 'Meta (Facebook/Instagram)',
    platforms: ['Facebook', 'Instagram'],
    features: ['Posts', 'Stories', 'Reels', 'Insights'],
  },
  tiktok: {
    displayName: 'TikTok',
    platforms: ['TikTok'],
    features: ['Videos', 'Analytics'],
  },
  google: {
    displayName: 'Google (YouTube)',
    platforms: ['YouTube'],
    features: ['Videos', 'Shorts', 'Analytics', 'Upload'],
  },
  x: {
    displayName: 'X (Twitter)',
    platforms: ['X'],
    features: ['Tweets', 'Threads', 'Analytics'],
  },
  linkedin: {
    displayName: 'LinkedIn Personal',
    platforms: ['LinkedIn'],
    features: ['Posts', 'Articles'],
  },
  'linkedin-org': {
    displayName: 'LinkedIn Company Page',
    platforms: ['LinkedIn'],
    features: ['Company Posts', 'Analytics', 'Engagement Data'],
  },
  snapchat: {
    displayName: 'Snapchat',
    platforms: ['Snapchat'],
    features: ['Login', 'Share (User-Initiated)'],
  },
} as const;

/**
 * List of all supported provider IDs
 */
export const SUPPORTED_PROVIDERS = Object.keys(PROVIDER_CONFIGS) as Array<
  keyof typeof PROVIDER_CONFIGS
>;

/**
 * Check if a provider ID is valid
 */
export function isValidProvider(providerId: string): providerId is keyof typeof PROVIDER_CONFIGS {
  return providerId in PROVIDER_CONFIGS;
}
