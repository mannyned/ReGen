'use client';

import type { UserTier } from '@/lib/types/integrations';

interface TierBadgeProps {
  tier: UserTier;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const tierConfig = {
  FREE: {
    label: 'Free',
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
  },
  CREATOR: {
    label: 'Creator',
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-800',
  },
  PRO: {
    label: 'Pro',
    bg: 'bg-gradient-to-r from-violet-500 to-blue-500',
    text: 'text-white',
    border: 'border-transparent',
  },
};

const sizeConfig = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function TierBadge({ tier, size = 'sm', className = '' }: TierBadgeProps) {
  const config = tierConfig[tier];

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        ${config.bg} ${config.text} ${config.border}
        ${sizeConfig[size]}
        ${className}
      `}
    >
      {config.label}
    </span>
  );
}

export default TierBadge;
