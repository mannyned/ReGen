/**
 * Cleanup script to delete orphaned content uploads (drafts)
 *
 * Usage:
 *   node scripts/cleanup-drafts.js          # Dry run - shows what would be deleted
 *   node scripts/cleanup-drafts.js --delete # Actually delete the drafts
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const prisma = new PrismaClient();

// Initialize Supabase client for storage cleanup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const STORAGE_BUCKET = 'content-uploads';

// Helper to extract storage path from a Supabase public URL
function extractStoragePath(publicUrl) {
  if (!publicUrl) return null;
  // URL format: https://xxx.supabase.co/storage/v1/object/public/content-uploads/path/to/file
  const match = publicUrl.match(/\/content-uploads\/(.+)$/);
  return match ? match[1] : null;
}

async function cleanupDrafts() {
  const isDryRun = !process.argv.includes('--delete');

  if (isDryRun) {
    console.log('=== DRY RUN MODE ===');
    console.log('This will show what would be deleted. Run with --delete to actually delete.\n');
  } else {
    console.log('=== DELETE MODE ===');
    console.log('This will permanently delete orphaned drafts!\n');
  }

  // Get all profiles
  const profiles = await prisma.profile.findMany({ select: { id: true, email: true } });

  let totalDeleted = 0;
  let totalStorageDeleted = 0;

  for (const profile of profiles) {
    console.log(`\nProfile: ${profile.email || profile.id}`);
    console.log('-'.repeat(50));

    // Get published posts to exclude
    const publishedPosts = await prisma.outboundPost.findMany({
      where: {
        profileId: profile.id,
        status: { in: ['POSTED', 'QUEUED', 'PROCESSING'] },
      },
      select: {
        contentUploadId: true,
        metadata: true,
      },
    });

    const linkedIds = publishedPosts
      .filter(p => p.contentUploadId)
      .map(p => p.contentUploadId);

    const publishedMediaUrls = publishedPosts
      .map(p => p.metadata?.mediaUrl)
      .filter(url => url);

    // Get draft uploads (orphaned content)
    const draftUploads = await prisma.contentUpload.findMany({
      where: {
        profileId: profile.id,
        status: 'READY',
        id: { notIn: linkedIds.length > 0 ? linkedIds : ['__none__'] },
        scheduledPosts: { none: {} },
        outboundPosts: { none: {} },
        tiktokPosts: { none: {} },
      },
      select: {
        id: true,
        fileName: true,
        thumbnailUrl: true,
        processedUrls: true,
        createdAt: true,
      },
    });

    // Filter by URL match (exclude content that was published but not linked)
    const draftsToDelete = draftUploads.filter(u => {
      if (!u.thumbnailUrl) return true;
      return !publishedMediaUrls.includes(u.thumbnailUrl);
    });

    if (draftsToDelete.length === 0) {
      console.log('No orphaned drafts found.');
      continue;
    }

    console.log(`Found ${draftsToDelete.length} orphaned drafts to delete:`);

    for (const draft of draftsToDelete) {
      console.log(`  - ${draft.fileName} (${draft.createdAt.toISOString().split('T')[0]})`);

      if (!isDryRun) {
        // Try to delete processed files from storage
        const processedUrls = draft.processedUrls;
        if (supabase && processedUrls?.files) {
          for (const file of processedUrls.files) {
            // Extract storage path from URL if available
            const storagePath = file.storagePath || extractStoragePath(file.publicUrl);
            if (storagePath) {
              try {
                await supabase.storage
                  .from(STORAGE_BUCKET)
                  .remove([storagePath]);
                totalStorageDeleted++;
              } catch (err) {
                // Ignore storage errors
              }
            }
          }
        }

        // Delete the database record
        try {
          await prisma.contentUpload.delete({
            where: { id: draft.id },
          });
          totalDeleted++;
        } catch (err) {
          console.log(`    DB delete failed: ${err.message}`);
        }
      }
    }

    if (isDryRun) {
      console.log(`\nWould delete ${draftsToDelete.length} drafts from this profile.`);
    } else {
      console.log(`\nDeleted ${draftsToDelete.length} drafts from this profile.`);
    }
  }

  console.log('\n' + '='.repeat(50));
  if (isDryRun) {
    console.log('DRY RUN COMPLETE');
    console.log('Run with --delete flag to actually delete these drafts.');
  } else {
    console.log('CLEANUP COMPLETE');
    console.log(`Total database records deleted: ${totalDeleted}`);
    console.log(`Total storage files deleted: ${totalStorageDeleted}`);
  }

  await prisma.$disconnect();
}

cleanupDrafts().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
