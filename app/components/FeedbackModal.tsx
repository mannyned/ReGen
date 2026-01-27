'use client';

/**
 * FeedbackModal - Beta Feedback Collection Modal
 *
 * Two-step modal for collecting structured feedback from beta users:
 * Step 1: General feedback (usage intent, ratings, pain points)
 * Step 2: Pricing feedback (price input for Creator and Pro plans)
 */

import { useState, useEffect, useCallback } from 'react';
import { useFeedback, type FeedbackTrigger, type FeedbackFormData } from '@/app/context/FeedbackContext';

// ============================================
// TYPES
// ============================================

type Step = 'general' | 'pricing' | 'complete';

interface FormState {
  usageIntent: string;
  featureValueRating: number | null;
  usefulnessRating: number | null;
  confusionPoints: string;
  missingFeatures: string;
  creatorPriceInput: string;
  proPriceInput: string;
}

// ============================================
// TRIGGER INFO
// ============================================

const triggerInfo: Record<FeedbackTrigger, { title: string; description: string }> = {
  FIRST_POST: {
    title: 'Congrats on your first post!',
    description: "We'd love to hear about your experience so far.",
  },
  FIRST_ANALYTICS_VIEW: {
    title: 'Exploring Analytics',
    description: 'What do you think about our analytics features?',
  },
  FIRST_AUTO_SHARE: {
    title: 'Auto-sharing activated!',
    description: 'How was your experience setting up blog auto-sharing?',
  },
  GENERAL: {
    title: 'Share Your Feedback',
    description: 'Help us improve Regen for you and other creators.',
  },
  PRICING: {
    title: 'Help Us Price Fairly',
    description: 'Your input helps us create accessible pricing for all creators.',
  },
};

// Plan features for context in pricing step
const planFeatures = {
  creator: [
    'Unlimited post scheduling',
    'Multi-platform publishing',
    'Basic analytics dashboard',
    'Caption AI assistance',
    'Up to 3 connected accounts',
  ],
  pro: [
    'Everything in Creator, plus:',
    'Advanced analytics & insights',
    'Location analytics',
    'AI-powered recommendations',
    'Unlimited connected accounts',
    'Team collaboration',
    'Priority support',
  ],
};

// ============================================
// RATING SELECTOR COMPONENT
// ============================================

interface RatingSelectorProps {
  value: number | null;
  onChange: (value: number) => void;
  label: string;
  description?: string;
}

