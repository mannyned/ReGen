/**
 * Data Deletion Status Page
 *
 * Users are redirected here to check the status of their data deletion request.
 * URL: https://www.regenr.app/deletion-status?code=xxx
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Deletion Status | ReGenr',
  description: 'Check the status of your data deletion request.',
};

interface PageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function DeletionStatusPage({ searchParams }: PageProps) {
  const { code } = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white shadow rounded-lg p-8 text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Data Deletion Complete
        </h1>

        <p className="text-gray-600 mb-6">
          Your data has been successfully deleted from ReGenr in accordance with
          your request.
        </p>

        {code && (
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Confirmation Code</p>
            <p className="font-mono text-sm text-gray-800 break-all">{code}</p>
          </div>
        )}

        <div className="text-sm text-gray-500 space-y-2">
          <p>The following data has been removed:</p>
          <ul className="text-left list-disc pl-6 mt-2">
            <li>Connected social media account information</li>
            <li>OAuth tokens and access credentials</li>
            <li>Associated analytics and metrics data</li>
          </ul>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            If you have any questions, please contact us at{' '}
            <a
              href="mailto:support@regenr.app"
              className="text-blue-600 hover:underline"
            >
              support@regenr.app
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
