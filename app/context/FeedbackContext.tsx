'use client';

/**
 * FeedbackContext - Beta Feedback State Management
 *
 * Manages the state for beta feedback collection including:
 * - Tracking beta user status
 * - Managing feedback modal visibility
 * - Tracking first-time events (first post, first analytics view, etc.)
 * - Submitting and dismissing feedback
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { FeedbackType } from '@/lib/validation/feedbackSchemas';

// ============================================
// TYPES
// ============================================

export type FeedbackTrigger =
  | 'FIRST_POST'
  | 'FIRST_ANALYTICS_VIEW'
  | 'FIRST_AUTO_SHARE'
  | 'GENERAL'
  | 'PRICING';

export interface FeedbackFormData {
  feedbackType: FeedbackTrigger;
  usageIntent?: string;
  featureValueRating?: number;
  usefulnessRating?: number;
  confusionPoints?: string;
  missingFeatures?: string;
  creatorPriceInput?: number;
  proPriceInput?: number;
  additionalWorkspacePriceInput?: number;
  additionalSeatPriceInput?: number;
}

interface FeedbackState {
  isBetaUser: boolean;
  isLoading: boolean;
  showFeedbackModal: boolean;
  currentTrigger: FeedbackTrigger | null;
  hasCompletedFirstPost: boolean;
  hasViewedAnalyticsFirst: boolean;
  hasCompletedFirstAutoShare: boolean;
  dismissedTriggers: FeedbackTrigger[];
  isSubmitting: boolean;
  lastPromptTime: number | null;
}

interface FeedbackContextValue extends FeedbackState {
  // Methods
  checkAndTriggerFeedback: (trigger: FeedbackTrigger) => void;
  openFeedbackModal: (trigger?: FeedbackTrigger) => void;
  closeFeedbackModal: () => void;
  dismissFeedback: (trigger: FeedbackTrigger) => void;
  submitFeedback: (data: FeedbackFormData) => Promise<boolean>;
  markEventCompleted: (
    event: 'first_post' | 'first_analytics' | 'first_auto_share'
  ) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

// Minimum time between feedback prompts (24 hours)
const MIN_TIME_BETWEEN_PROMPTS = 24 * 60 * 60 * 1000;

// ============================================
// PROVIDER
// ============================================

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FeedbackState>({
    isBetaUser: false,
    isLoading: true,
    showFeedbackModal: false,
    currentTrigger: null,
    hasCompletedFirstPost: false,
    hasViewedAnalyticsFirst: false,
    hasCompletedFirstAutoShare: false,
    dismissedTriggers: [],
    isSubmitting: false,
    lastPromptTime: null,
  });

  // Fetch beta status and flags on mount
  useEffect(() => {
    async function fetchUserStatus() {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isBetaUser: data.betaUser || false,
            hasCompletedFirstPost: data.hasCompletedFirstPost || false,
            hasViewedAnalyticsFirst: data.hasViewedAnalyticsFirst || false,
            hasCompletedFirstAutoShare: data.hasCompletedFirstAutoShare || false,
            dismissedTriggers: (data.feedbackDismissedTypes || []) as FeedbackTrigger[],
            lastPromptTime: data.lastFeedbackPromptAt
              ? new Date(data.lastFeedbackPromptAt).getTime()
              : null,
          }));
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('[Feedback] Failed to fetch user status:', error);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    }
    fetchUserStatus();
  }, []);

  const checkAndTriggerFeedback = useCallback(
    (trigger: FeedbackTrigger) => {
      // Only trigger for beta users
      if (!state.isBetaUser) return;

      // Check if already dismissed this trigger
      if (state.dismissedTriggers.includes(trigger)) return;

      // Check minimum time between prompts (except for GENERAL which is user-initiated)
      if (
        trigger !== 'GENERAL' &&
        state.lastPromptTime &&
        Date.now() - state.lastPromptTime < MIN_TIME_BETWEEN_PROMPTS
      ) {
        return;
      }

      // Check if this is a first-time event that hasn't happened yet
      const shouldTrigger =
        (trigger === 'FIRST_POST' && !state.hasCompletedFirstPost) ||
        (trigger === 'FIRST_ANALYTICS_VIEW' && !state.hasViewedAnalyticsFirst) ||
        (trigger === 'FIRST_AUTO_SHARE' && !state.hasCompletedFirstAutoShare) ||
        trigger === 'GENERAL' ||
        trigger === 'PRICING';

      if (shouldTrigger) {
        setState((prev) => ({
          ...prev,
          showFeedbackModal: true,
          currentTrigger: trigger,
          lastPromptTime: Date.now(),
        }));
      }
    },
    [
      state.isBetaUser,
      state.dismissedTriggers,
      state.lastPromptTime,
      state.hasCompletedFirstPost,
      state.hasViewedAnalyticsFirst,
      state.hasCompletedFirstAutoShare,
    ]
  );

  const openFeedbackModal = useCallback(
    (trigger: FeedbackTrigger = 'GENERAL') => {
      if (!state.isBetaUser) return;

      setState((prev) => ({
        ...prev,
        showFeedbackModal: true,
        currentTrigger: trigger,
      }));
    },
    [state.isBetaUser]
  );

  const closeFeedbackModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showFeedbackModal: false,
      currentTrigger: null,
    }));
  }, []);

  const dismissFeedback = useCallback(async (trigger: FeedbackTrigger) => {
    setState((prev) => ({
      ...prev,
      dismissedTriggers: [...prev.dismissedTriggers, trigger],
      showFeedbackModal: false,
      currentTrigger: null,
    }));

    // Persist dismissal to server
    try {
      await fetch('/api/feedback/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger }),
      });
    } catch (error) {
      console.error('[Feedback] Failed to persist dismissal:', error);
    }
  }, []);

  const submitFeedback = useCallback(
    async (data: FeedbackFormData): Promise<boolean> => {
      setState((prev) => ({ ...prev, isSubmitting: true }));

      try {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            browserInfo:
              typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to submit feedback');
        }

        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          showFeedbackModal: false,
          currentTrigger: null,
        }));

        return true;
      } catch (error) {
        console.error('[Feedback] Failed to submit:', error);
        setState((prev) => ({ ...prev, isSubmitting: false }));
        return false;
      }
    },
    []
  );

  const markEventCompleted = useCallback(
    async (event: 'first_post' | 'first_analytics' | 'first_auto_share') => {
      const updates: Partial<FeedbackState> = {};

      switch (event) {
        case 'first_post':
          if (state.hasCompletedFirstPost) return; // Already marked
          updates.hasCompletedFirstPost = true;
          break;
        case 'first_analytics':
          if (state.hasViewedAnalyticsFirst) return; // Already marked
          updates.hasViewedAnalyticsFirst = true;
          break;
        case 'first_auto_share':
          if (state.hasCompletedFirstAutoShare) return; // Already marked
          updates.hasCompletedFirstAutoShare = true;
          break;
      }

      setState((prev) => ({ ...prev, ...updates }));

      // Persist to server
      try {
        await fetch('/api/feedback/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event }),
        });
      } catch (error) {
        console.error('[Feedback] Failed to persist event:', error);
      }
    },
    [
      state.hasCompletedFirstPost,
      state.hasViewedAnalyticsFirst,
      state.hasCompletedFirstAutoShare,
    ]
  );

  const value: FeedbackContextValue = {
    ...state,
    checkAndTriggerFeedback,
    openFeedbackModal,
    closeFeedbackModal,
    dismissFeedback,
    submitFeedback,
    markEventCompleted,
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
    </FeedbackContext.Provider>
  );
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to access feedback context
 */
export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
}

/**
 * Hook for triggering feedback at specific points in the app
 */
export function useFeedbackTrigger() {
  const {
    checkAndTriggerFeedback,
    markEventCompleted,
    isBetaUser,
    hasCompletedFirstPost,
    hasViewedAnalyticsFirst,
    hasCompletedFirstAutoShare,
  } = useFeedback();

  return {
    isBetaUser,
    hasCompletedFirstPost,
    hasViewedAnalyticsFirst,
    hasCompletedFirstAutoShare,
    triggerAfterFirstPost: () => {
      markEventCompleted('first_post');
      // Delay to allow success message to show first
      setTimeout(() => checkAndTriggerFeedback('FIRST_POST'), 1500);
    },
    triggerAfterFirstAnalyticsView: () => {
      markEventCompleted('first_analytics');
      // Delay to allow page to load first
      setTimeout(() => checkAndTriggerFeedback('FIRST_ANALYTICS_VIEW'), 2000);
    },
    triggerAfterFirstAutoShare: () => {
      markEventCompleted('first_auto_share');
      // Delay to allow success message to show first
      setTimeout(() => checkAndTriggerFeedback('FIRST_AUTO_SHARE'), 1500);
    },
  };
}
