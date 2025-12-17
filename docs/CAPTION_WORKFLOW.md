# Caption Workflow Documentation

## Overview

The Caption Workflow system in ReGenr allows creators to generate a single **Primary Caption** for a source platform and then distribute that exact caption across multiple other platforms. The key principle is that **creators retain full control** over caption generation and distribution - no AI modifications occur without explicit user action.

## Core Principles

### 1. Primary Caption as Single Source of Truth
- One caption is generated or written for a selected source platform
- This primary caption is **locked by default**
- All platform distributions derive from this single source
- Changes to the primary caption can optionally update all "identical" instances

### 2. No AI Modification Without User Action
- The default behavior is to use the caption **as-is** on all platforms
- AI adaptations require explicit user action (clicking "Adapt" button)
- Adaptations are **rule-based** and predictable, not full rewrites
- Full AI rewrites require the user to explicitly request regeneration

### 3. Explicit User Controls Per Platform
Each platform instance has three options:
1. **Use as-is**: Caption remains identical to primary (default)
2. **Manual edit**: User directly edits the caption for that platform
3. **Apply adaptations**: Limited, rule-based modifications (shortening, removing hashtags, etc.)

## Caption Usage Modes

| Mode | Description | AI Involved? |
|------|-------------|--------------|
| `identical` | Caption is exactly the same as primary | No |
| `manual_edit` | User manually edited the caption | No |
| `ai_adapted` | Rule-based adaptations applied | Minimal (deterministic) |
| `full_rewrite` | User explicitly requested AI regeneration | Yes |

## Available Adaptations

Adaptations are **rule-based transformations** that do NOT change the meaning of the caption:

| Adaptation | Description |
|------------|-------------|
| `shorten` | Truncate at sentence/word boundaries to fit platform limit |
| `remove_hashtags` | Strip all hashtags from caption |
| `reduce_hashtags` | Keep only top N hashtags |
| `remove_emojis` | Strip all emojis |
| `reduce_emojis` | Limit to N emojis |
| `add_line_breaks` | Add paragraph breaks after sentences |
| `remove_line_breaks` | Condense to single paragraph |
| `add_cta` | Append call-to-action (if not present) |
| `remove_mentions` | Strip @mentions |
| `professional_tone` | Minor adjustments for LinkedIn (reduce emojis, remove casual phrases) |
| `casual_tone` | Minor adjustments for TikTok (remove formal punctuation) |

## Platform Character Limits

| Platform | Caption Limit | Warning Threshold |
|----------|--------------|-------------------|
| Instagram | 2,200 | 90% |
| TikTok | 4,000 | 90% |
| YouTube | 5,000 | 85% |
| Twitter/X | 280 | 80% |
| LinkedIn | 3,000 | 90% |
| Facebook | 63,206 | 95% |
| Snapchat | 250 | 80% |

## Workflow Steps

### Step 1: Select Source Platform
- User chooses which platform the primary caption will be optimized for
- This affects AI generation context (if using AI)

### Step 2: Generate Primary Caption
- **Option A**: Generate with AI (optimized for source platform)
- **Option B**: Write manually
- Caption is locked by default after generation

### Step 3: Distribute to Platforms
- User selects which platforms to distribute to
- Each platform starts with **identical** caption
- Per-platform controls available:
  - Edit button: Open text editor for manual changes
  - Adapt button: Show adaptation menu
  - Auto-fit button: Automatically shorten if over limit
  - Reset button: Revert to primary caption

### Step 4: Review & Confirm
- Summary of all platforms with usage modes
- Character count validation
- Analytics tracking notice
- Confirm to proceed

## Analytics Tracking

### Metadata Stored Per Caption
```typescript
{
  captionId: string
  publishedAt: Date
  platform: SocialPlatform
  primaryCaptionId: string
  usageMode: CaptionUsageMode
  appliedAdaptations: CaptionAdaptation[]
  contentHash: string
  characterCount: number
  hashtagCount: number
  emojiCount: number
  lineBreakCount: number
  isIdenticalToPrimary: boolean
  similarityScore: number // 0-100
}
```

### Performance Comparison
The analytics system can compare:
- **Identical vs Adapted**: Do adapted captions perform better?
- **Platform-specific performance**: Which platforms respond best to identical captions?
- **Adaptation effectiveness**: Which adaptations improve engagement?

## Component Structure

### Files
- `lib/types/caption.ts` - Type definitions and utility functions
- `lib/utils/captionAdaptations.ts` - Adaptation logic
- `app/components/CaptionWorkflow.tsx` - Main workflow component
- `app/generate/page.tsx` - Integration with generate page

### Key Types
```typescript
// Primary caption (source of truth)
interface PrimaryCaption {
  id: string
  content: string
  hashtags: string[]
  sourcePlatform: SocialPlatform
  generatedAt: Date
  generatedBy: 'ai' | 'manual' | 'brand_voice'
  isLocked: boolean
}

// Platform-specific instance
interface PlatformCaptionInstance {
  platform: SocialPlatform
  enabled: boolean
  caption: string
  hashtags: string[]
  usageMode: CaptionUsageMode
  appliedAdaptations: CaptionAdaptation[]
  characterCount: number
  isOverLimit: boolean
  warningLevel: 'none' | 'approaching' | 'exceeded'
}
```

## UI Features

### Character Count Bar
- Visual progress bar showing usage vs limit
- Color coded: green (safe), yellow (approaching), red (exceeded)
- Shows exact count: "245/280"

### Usage Mode Badges
- **Identical** (green): Using primary caption exactly
- **Edited** (blue): User manually modified
- **Adapted** (purple): Rule-based adaptations applied
- **Rewritten** (orange): Full AI regeneration

### Truncation Warnings
- Automatic detection when caption exceeds platform limit
- "Auto-fit" button to shorten intelligently
- Recommendations for appropriate adaptations

## Best Practices for Creators

### When to Use Caption Workflow
- Posting the same content across multiple platforms
- Want consistency in messaging
- Need to track which caption versions perform best

### When to Use Legacy Mode
- Each platform needs significantly different content
- Doing A/B testing with different messages
- Platform-specific campaigns

### Adaptation Recommendations
- **Twitter/X**: Always check length, use `shorten` if needed
- **LinkedIn**: Consider `professional_tone` for B2B content
- **Snapchat**: Use `remove_hashtags` (no hashtag support)
- **TikTok**: `casual_tone` and `reduce_hashtags` often work well

## Data Storage

Caption analytics are stored in localStorage under `captionAnalytics` key:
```javascript
// Example stored data
[
  {
    "captionId": "caption_1234567890_instagram",
    "publishedAt": "2024-01-15T10:30:00.000Z",
    "platform": "instagram",
    "primaryCaptionId": "caption_1234567890",
    "usageMode": "identical",
    "isIdenticalToPrimary": true,
    "similarityScore": 100
  },
  {
    "captionId": "caption_1234567890_twitter",
    "publishedAt": "2024-01-15T10:30:00.000Z",
    "platform": "twitter",
    "primaryCaptionId": "caption_1234567890",
    "usageMode": "ai_adapted",
    "appliedAdaptations": ["shorten", "reduce_hashtags"],
    "isIdenticalToPrimary": false,
    "similarityScore": 72
  }
]
```

## Future Enhancements

Potential future features:
- Caption templates and presets
- Bulk adaptation application
- Historical caption performance dashboard
- A/B testing mode for captions
- Team collaboration on captions
- Caption scheduling integration
