/**
 * Auth Layout
 *
 * Layout for authentication pages (login, signup, etc.)
 * Provides consistent styling and prevents authenticated users
 * from accessing these pages.
 */

import { Suspense } from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
