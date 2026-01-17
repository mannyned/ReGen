'use client';

import { useState, useRef, useEffect } from 'react';
import { LANDING_FAQ_SECTIONS, type LandingFAQItem, type LandingFAQSection } from '@/lib/help/landingFaqData';

/**
 * Chevron Icon for accordion
 */
function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-text-secondary transition-transform duration-300 ${
        isOpen ? 'rotate-180' : ''
      }`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/**
 * Individual FAQ Accordion Item
 */
function FAQItem({ item, isOpen, onToggle }: { item: LandingFAQItem; isOpen: boolean; onToggle: () => void }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  return (
    <div
      className={`rounded-2xl transition-all duration-300 ${
        isOpen
          ? 'bg-white shadow-lg border border-primary/20'
          : 'bg-white shadow-md hover:shadow-lg hover:-translate-y-0.5 border border-gray-100'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-5 text-left"
        aria-expanded={isOpen}
      >
        <div className="flex-1">
          <span className={`font-semibold text-base ${isOpen ? 'text-primary' : 'text-text-primary'}`}>
            {item.question}
          </span>
          {item.highlight && !isOpen && (
            <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {item.highlight}
            </span>
          )}
        </div>
        <ChevronIcon isOpen={isOpen} />
      </button>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ height }}
      >
        <div ref={contentRef} className="px-5 pb-5">
          {item.highlight && (
            <div className="mb-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-primary/10 to-accent-purple/10 text-primary border border-primary/20">
                {item.highlight}
              </span>
            </div>
          )}
          <p className="text-text-secondary leading-relaxed">{item.answer}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Section Tab Button
 */
function SectionTab({
  section,
  isActive,
  onClick,
}: {
  section: LandingFAQSection;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-300 ${
        isActive
          ? 'bg-gradient-brand text-white shadow-md'
          : 'bg-white text-text-secondary hover:text-primary hover:bg-gray-50 border border-gray-200'
      }`}
    >
      <span>{section.icon}</span>
      <span>{section.title}</span>
    </button>
  );
}

/**
 * Landing Page FAQ Component
 */
export function LandingFAQ() {
  const [activeSection, setActiveSection] = useState<string>(LANDING_FAQ_SECTIONS[0].id);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const currentSection = LANDING_FAQ_SECTIONS.find((s) => s.id === activeSection) || LANDING_FAQ_SECTIONS[0];

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    setOpenItemId(null); // Close any open item when switching sections
  };

  const handleItemToggle = (itemId: string) => {
    setOpenItemId(openItemId === itemId ? null : itemId);
  };

  // Scroll active tab into view on mobile
  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeTab = tabsContainerRef.current.querySelector('[data-active="true"]');
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeSection]);

  return (
    <section id="faq" className="py-20 lg:py-28 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="badge-primary mb-4 inline-block">FAQ</span>
          <h2 className="section-title">
            Frequently Asked
            <span className="text-gradient"> Questions</span>
          </h2>
          <p className="section-subtitle">
            Everything you need to know about ReGenr. Can&apos;t find what you&apos;re looking for? Contact us.
          </p>
        </div>

        {/* Section Tabs */}
        <div
          ref={tabsContainerRef}
          className="flex gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:justify-center sm:flex-wrap"
        >
          {LANDING_FAQ_SECTIONS.map((section) => (
            <div key={section.id} data-active={activeSection === section.id}>
              <SectionTab
                section={section}
                isActive={activeSection === section.id}
                onClick={() => handleSectionChange(section.id)}
              />
            </div>
          ))}
        </div>

        {/* Active Section Content */}
        <div className="max-w-3xl mx-auto">
          {/* Section Title & Subtitle */}
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-text-primary mb-2 flex items-center justify-center gap-2">
              <span>{currentSection.icon}</span>
              <span>{currentSection.title}</span>
            </h3>
            <p className="text-text-secondary">{currentSection.subtitle}</p>
          </div>

          {/* FAQ Items */}
          <div className="space-y-4">
            {currentSection.items.map((item) => (
              <FAQItem
                key={item.id}
                item={item}
                isOpen={openItemId === item.id}
                onToggle={() => handleItemToggle(item.id)}
              />
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="text-center mt-12">
          <p className="text-text-secondary mb-4">Still have questions?</p>
          <a
            href="mailto:support@regenr.app"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Contact Support
          </a>
        </div>
      </div>
    </section>
  );
}
