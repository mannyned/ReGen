'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { FAQ_SECTIONS, searchFAQ } from '@/lib/help/faqData';
import { FAQSection, FAQAccordion } from '@/app/components/FAQAccordion';

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Handle hash navigation on mount and hash change
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        setOpenItemId(hash);
        setHighlightId(hash);
        // Clear highlight after animation
        setTimeout(() => setHighlightId(null), 2000);
      }
    };

    // Check on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Filter FAQ items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return searchFAQ(searchQuery);
  }, [searchQuery]);

  // Toggle accordion item
  const handleItemToggle = (itemId: string) => {
    setOpenItemId(openItemId === itemId ? null : itemId);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">ReGenr</span>
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-text-secondary hover:text-primary transition-colors"
            >
              Back to App
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4">
            How can we help?
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Find answers to common questions about ReGenr. Can't find what you're looking for?{' '}
            <a href="mailto:support@regenr.app" className="text-primary hover:underline">
              Contact support
            </a>
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-10">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help..."
              className="w-full pl-12 pr-12 py-4 text-lg border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Quick Links (when not searching) */}
        {!searchQuery && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {FAQ_SECTIONS.slice(0, 4).map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-primary/50 hover:bg-primary/5 transition-all text-center"
              >
                <span className="text-2xl">{section.icon}</span>
                <span className="text-sm font-medium text-text-primary">{section.title}</span>
              </a>
            ))}
          </div>
        )}

        {/* Search Results */}
        {filteredItems && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''} for "{searchQuery}"
              </h2>
              <button
                onClick={handleClearSearch}
                className="text-sm text-primary hover:underline"
              >
                Clear search
              </button>
            </div>
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-text-secondary mb-4">
                  No results found. Try different keywords.
                </p>
                <a
                  href="mailto:support@regenr.app"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contact support
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <FAQAccordion
                    key={item.id}
                    item={item}
                    isOpen={openItemId === item.id}
                    onToggle={() => handleItemToggle(item.id)}
                    highlightId={highlightId}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* FAQ Sections (when not searching) */}
        {!searchQuery && (
          <div className="space-y-12">
            {FAQ_SECTIONS.map((section) => (
              <FAQSection
                key={section.id}
                id={section.id}
                title={section.title}
                icon={section.icon}
                items={section.items}
                openItemId={openItemId}
                onItemToggle={handleItemToggle}
                highlightId={highlightId}
              />
            ))}
          </div>
        )}

        {/* Contact Support CTA */}
        <div className="mt-16 text-center bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl p-8 sm:p-12">
          <div className="text-4xl mb-4">💬</div>
          <h2 className="text-2xl font-bold text-text-primary mb-3">
            Still need help?
          </h2>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Our support team is here to help. Reach out and we'll get back to you as soon as possible.
          </p>
          <a
            href="mailto:support@regenr.app"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contact Support
          </a>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-text-secondary">
            <Link href="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link href="/pricing" className="hover:text-primary transition-colors">
              Pricing
            </Link>
            <a href="https://twitter.com/regenrapp" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              Twitter
            </a>
          </div>
          <p className="text-center text-sm text-text-secondary mt-4">
            © {new Date().getFullYear()} ReGenr. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}
