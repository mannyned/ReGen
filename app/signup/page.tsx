'use client'

import Link from 'next/link'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center gradient-brand p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-2">Create Account</h1>
          <p className="text-text-secondary">Start repurposing content with AI</p>
        </div>

        <form className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg input-focus"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg input-focus"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg input-focus"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirm-password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg input-focus"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-start">
            <input type="checkbox" className="w-4 h-4 mt-1 text-primary border-gray-300 rounded focus:ring-primary" />
            <span className="ml-2 text-sm text-gray-600">
              I agree to the{' '}
              <a href="#" className="link-primary">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="link-primary">
                Privacy Policy
              </a>
            </span>
          </div>

          <button
            type="submit"
            className="w-full btn-primary"
          >
            Create Account
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="link-primary">
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-6">
          <Link href="/" className="block text-center text-gray-600 hover:text-gray-800">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
