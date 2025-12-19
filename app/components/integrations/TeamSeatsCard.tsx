'use client';

import type { TeamSeat, UserTier } from '@/lib/types/integrations';
import { TierBadge } from './TierBadge';

interface TeamSeatsCardProps {
  currentTier: UserTier;
  seats: TeamSeat[];
  maxSeats: number;
  onInvite: () => void;
  onUpgrade: () => void;
}

export function TeamSeatsCard({ currentTier, seats, maxSeats, onInvite, onUpgrade }: TeamSeatsCardProps) {
  const usedSeats = seats.length;
  const canAddMore = usedSeats < maxSeats;

  if (currentTier !== 'PRO') {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center opacity-50">
            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" />
              <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.04c-.567.2-1.156.349-1.764.441z" />
            </svg>
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-500 dark:text-gray-400">Team Collaboration</h3>
            <TierBadge tier="PRO" size="sm" />
          </div>

          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            Invite up to 2 team members to manage accounts together
          </p>

          <button
            onClick={onUpgrade}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full
              bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-medium
              hover:from-violet-600 hover:to-blue-600 transition-all
              shadow-lg shadow-violet-500/25"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5z" clipRule="evenodd" />
            </svg>
            Upgrade to Pro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Team</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{usedSeats}/{maxSeats} seats used</p>
          </div>
        </div>

        {canAddMore && (
          <button
            onClick={onInvite}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg
              border border-gray-200 dark:border-gray-700
              text-sm font-medium text-gray-600 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
            </svg>
            Invite
          </button>
        )}
      </div>

      <div className="mb-6">
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all"
            style={{ width: `${(usedSeats / maxSeats) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {seats.map((seat) => (
          <div key={seat.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            {seat.avatarUrl ? (
              <img src={seat.avatarUrl} alt={seat.displayName} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-blue-400 flex items-center justify-center text-white font-medium">
                {seat.displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">{seat.displayName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{seat.email}</p>
            </div>

            <span
              className={`text-xs px-2 py-1 rounded-full ${
                seat.role === 'owner'
                  ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                  : seat.role === 'admin'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {seat.role}
            </span>
          </div>
        ))}

        {Array.from({ length: maxSeats - usedSeats }).map((_, i) => (
          <button
            key={`empty-${i}`}
            onClick={onInvite}
            className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors">
              <svg className="w-5 h-5 text-gray-400 group-hover:text-violet-500" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm text-gray-400 group-hover:text-violet-500">Invite team member</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default TeamSeatsCard;
