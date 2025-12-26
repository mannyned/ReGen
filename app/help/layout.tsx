import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help & FAQ | ReGenr',
  description:
    'Get help with ReGenr. Find answers to frequently asked questions about connecting platforms, scheduling posts, RSS feeds, plans, teams, and more.',
  openGraph: {
    title: 'Help & FAQ | ReGenr',
    description:
      'Get help with ReGenr. Find answers to frequently asked questions about connecting platforms, scheduling posts, RSS feeds, plans, teams, and more.',
    type: 'website',
  },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
