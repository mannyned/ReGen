/**
 * GET /api/user/export
 *
 * Exports all user data as a JSON file for GDPR compliance.
 * Returns a comprehensive export of all data associated with the user's account.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log(`[Export Data] Starting data export for user: ${user.id}`);

    // Fetch all user data
    const [
      profile,
      socialConnections,
      oauthConnections,
      contentUploads,
      scheduledPosts,
      outboundPosts,
      analyticsSnapshots,
      rssFeeds,
      blogAutoShareSettings,
      blogAutoSharePosts,
      teamMembership,
    ] = await Promise.all([
      // Profile
      prisma.profile.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          tier: true,
          betaUser: true,
          betaExpiresAt: true,
          notificationPreferences: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      // Social connections
      prisma.socialConnection.findMany({
        where: { profileId: user.id },
        select: {
          id: true,
          platform: true,
          platformUserId: true,
          username: true,
          displayName: true,
          isActive: true,
          lastSyncAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      // OAuth connections (without sensitive tokens)
      prisma.oAuthConnection.findMany({
        where: { profileId: user.id },
        select: {
          id: true,
          provider: true,
          providerAccountId: true,
          scope: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      // Content uploads
      prisma.contentUpload.findMany({
        where: { profileId: user.id },
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          fileSize: true,
          status: true,
          originalUrl: true,
          thumbnailUrl: true,
          generatedCaptions: true,
          processedUrls: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Scheduled posts
      prisma.scheduledPost.findMany({
        where: { profileId: user.id },
        select: {
          id: true,
          platforms: true,
          platformContent: true,
          scheduledAt: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Outbound/published posts
      prisma.outboundPost.findMany({
        where: { profileId: user.id },
        select: {
          id: true,
          provider: true,
          externalPostId: true,
          status: true,
          metadata: true,
          postedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Analytics snapshots
      prisma.analyticsSnapshot.findMany({
        where: { profileId: user.id },
        select: {
          id: true,
          platform: true,
          periodStart: true,
          periodEnd: true,
          metrics: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit to last 100 snapshots
      }),

      // RSS feeds
      prisma.rssFeed.findMany({
        where: { profileId: user.id },
        select: {
          id: true,
          url: true,
          title: true,
          status: true,
          lastFetchedAt: true,
          createdAt: true,
        },
      }),

      // Blog auto-share settings
      prisma.blogAutoShareSettings.findUnique({
        where: { profileId: user.id },
        select: {
          id: true,
          enabled: true,
          platforms: true,
          autoPublish: true,
          captionTemplate: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      // Blog auto-share posts
      prisma.blogAutoSharePost.findMany({
        where: { profileId: user.id },
        select: {
          id: true,
          articleUrl: true,
          articleTitle: true,
          status: true,
          generatedCaption: true,
          processedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),

      // Team membership
      prisma.teamMember.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          role: true,
          joinedAt: true,
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    // Build export object
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      user: {
        profile,
        socialConnections,
        oauthConnections: oauthConnections.map(conn => ({
          ...conn,
          // Explicitly note that tokens are not included
          note: 'Access tokens and refresh tokens are not included for security reasons',
        })),
        teamMembership,
      },
      content: {
        uploads: contentUploads,
        scheduledPosts,
        publishedPosts: outboundPosts,
        blogAutoSharePosts,
      },
      settings: {
        blogAutoShareSettings,
        rssFeeds,
      },
      analytics: {
        snapshots: analyticsSnapshots,
        note: 'Limited to last 100 analytics snapshots',
      },
    };

    console.log(`[Export Data] Export completed for user: ${user.id}`);

    // Return as downloadable JSON file
    const jsonString = JSON.stringify(exportData, null, 2);
    const fileName = `regenr-data-export-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('[Export Data] Error:', error);
    return NextResponse.json(
      { error: 'Failed to export data. Please try again or contact support.' },
      { status: 500 }
    );
  }
}
