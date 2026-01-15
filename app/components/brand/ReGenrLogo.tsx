'use client';

import Image from 'next/image';
import Link from 'next/link';

interface ReGenrLogoProps {
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  linkToHome?: boolean;
  className?: string;
  monochrome?: 'light' | 'dark';
}

const sizeConfig = {
  sm: { icon: 24, text: 'text-lg', gap: 'gap-1.5' },
  md: { icon: 32, text: 'text-xl', gap: 'gap-2' },
  lg: { icon: 40, text: 'text-2xl', gap: 'gap-2.5' },
  xl: { icon: 48, text: 'text-3xl', gap: 'gap-3' },
};

export function ReGenrLogo({
  iconOnly = false,
  size = 'md',
  linkToHome = true,
  className = '',
  monochrome,
}: ReGenrLogoProps) {
  const config = sizeConfig[size];

  const logoContent = (
    <div className={`flex items-center ${config.gap} ${className}`}>
      <div
        className="relative flex-shrink-0"
        style={{ width: config.icon, height: config.icon }}
      >
        <Image
          src="/brand/regenr-icon-clean-1024.png"
          alt="ReGenr"
          fill
          className="object-contain"
          priority
        />
      </div>

      {!iconOnly && (
        <span
          className={`font-bold ${config.text} ${
            monochrome
              ? monochrome === 'light'
                ? 'text-white'
                : 'text-gray-900'
              : 'bg-gradient-to-r from-violet-400 via-blue-500 to-emerald-400 bg-clip-text text-transparent'
          }`}
        >
          ReGenr
        </span>
      )}
    </div>
  );

  if (linkToHome) {
    return (
      <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}

export default ReGenrLogo;
