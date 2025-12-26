'use client';

import { useState, useEffect, useRef } from 'react';
import type { FAQItem } from '@/lib/help/faqData';

interface FAQAccordionProps {
  item: FAQItem;
  isOpen?: boolean;
  onToggle?: () => void;
  highlightId?: string | null;
}

/**
 * Copy link button component
 */
function CopyLinkButton({ itemId }: { itemId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/help#${itemId}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md text-text-secondary hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title={copied ? 'Copied!' : 'Copy link to this question'}
      aria-label="Copy link"
    >
      {copied ? (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )}
    </button>
  );
}

/**
 * Simple markdown-like renderer for FAQ answers
 */
function MarkdownContent({ content }: { content: string }) {
  // Process markdown-like syntax
  const processContent = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let inList = false;
    let listItems: string[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const processInlineMarkdown = (line: string) => {
      // Bold
      line = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // Inline code
      line = line.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">$1</code>');
      // Links
      line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>');
      return line;
    };

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2 text-text-secondary">
            {listItems.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: processInlineMarkdown(item) }} />
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0) {
        const headers = tableRows[0];
        const body = tableRows.slice(2); // Skip header separator row
        elements.push(
          <div key={`table-${elements.length}`} className="my-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left font-medium text-text-primary">
                      {h.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 text-text-secondary">
                        {cell.trim()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Table detection
      if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        flushList();
        inTable = true;
        const cells = trimmedLine.slice(1, -1).split('|');
        tableRows.push(cells);
        return;
      } else if (inTable) {
        flushTable();
      }

      // List item
      if (trimmedLine.startsWith('- ') || trimmedLine.match(/^\d+\.\s/)) {
        inList = true;
        const itemText = trimmedLine.replace(/^[-\d.]\s*/, '');
        listItems.push(itemText);
        return;
      } else if (inList && trimmedLine === '') {
        flushList();
        return;
      } else if (inList) {
        flushList();
      }

      // Empty line
      if (trimmedLine === '') {
        return;
      }

      // Regular paragraph
      elements.push(
        <p
          key={`p-${index}`}
          className="text-text-secondary my-2"
          dangerouslySetInnerHTML={{ __html: processInlineMarkdown(trimmedLine) }}
        />
      );
    });

    // Flush any remaining list items
    flushList();
    flushTable();

    return elements;
  };

  return <div className="prose prose-sm max-w-none">{processContent(content)}</div>;
}

/**
 * FAQ Accordion Component
 */
export function FAQAccordion({ item, isOpen = false, onToggle, highlightId }: FAQAccordionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(0);
  const isHighlighted = highlightId === item.id;

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  // Auto-scroll when highlighted
  useEffect(() => {
    if (isHighlighted && contentRef.current) {
      const element = document.getElementById(item.id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [isHighlighted, item.id]);

  return (
    <div
      id={item.id}
      className={`border rounded-xl transition-all duration-200 ${
        isOpen
          ? 'border-primary/30 bg-white dark:bg-gray-900 shadow-sm'
          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
      } ${isHighlighted ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-4 text-left"
        aria-expanded={isOpen}
      >
        <span className={`font-medium ${isOpen ? 'text-primary' : 'text-text-primary'}`}>
          {item.question}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <CopyLinkButton itemId={item.id} />
          <svg
            className={`w-5 h-5 text-text-secondary transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ height: height }}
      >
        <div ref={contentRef} className="px-4 pb-4">
          <MarkdownContent content={item.answer} />
        </div>
      </div>
    </div>
  );
}

/**
 * FAQ Section Component
 */
interface FAQSectionProps {
  id: string;
  title: string;
  icon: string;
  items: FAQItem[];
  openItemId: string | null;
  onItemToggle: (itemId: string) => void;
  highlightId?: string | null;
}

export function FAQSection({ id, title, icon, items, openItemId, onItemToggle, highlightId }: FAQSectionProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-text-primary mb-4">
        <span>{icon}</span>
        <span>{title}</span>
      </h2>
      <div className="space-y-3">
        {items.map((item) => (
          <FAQAccordion
            key={item.id}
            item={item}
            isOpen={openItemId === item.id}
            onToggle={() => onItemToggle(item.id)}
            highlightId={highlightId}
          />
        ))}
      </div>
    </section>
  );
}
