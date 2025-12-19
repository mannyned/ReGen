export type UserTier = 'FREE' | 'CREATOR' | 'PRO';

export type PlatformId =
  | 'meta'
  | 'tiktok'
  | 'youtube'
  | 'twitter'
  | 'linkedin'
  | 'snapchat';

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  requiredTier: UserTier;
  features: string[];
  comingSoon?: boolean;
}

export interface ConnectionStatus {
  connected: boolean;
  accountName?: string;
  accountId?: string;
  avatarUrl?: string;
  connectedAt?: Date;
  expiresAt?: Date;
  scopes?: string[];
}

export interface TeamSeat {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'member';
  invitedAt: Date;
  joinedAt?: Date;
}

export const PLATFORMS: PlatformConfig[] = [
  {
    id: 'meta',
    name: 'meta',
    displayName: 'Meta',
    icon: '📸',
    color: '#E1306C',
    bgColor: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
    description: 'Instagram & Facebook',
    requiredTier: 'FREE',
    features: ['Post insights', 'Audience demographics', 'Story analytics'],
  },
  {
    id: 'tiktok',
    name: 'tiktok',
    displayName: 'TikTok',
    icon: '🎵',
    color: '#000000',
    bgColor: 'bg-gradient-to-br from-cyan-400 via-pink-500 to-red-500',
    description: 'Short-form video analytics',
    requiredTier: 'FREE',
    features: ['Video performance', 'Trending sounds', 'Follower insights'],
  },
  {
    id: 'youtube',
    name: 'youtube',
    displayName: 'YouTube',
    icon: '▶️',
    color: '#FF0000',
    bgColor: 'bg-red-600',
    description: 'Video & Shorts analytics',
    requiredTier: 'CREATOR',
    features: ['Watch time', 'Revenue tracking', 'Subscriber analytics'],
  },
  {
    id: 'twitter',
    name: 'twitter',
    displayName: 'X (Twitter)',
    icon: '𝕏',
    color: '#000000',
    bgColor: 'bg-black',
    description: 'Tweets & engagement',
    requiredTier: 'CREATOR',
    features: ['Tweet analytics', 'Engagement rates', 'Follower growth'],
  },
  {
    id: 'linkedin',
    name: 'linkedin',
    displayName: 'LinkedIn',
    icon: '💼',
    color: '#0A66C2',
    bgColor: 'bg-blue-700',
    description: 'Professional network',
    requiredTier: 'PRO',
    features: ['Post reach', 'Profile views', 'Company analytics'],
  },
  {
    id: 'snapchat',
    name: 'snapchat',
    displayName: 'Snapchat',
    icon: '👻',
    color: '#FFFC00',
    bgColor: 'bg-yellow-400',
    description: 'Spotlight & Stories',
    requiredTier: 'PRO',
    features: ['Story views', 'Spotlight metrics', 'Audience insights'],
    comingSoon: true,
  },
];

export const TIER_LIMITS = {
  FREE: { connections: 2, teamSeats: 1 },
  CREATOR: { connections: 5, teamSeats: 1 },
  PRO: { connections: -1, teamSeats: 3 },
} as const;
