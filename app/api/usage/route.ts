/**
 * GET /api/usage
 *
 * Returns the current user's usage statistics for the billing period.
 *
 * Response:
 * {
 *   uploads: { used: number, limit: number },
 *   storage: { used: number, limit: number, unit: string },
 *   platforms: { used: number, limit: number },
 *   scheduledPosts: { used: number, limit: number }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHandler, successResponse } from '@/lib/api';
import { prisma } from '@/lib/db';
import { getTierLimits, isUnlimited } from '@/lib/tiers';

export const GET = createHandler(
  async (request, context, user) => {
    const limits = getTierLimits(user!.tier);

    // Get current month's start date
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count uploads this month
    const uploadsThisMonth = await prisma.contentUpload.count({
      where: {
        profileId: user!.profileId,
        createdAt: {
          gte: monthStart,
        },
      },
    });

    // Calculate storage used (sum of file sizes)
    const storageResult = await prisma.contentUpload.aggregate({
      where: {
        profileId: user!.profileId,
      },
      _sum: {
        fileSize: true,
      },
    });

    const storageUsedBytes = storageResult._sum.fileSize || 0;
    const storageUsedMB = Math.round(storageUsedBytes / (1024 * 1024));

    // Count connected platforms
    const connectedPlatforms = await prisma.socialConnection.count({
      where: {
        profileId: user!.profileId,
        isActive: true,
      },
    });

    // Count scheduled posts this month
    const scheduledPostsThisMonth = await prisma.scheduledPost.count({
      where: {
        profileId: user!.profileId,
        createdAt: {
          gte: monthStart,
        },
      },
    });

    return successResponse({
      uploads: {
        used: uploadsThisMonth,
        limit: limits.maxUploads,
      },
      storage: {
        used: storageUsedMB,
        limit: limits.maxStorageMB,
        unit: 'MB',
      },
      platforms: {
        used: connectedPlatforms,
        limit: limits.maxPlatforms,
      },
      scheduledPosts: {
        used: scheduledPostsThisMonth,
        limit: limits.maxScheduledPosts,
      },
      // Period info
      period: {
        start: monthStart.toISOString(),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
      },
    });
  },
  { auth: true }
);
