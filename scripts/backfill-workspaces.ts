/**
 * Workspace Backfill Script
 *
 * Idempotent script to:
 * 1. Create default workspace for each PRO user who doesn't have one
 * 2. Assign existing content to the default workspace
 *
 * Safe to run multiple times - checks for existing workspaces first.
 *
 * Usage:
 *   npx ts-node scripts/backfill-workspaces.ts
 *   npx ts-node scripts/backfill-workspaces.ts --dry-run
 *   npx ts-node scripts/backfill-workspaces.ts --users=user-id-1,user-id-2
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BATCH_SIZE = 100

interface BackfillOptions {
  dryRun: boolean
  specificUsers: string[]
}

function parseArgs(): BackfillOptions {
  const args = process.argv.slice(2)
  const options: BackfillOptions = {
    dryRun: false,
    specificUsers: [],
  }

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg.startsWith('--users=')) {
      options.specificUsers = arg.replace('--users=', '').split(',').filter(Boolean)
    }
  }

  return options
}

async function backfillWorkspaces(options: BackfillOptions) {
  console.log('==========================================')
  console.log('  Workspace Backfill Script')
  console.log('==========================================')
  console.log(`  Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`  Batch Size: ${BATCH_SIZE}`)
  if (options.specificUsers.length > 0) {
    console.log(`  Target Users: ${options.specificUsers.join(', ')}`)
  }
  console.log('==========================================\n')

  let totalProcessed = 0
  let totalCreated = 0
  let totalSkipped = 0
  let totalErrors = 0

  // Build where clause
  const whereClause: any = {
    tier: 'PRO',
    ownedTeam: null, // No workspace yet
  }

  if (options.specificUsers.length > 0) {
    whereClause.id = { in: options.specificUsers }
  }

  // Process in batches
  let hasMore = true
  let cursor: string | undefined

  while (hasMore) {
    // Find PRO users without a workspace
    const users = await prisma.profile.findMany({
      where: whereClause,
      select: { id: true, email: true, displayName: true },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    })

    if (users.length === 0) {
      hasMore = false
      continue
    }

    cursor = users[users.length - 1].id

    console.log(`Processing batch of ${users.length} users...`)

    for (const user of users) {
      totalProcessed++

      try {
        // Double-check user doesn't already have a workspace (race condition protection)
        const existingWorkspace = await prisma.team.findFirst({
          where: { ownerId: user.id },
        })

        if (existingWorkspace) {
          console.log(`  [SKIP] ${user.email} - already has workspace "${existingWorkspace.name}"`)
          totalSkipped++
          continue
        }

        if (options.dryRun) {
          console.log(`  [DRY-RUN] Would create workspace for ${user.email}`)

          // Count content that would be migrated
          const counts = await Promise.all([
            prisma.socialConnection.count({ where: { profileId: user.id, workspaceId: null } }),
            prisma.oAuthConnection.count({ where: { profileId: user.id, workspaceId: null } }),
            prisma.contentUpload.count({ where: { profileId: user.id, workspaceId: null } }),
            prisma.scheduledPost.count({ where: { profileId: user.id, workspaceId: null } }),
            prisma.analyticsSnapshot.count({ where: { profileId: user.id, workspaceId: null } }),
          ])

          console.log(`    Would migrate: ${counts[0]} social connections, ${counts[1]} OAuth connections,`)
          console.log(`                   ${counts[2]} content uploads, ${counts[3]} scheduled posts,`)
          console.log(`                   ${counts[4]} analytics snapshots`)

          totalCreated++
          continue
        }

        // Create workspace and migrate content in a transaction
        await prisma.$transaction(async (tx) => {
          // Create default workspace
          const workspace = await tx.team.create({
            data: {
              name: 'My Workspace',
              ownerId: user.id,
              isDefault: true,
            },
          })

          // Add owner as OWNER member
          await tx.teamMember.create({
            data: {
              teamId: workspace.id,
              userId: user.id,
              role: 'OWNER',
            },
          })

          // Migrate all user's content to this workspace
          const migrationResults = await Promise.all([
            tx.socialConnection.updateMany({
              where: { profileId: user.id, workspaceId: null },
              data: { workspaceId: workspace.id },
            }),
            tx.oAuthConnection.updateMany({
              where: { profileId: user.id, workspaceId: null },
              data: { workspaceId: workspace.id },
            }),
            tx.contentUpload.updateMany({
              where: { profileId: user.id, workspaceId: null },
              data: { workspaceId: workspace.id },
            }),
            tx.scheduledPost.updateMany({
              where: { profileId: user.id, workspaceId: null },
              data: { workspaceId: workspace.id },
            }),
            tx.analyticsSnapshot.updateMany({
              where: { profileId: user.id, workspaceId: null },
              data: { workspaceId: workspace.id },
            }),
            tx.exportJob.updateMany({
              where: { profileId: user.id, workspaceId: null },
              data: { workspaceId: workspace.id },
            }),
            tx.rssFeed.updateMany({
              where: { profileId: user.id, workspaceId: null },
              data: { workspaceId: workspace.id },
            }),
            tx.outboundPost.updateMany({
              where: { profileId: user.id, workspaceId: null },
              data: { workspaceId: workspace.id },
            }),
            tx.blogAutoShareSettings.updateMany({
              where: { profileId: user.id, workspaceId: null },
              data: { workspaceId: workspace.id },
            }),
          ])

          const totalMigrated = migrationResults.reduce((sum, r) => sum + r.count, 0)
          console.log(`  [OK] ${user.email} - created workspace, migrated ${totalMigrated} records`)
        })

        totalCreated++
      } catch (error) {
        console.error(`  [ERROR] ${user.email}:`, error)
        totalErrors++
      }
    }

    // Check if we've processed all users
    if (users.length < BATCH_SIZE) {
      hasMore = false
    }
  }

  console.log('\n==========================================')
  console.log('  Backfill Complete')
  console.log('==========================================')
  console.log(`  Total Processed: ${totalProcessed}`)
  console.log(`  Workspaces Created: ${totalCreated}`)
  console.log(`  Skipped (already had workspace): ${totalSkipped}`)
  console.log(`  Errors: ${totalErrors}`)
  console.log('==========================================')

  return {
    totalProcessed,
    totalCreated,
    totalSkipped,
    totalErrors,
  }
}

// Run if called directly
if (require.main === module) {
  const options = parseArgs()

  backfillWorkspaces(options)
    .then((results) => {
      if (results.totalErrors > 0) {
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}

export { backfillWorkspaces }
export type { BackfillOptions }
