'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

function DataDeletionContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  return (
    <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#141B24] rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-4">
          Data Deletion Request Processed
        </h1>

        <p className="text-gray-400 mb-6">
          Your data deletion request has been received and processed. All data
          associated with your Meta account has been removed from ReGenr.
        </p>

        {code && (
          <div className="bg-[#0B0F14] rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Confirmation Code</p>
            <p className="text-white font-mono text-sm break-all">{code}</p>
          </div>
        )}

        <div className="text-left bg-[#0B0F14] rounded-lg p-4 mb-6">
          <h2 className="text-white font-semibold mb-2">What was deleted:</h2>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• Meta/Instagram account connection</li>
            <li>• Access tokens and credentials</li>
            <li>• Associated profile information</li>
          </ul>
        </div>

        <p className="text-gray-500 text-sm mb-6">
          If you have any questions about data deletion, please contact us at{' '}
          <a
            href="mailto:privacy@regenr.app"
            className="text-[#5EDFFF] hover:underline"
          >
            privacy@regenr.app
          </a>
        </p>

        <Link
          href="/"
          className="inline-block bg-gradient-to-r from-[#B47CFF] via-[#5EDFFF] to-[#4DFFD2] text-[#0B0F14] font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}

export default function DataDeletionStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <DataDeletionContent />
    </Suspense>
  );
}
