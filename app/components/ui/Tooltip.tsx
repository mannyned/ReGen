'use client'

import { useState, useRef, useEffect, useCallback, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { SocialPlatform } from '@/lib/types/social'

// ============================================
// TYPES
// ============================================

type UserPlan = 'free' | 'creator' | 'pro'

interface TooltipProps {
  /** The content to display in the tooltip */
  content: string
  /** Optional title for the tooltip */
  title?: string
  /** The element that triggers the tooltip */
  children?: ReactNode
  /** Position preference (will auto-adjust if near viewport edge) */
  position?: 'top' | 'bottom' | 'left' | 'right'
  /** Delay before showing tooltip (ms) */
  showDelay?: number
  /** Delay before hiding tooltip (ms) */
  hideDelay?: number
  /** Whether to show an info icon trigger */
  showIcon?: boolean
  /** Custom icon to use instead of default */
  icon?: ReactNode
  /** Additional CSS classes for the tooltip container */
  className?: string
  /** Current platform context for platform-specific content */
  platform?: SocialPlatform
  /** User's plan for gating advanced features */
  userPlan?: UserPlan
  /** AI recommendation based on performance */
  aiRecommendation?: string
  /** Show AI recommendation section */
  showAiHint?: boolean
  /** Pro-only benchmark data */
  benchmark?: {
    industry: number
    userAvg: number
    trend: 'up' | 'down' | 'stable'
    trendValue: number
  }
  /** Current metric value for comparison */
  currentValue?: number
  /** Metric key for platform-specific content */
  metricKey?: keyof typeof MetricTooltips
}

interface TooltipPosition {
  top: number
  left: number
  actualPosition: 'top' | 'bottom' | 'left' | 'right'
}

// ============================================
// PLATFORM-SPECIFIC METRIC EXPLANATIONS
// ============================================

interface PlatformExplanation {
  base: string
  platforms: Partial<Record<SocialPlatform, string>>
}

interface MetricTooltipConfig {
  title: string
  content: PlatformExplanation
  icon: string
  proInsight: string
  actionHints: {
    low: string
    medium: string
    high: string
  }
  thresholds: {
    low: number
    high: number
  }
}

export const MetricTooltips: Record<string, MetricTooltipConfig> = {
  sentiment: {
    title: 'Sentiment Score',
    icon: '😊',
    content: {
      base: 'Shows how positively your audience responds. Higher scores mean happier followers who engage and share more.',
      platforms: {
        instagram: 'On Instagram, positive sentiment drives saves and shares. Focus on inspiring, relatable content.',
        tiktok: 'TikTok rewards authentic, entertaining content. High sentiment boosts your For You page reach.',
        youtube: 'YouTube sentiment affects watch time. Positive reactions keep viewers watching longer.',
        linkedin: 'Professional sentiment builds trust. Thought leadership content scores highest here.',
        twitter: 'Twitter sentiment spreads fast. Positive tweets get retweeted more than negative ones.',
        facebook: 'Facebook prioritizes meaningful interactions. Positive sentiment increases organic reach.',
      }
    },
    proInsight: 'Your sentiment is 12% higher than industry average. Top creators maintain 80%+ positive sentiment.',
    actionHints: {
      low: 'Try asking questions to spark positive discussions',
      medium: 'Good progress! Add more value-driven content to boost further',
      high: 'Excellent! Keep creating content that resonates with your audience'
    },
    thresholds: { low: 50, high: 75 }
  },
  retention: {
    title: 'Audience Retention',
    icon: '👁️',
    content: {
      base: 'The average percentage of your videos viewers watch. Improve this by making your first 3 seconds compelling.',
      platforms: {
        instagram: 'Reels need a hook in the first second. Use text overlays to grab attention immediately.',
        tiktok: 'TikTok viewers decide in 0.5 seconds. Start with movement, text, or a surprising visual.',
        youtube: 'YouTube rewards watch time heavily. Strong intros and chapters help retention.',
        linkedin: 'LinkedIn videos autoplay silently. Add captions and visual hooks for the scroll-stop.',
        facebook: 'Facebook users scroll fast. Front-load your message in the first 3 seconds.',
      }
    },
    proInsight: 'Videos with 65%+ retention get 3x more algorithmic distribution.',
    actionHints: {
      low: 'Hook viewers faster—put your best content in the first 3 seconds',
      medium: 'Add pattern interrupts every 5-7 seconds to maintain attention',
      high: 'Your hooks are working! Experiment with longer-form content'
    },
    thresholds: { low: 40, high: 65 }
  },
  virality: {
    title: 'Virality Score',
    icon: '🔥',
    content: {
      base: 'Measures how often your content gets shared beyond your followers. High scores mean your content is reaching new audiences.',
      platforms: {
        instagram: 'Instagram virality comes from Shares and Saves. Create "send to a friend" worthy content.',
        tiktok: 'TikTok virality is driven by stitches, duets, and shares. Make content others want to remix.',
        youtube: 'YouTube viral content gets embedded and shared. Timely, searchable topics perform best.',
        linkedin: 'LinkedIn virality comes from comments and shares by industry leaders.',
        twitter: 'Twitter virality = retweets + quote tweets. Hot takes and threads spread fastest.',
        facebook: 'Facebook viral content triggers emotional responses and community sharing.',
      }
    },
    proInsight: 'Content with virality score above 60 reaches 5x more non-followers.',
    actionHints: {
      low: 'Create more shareable content—tutorials, tips, or relatable moments',
      medium: 'Add clear CTAs encouraging shares. Ask "Tag someone who needs this"',
      high: 'You\'re creating viral content! Double down on these formats'
    },
    thresholds: { low: 30, high: 60 }
  },
  velocity: {
    title: 'Content Velocity',
    icon: '⚡',
    content: {
      base: 'Your posting frequency. Consistent posting (3-4x per week) typically performs better than sporadic bursts.',
      platforms: {
        instagram: 'Instagram rewards consistency. 1 post + 3-5 Stories daily is ideal for growth.',
        tiktok: 'TikTok creators who post 1-3x daily see fastest growth. Quantity helps find winners.',
        youtube: 'YouTube prefers consistent schedules. 1-2 videos per week builds subscriber loyalty.',
        linkedin: 'LinkedIn engagement peaks with 3-5 posts per week. Daily posting can reduce reach.',
        twitter: 'Twitter moves fast. 3-5 tweets daily keeps you visible in the feed.',
        facebook: 'Facebook reach drops with over-posting. 1-2 quality posts daily is optimal.',
      }
    },
    proInsight: 'Your posting velocity is optimal. Creators at your level average 3.5 posts/day.',
    actionHints: {
      low: 'Increase posting frequency gradually—aim for one more post per week',
      medium: 'Good rhythm! Focus on maintaining consistency over time',
      high: 'Strong velocity! Ensure quality isn\'t suffering from quantity'
    },
    thresholds: { low: 1.5, high: 4 }
  },
  crossPlatform: {
    title: 'Cross-Platform Synergy',
    icon: '🔗',
    content: {
      base: 'How well your content performs when shared across multiple platforms. Higher scores mean better multi-platform strategy.',
      platforms: {
        instagram: 'Instagram content repurposes well to Facebook and Pinterest with minor adjustments.',
        tiktok: 'TikTok videos work on Reels and Shorts. Remove watermarks for best performance.',
        youtube: 'YouTube content can be clipped for all short-form platforms effectively.',
        linkedin: 'LinkedIn content adapts well to Twitter with a more casual tone adjustment.',
        twitter: 'Twitter threads make great LinkedIn carousels and blog post outlines.',
        facebook: 'Facebook content translates to Instagram and LinkedIn with formatting tweaks.',
      }
    },
    proInsight: 'Multi-platform creators see 2.4x total reach vs single-platform focus.',
    actionHints: {
      low: 'Start repurposing your best content to one additional platform',
      medium: 'Good synergy! Optimize your captions per platform for better results',
      high: 'Excellent cross-platform strategy! Consider adding one more platform'
    },
    thresholds: { low: 50, high: 80 }
  },
  hashtags: {
    title: 'Hashtag Performance',
    icon: '#️⃣',
    content: {
      base: 'How effectively your hashtags help people discover your content. Mix popular and niche tags for best results.',
      platforms: {
        instagram: 'Instagram: Use 5-15 hashtags mixing popular (100K-1M) and niche (10K-100K) tags.',
        tiktok: 'TikTok: 3-5 trending hashtags work best. Check Discover page for current trends.',
        youtube: 'YouTube: Use tags in titles and descriptions. 5-8 relevant tags is optimal.',
        linkedin: 'LinkedIn: 3-5 professional hashtags max. Industry-specific tags perform best.',
        twitter: 'Twitter: 1-2 hashtags is ideal. More can reduce engagement by 17%.',
        facebook: 'Facebook: Hashtags have minimal impact. Use 1-2 or none at all.',
      }
    },
    proInsight: 'Posts with 3-10 relevant hashtags typically see 30% more reach than those without.',
    actionHints: {
      low: 'Research trending hashtags in your niche to improve discoverability',
      medium: 'Good mix! Try varying your hashtag count (3-10 is optimal) across posts',
      high: 'Your hashtag strategy is working! Keep using a consistent mix of niche and popular tags'
    },
    thresholds: { low: 40, high: 70 }
  },
  engagement: {
    title: 'Engagement Rate',
    icon: '❤️',
    content: {
      base: 'The percentage of viewers who interact through likes, comments, or shares. Industry average is 3-6%.',
      platforms: {
        instagram: 'Instagram: 3-6% is good, 6%+ is excellent. Carousel posts typically get highest engagement.',
        tiktok: 'TikTok: 4-8% is average due to FYP exposure. Comments weight heavily in the algorithm.',
        youtube: 'YouTube: 4-5% like ratio is healthy. Comments boost algorithmic distribution.',
        linkedin: 'LinkedIn: 2-4% is strong for B2B. Comments from connections amplify reach.',
        twitter: 'Twitter: 1-3% is typical. Quote tweets signal higher value than likes.',
        facebook: 'Facebook: 1-3% organic engagement. Meaningful comments beat reaction counts.',
      }
    },
    proInsight: 'Your engagement is in the top 20% for your follower count bracket.',
    actionHints: {
      low: 'End posts with questions or CTAs to encourage comments',
      medium: 'Respond to comments quickly to boost conversation rates',
      high: 'Excellent engagement! Your audience is highly active'
    },
    thresholds: { low: 3, high: 8 }
  },
  reach: {
    title: 'Reach',
    icon: '👥',
    content: {
      base: 'The total number of unique accounts that saw your content. Growing reach means expanding your audience.',
      platforms: {
        instagram: 'Instagram reach depends on Explore page and hashtag performance. Reels boost reach significantly.',
        tiktok: 'TikTok For You page can give any video massive reach regardless of follower count.',
        youtube: 'YouTube reach grows through search, suggested videos, and subscriber notifications.',
        linkedin: 'LinkedIn reach expands when connections engage, showing content to their network.',
        twitter: 'Twitter reach multiplies through retweets and viral potential in replies.',
        facebook: 'Facebook organic reach is limited. Groups and shares extend your visibility.',
      }
    },
    proInsight: 'Your reach has grown 34% this month. Top 10% growth in your category.',
    actionHints: {
      low: 'Focus on shareable content and strategic hashtags to expand reach',
      medium: 'Good growth! Collaborate with others in your niche for faster expansion',
      high: 'Strong reach! Focus on converting viewers to engaged followers'
    },
    thresholds: { low: 1000, high: 10000 }
  },
  saveRate: {
    title: 'Save Rate',
    icon: '📌',
    content: {
      base: 'How often viewers save your posts for later. High save rates signal valuable content that algorithms favor.',
      platforms: {
        instagram: 'Instagram saves are a top-ranking signal. Educational and inspirational content gets saved most.',
        tiktok: 'TikTok favorites indicate high-value content. Tutorials and tips get saved frequently.',
        youtube: 'YouTube "Save to playlist" signals evergreen value. How-to content performs best.',
        linkedin: 'LinkedIn saves indicate professional value. Save-worthy content includes industry insights.',
        facebook: 'Facebook saves are underutilized but signal content worth revisiting.',
      }
    },
    proInsight: 'Content with 5%+ save rate gets 40% more distribution.',
    actionHints: {
      low: 'Create more educational or reference-worthy content people want to revisit',
      medium: 'Add "Save this for later" CTAs to remind viewers',
      high: 'Your content is bookmark-worthy! Keep creating high-value posts'
    },
    thresholds: { low: 2, high: 5 }
  },
  hookScore: {
    title: 'Hook Score',
    icon: '🎣',
    content: {
      base: 'How well your video opening captures attention. The first 3 seconds are critical for keeping viewers watching.',
      platforms: {
        instagram: 'Reels: Start with movement or text. Static openings lose 60% of viewers.',
        tiktok: 'TikTok: The first frame matters. Use pattern interrupts and direct address.',
        youtube: 'YouTube Shorts: Skip intros entirely. Start with the payoff or a question.',
        linkedin: 'LinkedIn: Professional hooks work—start with a bold statement or statistic.',
        facebook: 'Facebook: Assume sound-off viewing. Visual hooks and captions are essential.',
      }
    },
    proInsight: 'Your average hook score beats 78% of creators in your niche.',
    actionHints: {
      low: 'Study your top-performing video openings and replicate those patterns',
      medium: 'Test different hook styles: questions, bold claims, or visual surprises',
      high: 'Your hooks are working great! Document your winning formulas'
    },
    thresholds: { low: 50, high: 80 }
  },
  completionRate: {
    title: 'Completion Rate',
    icon: '✅',
    content: {
      base: 'The percentage of viewers who watch your entire video. Higher completion rates boost your content in algorithms.\n\n📊 Industry Averages:\n• Short-form (< 60s): 40-60% is average, 70%+ is excellent\n• Long-form (1-5 min): 30-50% is average, 60%+ is excellent\n• Long-form (5+ min): 20-40% is average, 50%+ is excellent',
      platforms: {
        instagram: 'Reels: 15-30 second videos have highest completion. Keep it punchy.\n\n📊 Instagram Average: 45-55% completion for Reels under 30 seconds.',
        tiktok: 'TikTok: Shorter videos (7-15 sec) complete more but longer can work if compelling.\n\n📊 TikTok Average: 50-70% for videos under 15 seconds, 30-40% for 60+ seconds.',
        youtube: 'YouTube: Structure content to maintain interest. Use chapters for longer videos.\n\n📊 YouTube Average: 50-60% for Shorts, 40-50% for videos under 10 min, 30-40% for longer content.',
        linkedin: 'LinkedIn: 30-90 second videos optimal. Get to the point quickly.\n\n📊 LinkedIn Average: 35-45% completion for professional content.',
        facebook: 'Facebook: Front-load value. Most viewers drop off after 10 seconds.\n\n📊 Facebook Average: 30-40% completion, with most drop-off in first 10 seconds.',
      }
    },
    proInsight: 'Videos with 70%+ completion get prioritized in recommendations. Top 10% of creators average 65%+ completion.',
    actionHints: {
      low: 'Trim content ruthlessly. Remove anything that doesn\'t add immediate value',
      medium: 'Add visual variety every 3-5 seconds to maintain attention',
      high: 'Excellent retention! Consider testing slightly longer content'
    },
    thresholds: { low: 30, high: 60 }
  },
  avgViewDuration: {
    title: 'Average View Duration',
    icon: '⏱️',
    content: {
      base: 'The average time viewers spend watching your videos. Longer watch time signals engaging content and boosts algorithmic distribution.',
      platforms: {
        instagram: 'Reels: Aim for viewers to watch 80%+ of your video. Shorter videos (15-30s) often achieve this more easily.',
        tiktok: 'TikTok: Watch time heavily influences For You page placement. Loop-worthy content keeps viewers watching multiple times.',
        youtube: 'YouTube: Watch time is the #1 ranking factor. Longer videos with high retention outperform short videos with low retention.',
        linkedin: 'LinkedIn: Professional audiences prefer concise content. 30-90 seconds with clear value keeps attention.',
        facebook: 'Facebook: Most viewers drop off quickly. Front-load value to maximize watch time in the first 10 seconds.',
      }
    },
    proInsight: 'Creators with 45+ second average view duration see 2x more recommendations.',
    actionHints: {
      low: 'Hook viewers faster and deliver value throughout. Consider shorter, more focused videos',
      medium: 'Good watch time! Add pattern interrupts and tease upcoming content to extend viewing',
      high: 'Excellent watch time! Your content keeps viewers engaged—experiment with longer formats'
    },
    thresholds: { low: 15, high: 45 }
  },
  topCountry: {
    title: 'Top Country',
    icon: '🌍',
    content: {
      base: 'The country where your content receives the most engagement. Understanding geographic distribution helps tailor content to your primary audience.',
      platforms: {
        instagram: 'Instagram Insights shows country breakdown for Business/Creator accounts with sufficient reach.',
        tiktok: 'TikTok provides geographic data through Creator Analytics for accounts with 100+ followers.',
        youtube: 'YouTube Analytics offers detailed geographic data including country, region, and city breakdowns.',
        linkedin: 'LinkedIn shows visitor demographics for company pages and profiles with enough followers.',
        facebook: 'Facebook Page Insights provides geographic data for Pages with sufficient engagement.',
      }
    },
    proInsight: 'Creators who tailor content to their top 3 countries see 40% higher engagement.',
    actionHints: {
      low: 'Build your audience by posting consistently—geographic data appears with more views',
      medium: 'Good reach! Consider posting during peak hours in your top country',
      high: 'Strong presence! Create region-specific content to deepen engagement'
    },
    thresholds: { low: 100, high: 1000 }
  },
  globalReach: {
    title: 'Global Reach',
    icon: '🌐',
    content: {
      base: 'The number of countries and cities where your content has been viewed. Wider reach indicates growing international appeal.',
      platforms: {
        instagram: 'Instagram shows reach across countries for accounts with Business/Creator features enabled.',
        tiktok: 'TikTok can surface content globally through the For You page, regardless of follower count.',
        youtube: 'YouTube provides comprehensive geographic analytics including view counts by country.',
        linkedin: 'LinkedIn shows visitor demographics by location for professional content.',
        facebook: 'Facebook provides geographic reach data for Pages and public content.',
      }
    },
    proInsight: 'Content reaching 10+ countries typically has 3x higher viral potential.',
    actionHints: {
      low: 'Focus on creating universally relatable content to expand geographic reach',
      medium: 'Good spread! Use trending sounds and hashtags to reach new markets',
      high: 'Excellent global presence! Consider multi-language captions for top regions'
    },
    thresholds: { low: 3, high: 10 }
  },
  emergingRegion: {
    title: 'Emerging Region',
    icon: '🚀',
    content: {
      base: 'A region showing rapid growth in engagement. Emerging regions represent untapped opportunities for audience expansion.',
      platforms: {
        instagram: 'Instagram may show growth in regions where your content is being discovered through Explore or hashtags.',
        tiktok: 'TikTok\'s algorithm can suddenly expose content to new regions, creating emerging markets.',
        youtube: 'YouTube\'s suggested videos can drive traffic from new geographic regions.',
        linkedin: 'LinkedIn content can gain traction in new professional markets through shares.',
        facebook: 'Facebook Groups and shares can introduce content to new geographic audiences.',
      }
    },
    proInsight: 'Capitalizing on emerging regions early can establish you as a leader in that market.',
    actionHints: {
      low: 'Keep posting—emerging regions appear as your content reaches new audiences',
      medium: 'Good momentum! Create content that resonates with this new audience',
      high: 'Hot market detected! Consider dedicating content specifically to this region'
    },
    thresholds: { low: 10, high: 50 }
  },
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getPerformanceLevel(value: number, thresholds: { low: number; high: number }): 'low' | 'medium' | 'high' {
  if (value < thresholds.low) return 'low'
  if (value >= thresholds.high) return 'high'
  return 'medium'
}

function getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up': return '↗️'
    case 'down': return '↘️'
    case 'stable': return '→'
  }
}