function RatingSelector({ value, onChange, label, description }: RatingSelectorProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`w-10 h-10 rounded-lg font-medium transition-all ${
              value === rating
                ? 'bg-purple-600 text-white shadow-md scale-105'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-label={`Rate ${rating} out of 5`}
          >
            {rating}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>Not at all</span>
        <span>Extremely</span>
      </div>
    </div>
  );
}

// ============================================
// PRICE INPUT COMPONENT
// ============================================

interface PriceInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  features: string[];
  error?: string;
}

function PriceInput({ value, onChange, label, features, error }: PriceInputProps) {
  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <ul className="text-xs text-gray-500 mb-3 space-y-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-purple-500 mt-0.5">•</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
        <input
          type="number"
          min="0"
          max="999"
          step="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter price"
          className={`w-full pl-7 pr-12 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
            error ? 'border-red-400' : 'border-gray-300'
          }`}
          aria-invalid={!!error}
          aria-describedby={error ? `${label}-error` : undefined}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">/mo</span>
      </div>
      {error && (
        <p id={`${label}-error`} className="text-xs text-red-500 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================
// MAIN FEEDBACK MODAL COMPONENT
// ============================================

export function FeedbackModal() {
  const {
    showFeedbackModal,
    currentTrigger,
    isSubmitting,
    closeFeedbackModal,
    dismissFeedback,
    submitFeedback,
  } = useFeedback();

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>('general');
  const [form, setForm] = useState<FormState>({
    usageIntent: '',
    featureValueRating: null,
    usefulnessRating: null,
    confusionPoints: '',
    missingFeatures: '',
    creatorPriceInput: '',
    proPriceInput: '',
  });
  const [errors, setErrors] = useState<{ creator?: string; pro?: string }>({});

  // Handle mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (showFeedbackModal) {
      setStep(currentTrigger === 'PRICING' ? 'pricing' : 'general');
      setForm({
        usageIntent: '',
        featureValueRating: null,
        usefulnessRating: null,
        confusionPoints: '',
        missingFeatures: '',
        creatorPriceInput: '',
        proPriceInput: '',
      });
      setErrors({});
    }
  }, [showFeedbackModal, currentTrigger]);

  // Handle body overflow
  useEffect(() => {
    if (showFeedbackModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showFeedbackModal]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showFeedbackModal) {
        handleDismiss();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showFeedbackModal]);

  const updateForm = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear errors when user types
    if (key === 'creatorPriceInput' || key === 'proPriceInput') {
      setErrors((prev) => ({ ...prev, [key === 'creatorPriceInput' ? 'creator' : 'pro']: undefined }));
    }
  }, []);

  const validatePricing = useCallback(() => {
    const newErrors: { creator?: string; pro?: string } = {};

    if (form.creatorPriceInput) {
      const price = parseFloat(form.creatorPriceInput);
      if (isNaN(price) || price < 0 || price > 999) {
        newErrors.creator = 'Please enter a valid price between $0 and $999';
      }
    }

    if (form.proPriceInput) {
      const price = parseFloat(form.proPriceInput);
      if (isNaN(price) || price < 0 || price > 999) {
        newErrors.pro = 'Please enter a valid price between $0 and $999';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form.creatorPriceInput, form.proPriceInput]);

  const handleDismiss = useCallback(() => {
    if (currentTrigger) {
      dismissFeedback(currentTrigger);
    } else {
      closeFeedbackModal();
    }
  }, [currentTrigger, dismissFeedback, closeFeedbackModal]);

  const handleNextStep = useCallback(() => {
    if (step === 'general') {
      setStep('pricing');
    }
  }, [step]);

  const handlePreviousStep = useCallback(() => {
    if (step === 'pricing') {
      setStep('general');
    }
  }, [step]);

  const handleSubmit = useCallback(async () => {
    if (!currentTrigger) return;

    // Validate pricing if on pricing step
    if (step === 'pricing' && !validatePricing()) {
      return;
    }

    const feedbackData: FeedbackFormData = {
      feedbackType: currentTrigger,
      usageIntent: form.usageIntent || undefined,
      featureValueRating: form.featureValueRating || undefined,
      usefulnessRating: form.usefulnessRating || undefined,
      confusionPoints: form.confusionPoints || undefined,
      missingFeatures: form.missingFeatures || undefined,
      creatorPriceInput: form.creatorPriceInput ? parseFloat(form.creatorPriceInput) : undefined,
      proPriceInput: form.proPriceInput ? parseFloat(form.proPriceInput) : undefined,
    };

    const success = await submitFeedback(feedbackData);
    if (success) {
      setStep('complete');
    }
  }, [currentTrigger, step, form, validatePricing, submitFeedback]);

  const handleSkipPricing = useCallback(async () => {
    if (!currentTrigger) return;

    const feedbackData: FeedbackFormData = {
      feedbackType: currentTrigger,
      usageIntent: form.usageIntent || undefined,
      featureValueRating: form.featureValueRating || undefined,
      usefulnessRating: form.usefulnessRating || undefined,
      confusionPoints: form.confusionPoints || undefined,
      missingFeatures: form.missingFeatures || undefined,
    };

    const success = await submitFeedback(feedbackData);
    if (success) {
      setStep('complete');
    }
  }, [currentTrigger, form, submitFeedback]);

  if (!mounted || !showFeedbackModal) return null;

  const info = currentTrigger ? triggerInfo[currentTrigger] : triggerInfo.GENERAL;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-5 text-white relative">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-xl">
                {step === 'complete' ? '🎉' : step === 'pricing' ? '💰' : '💬'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full font-medium">Beta Feedback</span>
              </div>
              <h2 id="feedback-modal-title" className="text-lg font-bold">
                {step === 'complete' ? 'Thank You!' : info.title}
              </h2>
            </div>
          </div>

          {/* Progress indicator */}
          {step !== 'complete' && currentTrigger !== 'PRICING' && (
            <div className="flex gap-2 mt-4">
              <div
                className={`h-1 flex-1 rounded-full ${step === 'general' ? 'bg-white' : 'bg-white/40'}`}
              />
              <div
                className={`h-1 flex-1 rounded-full ${step === 'pricing' ? 'bg-white' : 'bg-white/40'}`}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-180px)]">
          {step === 'complete' ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Your feedback matters!</h3>
              <p className="text-sm text-gray-600 mb-6">
                Thank you for helping us build a better product for creators like you.
              </p>
              <button
                onClick={closeFeedbackModal}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Continue
              </button>
            </div>
          ) : step === 'general' ? (
            <>
              <p className="text-sm text-gray-600 mb-4">{info.description}</p>

              {/* Usage Intent */}
              <div className="mb-4">
                <label htmlFor="usage-intent" className="block text-sm font-medium text-gray-700 mb-1">
                  What are you primarily using Regen for?
                </label>
                <textarea
                  id="usage-intent"
                  value={form.usageIntent}
                  onChange={(e) => updateForm('usageIntent', e.target.value)}
                  placeholder="e.g., Growing my personal brand, managing multiple client accounts..."
                  rows={2}
                  maxLength={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
                />
              </div>

              {/* Feature Value Rating */}
              <RatingSelector
                value={form.featureValueRating}
                onChange={(v) => updateForm('featureValueRating', v)}
                label="How valuable are Regen's features to you?"
                description="Consider scheduling, analytics, and AI assistance"
              />

              {/* Usefulness Rating */}
              <RatingSelector
                value={form.usefulnessRating}
                onChange={(v) => updateForm('usefulnessRating', v)}
                label="How useful has Regen been for your content workflow?"
              />

              {/* Confusion Points */}
              <div className="mb-4">
                <label htmlFor="confusion-points" className="block text-sm font-medium text-gray-700 mb-1">
                  Anything confusing or frustrating? (optional)
                </label>
                <textarea
                  id="confusion-points"
                  value={form.confusionPoints}
                  onChange={(e) => updateForm('confusionPoints', e.target.value)}
                  placeholder="Tell us what could be clearer or easier..."
                  rows={2}
                  maxLength={2000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
                />
              </div>

              {/* Missing Features */}
              <div className="mb-4">
                <label htmlFor="missing-features" className="block text-sm font-medium text-gray-700 mb-1">
                  What features are you missing? (optional)
                </label>
                <textarea
                  id="missing-features"
                  value={form.missingFeatures}
                  onChange={(e) => updateForm('missingFeatures', e.target.value)}
                  placeholder="Features that would make Regen more valuable for you..."
                  rows={2}
                  maxLength={2000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Help us set fair prices! Enter what you'd consider a fair monthly price for each plan.
                No pressure — this is just to help us understand.
              </p>

              <PriceInput
                value={form.creatorPriceInput}
                onChange={(v) => updateForm('creatorPriceInput', v)}
                label="Creator Plan"
                features={planFeatures.creator}
                error={errors.creator}
              />

              <PriceInput
                value={form.proPriceInput}
                onChange={(v) => updateForm('proPriceInput', v)}
                label="Pro Plan"
                features={planFeatures.pro}
                error={errors.pro}
              />
            </>
          )}
        </div>

        {/* Footer */}
        {step !== 'complete' && (
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <button
              onClick={handleDismiss}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Maybe later
            </button>

            <div className="flex gap-3">
              {step === 'pricing' && currentTrigger !== 'PRICING' && (
                <button
                  onClick={handlePreviousStep}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Back
                </button>
              )}

              {step === 'general' ? (
                <button
                  onClick={handleNextStep}
                  className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  Next: Pricing Input
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSkipPricing}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting && (
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    )}
                    Submit Feedback
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
