/**
 * Blog Auto-Share Debug API
 *
 * GET - Debug the RSS feed and show what's happening
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import Parser from 'rss-parser'

const rssParser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'ReGenr Blog Auto-Share Bot/1.0',
  },
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get settings
    const settings = await prisma.blogAutoShareSettings.findUnique({
      where: { profileId: user.id },
    })

    if (!settings) {
      return NextResponse.json({
        error: 'No settings found',
        step: 'settings',
      })
    }

    if (!settings.blogUrl) {
      return NextResponse.json({
        error: 'No blog URL configured',
        step: 'blogUrl',
        settings: {
          enabled: settings.enabled,
          platforms: settings.platforms,
        },
      })
    }

    // Try to fetch the RSS feed
    let feedItems: any[] = []
    let feedError: string | null = null
    let feedTitle: string | null = null

    try {
      const feed = await rssParser.parseURL(settings.blogUrl)
      feedTitle = feed.title || null
      feedItems = feed.items.map(item => ({
        guid: item.guid || item.link || item.title,
        title: item.title,
        link: item.link,
        pubDate: item.pubDate || item.isoDate,
        hasContent: !!(item.content || item.contentSnippet),
      }))
    } catch (err) {
      feedError = err instanceof Error ? err.message : 'Failed to fetch feed'
    }

    // Check for existing processed posts
    const existingPosts = await prisma.blogAutoSharePost.findMany({
      where: { profileId: user.id },
      select: {
        id: true,
        articleUrl: true,
        articleTitle: true,
        status: true,
        dedupeHash: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Check date filtering
    const enabledAt = settings.enabledAt ? new Date(settings.enabledAt) : null
    const itemsAfterEnableDate = feedItems.filter(item => {
      if (!enabledAt || !settings.onlyNewPosts) return true
      if (!item.pubDate) return true
      return new Date(item.pubDate) >= enabledAt
    })

    // Check which items would be deduplicated
    const dedupeHashes = existingPosts.map(p => p.dedupeHash)
    const newItems = itemsAfterEnableDate.filter(item => {
      const hash = `${item.guid || ''}-${item.link || ''}`
      // Simple check - in reality the hash is computed differently
      return !existingPosts.some(p =>
        p.articleUrl === item.link ||
        p.articleTitle === item.title
      )
    })

    return NextResponse.json({
      success: true,
      debug: {
        blogUrl: settings.blogUrl,
        enabled: settings.enabled,
        platforms: settings.platforms,
        onlyNewPosts: settings.onlyNewPosts,
        enabledAt: settings.enabledAt,
        enabledAtFormatted: enabledAt ? enabledAt.toISOString() : null,
      },
      feed: {
        title: feedTitle,
        error: feedError,
        totalItems: feedItems.length,
        items: feedItems.slice(0, 5), // Show first 5 items
      },
      filtering: {
        itemsAfterEnableDate: itemsAfterEnableDate.length,
        itemsAfterEnableDateList: itemsAfterEnableDate.slice(0, 5).map(i => ({
          title: i.title,
          pubDate: i.pubDate,
        })),
      },
      deduplication: {
        existingPostsCount: existingPosts.length,
        existingPosts: existingPosts.map(p => ({
          title: p.articleTitle,
          url: p.articleUrl,
          status: p.status,
        })),
        newItemsCount: newItems.length,
        newItems: newItems.slice(0, 5).map(i => ({
          title: i.title,
          link: i.link,
        })),
      },
    })
  } catch (error) {
    console.error('[BlogAutoShare Debug] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Debug failed' },
      { status: 500 }
    )
  }
}