function getTrendColor(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up': return 'text-green-400'
    case 'down': return 'text-red-400'
    case 'stable': return 'text-gray-400'
  }
}

// ============================================
// TOOLTIP COMPONENT
// ============================================

export function Tooltip({
  content,
  title,
  children,
  position = 'top',
  showDelay = 200,
  hideDelay = 100,
  showIcon = true,
  icon,
  className = '',
  platform,
  userPlan = 'free',
  aiRecommendation,
  showAiHint = false,
  benchmark,
  currentValue,
  metricKey,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Get metric config if metricKey provided
  const metricConfig = metricKey ? MetricTooltips[metricKey] : null

  // Determine content to show
  const displayTitle = title || metricConfig?.title || ''
  const displayContent = metricConfig
    ? (platform && metricConfig.content.platforms[platform])
      ? metricConfig.content.platforms[platform]!
      : metricConfig.content.base
    : content

  // Get AI hint based on performance
  const aiHint = metricConfig && currentValue !== undefined
    ? metricConfig.actionHints[getPerformanceLevel(currentValue, metricConfig.thresholds)]
    : aiRecommendation

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Calculate optimal position based on viewport
  const calculatePosition = useCallback((): TooltipPosition | null => {
    if (!triggerRef.current || !tooltipRef.current) return null

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const padding = 12
    const offset = 8

    let actualPosition = position
    let top = 0
    let left = 0

    const positions = {
      top: {
        top: triggerRect.top - tooltipRect.height - offset,
        left: triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2),
      },
      bottom: {
        top: triggerRect.bottom + offset,
        left: triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2),
      },
      left: {
        top: triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2),
        left: triggerRect.left - tooltipRect.width - offset,
      },
      right: {
        top: triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2),
        left: triggerRect.right + offset,
      },
    }

    const positionOrder: Array<'top' | 'bottom' | 'left' | 'right'> = [position]
    if (position === 'top' || position === 'bottom') {
      positionOrder.push(position === 'top' ? 'bottom' : 'top', 'right', 'left')
    } else {
      positionOrder.push(position === 'left' ? 'right' : 'left', 'top', 'bottom')
    }

    for (const pos of positionOrder) {
      const { top: testTop, left: testLeft } = positions[pos]
      const fitsTop = testTop >= padding
      const fitsBottom = testTop + tooltipRect.height <= viewportHeight - padding
      const fitsLeft = testLeft >= padding
      const fitsRight = testLeft + tooltipRect.width <= viewportWidth - padding

      if (fitsTop && fitsBottom && fitsLeft && fitsRight) {
        actualPosition = pos
        top = testTop
        left = testLeft
        break
      }
    }

    if (top === 0 && left === 0) {
      const preferred = positions[position]
      top = Math.max(padding, Math.min(preferred.top, viewportHeight - tooltipRect.height - padding))
      left = Math.max(padding, Math.min(preferred.left, viewportWidth - tooltipRect.width - padding))
      actualPosition = position
    }

    return { top, left, actualPosition }
  }, [position])

  // Show tooltip with animation
  const showTooltip = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }

    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true)
      setIsAnimating(true)
    }, showDelay)
  }, [showDelay])

  // Hide tooltip with animation
  const hideTooltip = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current)
      showTimeoutRef.current = null
    }

    setIsAnimating(false)
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false)
      setTooltipPosition(null)
    }, hideDelay + 150) // Add time for exit animation
  }, [hideDelay])

  // Update position when tooltip becomes visible
  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      requestAnimationFrame(() => {
        const pos = calculatePosition()
        setTooltipPosition(pos)
      })
    }
  }, [isVisible, calculatePosition])

  // Handle click outside to close on mobile
  useEffect(() => {
    if (!isVisible || !isMobile) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setIsAnimating(false)
        setTimeout(() => {
          setIsVisible(false)
          setTooltipPosition(null)
        }, 150)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isVisible, isMobile])

  // Handle escape key
  useEffect(() => {
    if (!isVisible) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAnimating(false)
        setTimeout(() => {
          setIsVisible(false)
          setTooltipPosition(null)
          triggerRef.current?.focus()
        }, 150)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isVisible])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  // Handle mobile tap
  const handleTap = () => {
    if (isMobile) {
      if (isVisible) {
        setIsAnimating(false)
        setTimeout(() => setIsVisible(false), 150)
      } else {
        setIsVisible(true)
        setIsAnimating(true)
      }
    }
  }

  // Get arrow classes
  const getArrowClass = () => {
    const pos = tooltipPosition?.actualPosition || position
    switch (pos) {
      case 'top':
        return 'after:top-full after:left-1/2 after:-translate-x-1/2 after:border-t-gray-800 after:border-x-transparent after:border-b-transparent'
      case 'bottom':
        return 'after:bottom-full after:left-1/2 after:-translate-x-1/2 after:border-b-gray-800 after:border-x-transparent after:border-t-transparent'
      case 'left':
        return 'after:left-full after:top-1/2 after:-translate-y-1/2 after:border-l-gray-800 after:border-y-transparent after:border-r-transparent'
      case 'right':
        return 'after:right-full after:top-1/2 after:-translate-y-1/2 after:border-r-gray-800 after:border-y-transparent after:border-l-transparent'
      default:
        return ''
    }
  }

  // Animation classes
  const getAnimationClass = () => {
    const pos = tooltipPosition?.actualPosition || position
    const baseTransform = pos === 'top' ? 'translate-y-1' : pos === 'bottom' ? '-translate-y-1' : pos === 'left' ? 'translate-x-1' : '-translate-x-1'

    if (isAnimating && tooltipPosition) {
      return 'opacity-100 translate-y-0 translate-x-0 scale-100'
    }
    return `opacity-0 ${baseTransform} scale-95`
  }

  const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`
  const isPro = userPlan === 'pro'

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {children}
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 text-text-secondary/50 hover:text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 rounded-full hover:scale-110 active:scale-95"
        onMouseEnter={!isMobile ? showTooltip : undefined}
        onMouseLeave={!isMobile ? hideTooltip : undefined}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onClick={handleTap}
        aria-describedby={isVisible ? tooltipId : undefined}
        aria-expanded={isVisible}
        aria-label={`More information about ${displayTitle || 'this metric'}`}
      >
        {icon || (
          <svg
            className="w-3.5 h-3.5 transition-transform duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path strokeLinecap="round" strokeWidth="2" d="M12 16v-4M12 8h.01" />
          </svg>
        )}
      </button>

      {/* Tooltip - rendered via Portal to escape parent transform stacking contexts */}
      {isVisible && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className={`
            fixed z-[9999] w-72 max-w-[90vw]
            bg-gray-800 text-white rounded-xl
            shadow-2xl shadow-black/20
            transform transition-all duration-200 ease-out
            after:content-[''] after:absolute after:border-[6px]
            ${getArrowClass()}
            ${getAnimationClass()}
          `}
          style={{
            top: tooltipPosition?.top ?? -9999,
            left: tooltipPosition?.left ?? -9999,
          }}
          onMouseEnter={!isMobile ? showTooltip : undefined}
          onMouseLeave={!isMobile ? hideTooltip : undefined}
        >
          {/* Header */}
          <div className="px-4 pt-3 pb-2 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              {metricConfig && (
                <span className="text-lg">{metricConfig.icon}</span>
              )}
              <h4 className="font-semibold text-white">{displayTitle}</h4>
            </div>
          </div>

          {/* Main Content */}
          <div className="px-4 py-3">
            <p className="text-gray-300 text-sm leading-relaxed">{displayContent}</p>

            {/* Platform Badge */}
            {platform && metricConfig?.content.platforms[platform] && (
              <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-gray-700/50 rounded-full">
                <span className="text-xs text-gray-400">Optimized for</span>
                <span className="text-xs font-medium text-primary capitalize">{platform}</span>
              </div>
            )}
          </div>

          {/* AI Recommendation (visible to all users if showAiHint or has aiHint) */}
          {(showAiHint || aiHint) && aiHint && (
            <div className="px-4 py-3 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-t border-gray-700/50">
              <div className="flex items-start gap-2">
                <span className="text-sm">💡</span>
                <div>
                  <p className="text-xs font-medium text-purple-300 mb-0.5">What to do next</p>
                  <p className="text-xs text-gray-300">{aiHint}</p>
                </div>
              </div>
            </div>
          )}

          {/* Pro-Only Insights */}
          {isPro && benchmark && (
            <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-accent-purple/10 border-t border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-primary flex items-center gap-1">
                  <span>⭐</span> Pro Insights
                </span>
                <span className={`text-xs font-medium flex items-center gap-1 ${getTrendColor(benchmark.trend)}`}>
                  {getTrendIcon(benchmark.trend)} {benchmark.trendValue > 0 ? '+' : ''}{benchmark.trendValue}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Industry Avg</p>
                  <p className="text-sm font-semibold text-white">{benchmark.industry}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Your Average</p>
                  <p className="text-sm font-semibold text-white">{benchmark.userAvg}%</p>
                </div>
              </div>
              {metricConfig?.proInsight && (
                <p className="mt-2 text-xs text-gray-400 italic">{metricConfig.proInsight}</p>
              )}
            </div>
          )}

          {/* Upgrade prompt for non-Pro users when benchmark would be shown */}
          {!isPro && userPlan !== 'free' && metricConfig && (
            <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-700/50">
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <span>⭐</span>
                <span>Upgrade to Pro for benchmarks & trends</span>
              </p>
            </div>
          )}
        </div>,
        document.body
      )}
    </span>
  )
}

// ============================================
// METRIC INFO ICON COMPONENT (Simplified Usage)
// ============================================

interface MetricInfoProps {
  metric: keyof typeof MetricTooltips
  platform?: SocialPlatform
  userPlan?: UserPlan
  currentValue?: number
  benchmark?: {
    industry: number
    userAvg: number
    trend: 'up' | 'down' | 'stable'
    trendValue: number
  }
  children?: ReactNode
  className?: string
}

export function MetricInfo({
  metric,
  platform,
  userPlan = 'free',
  currentValue,
  benchmark,
  children,
  className = '',
}: MetricInfoProps) {
  const config = MetricTooltips[metric]
  if (!config) return <>{children}</>

  return (
    <Tooltip
      metricKey={metric}
      content={config.content.base}
      title={config.title}
      platform={platform}
      userPlan={userPlan}
      currentValue={currentValue}
      benchmark={benchmark}
      showAiHint={currentValue !== undefined}
      className={className}
    >
      {children}
    </Tooltip>
  )
}

export default Tooltip
