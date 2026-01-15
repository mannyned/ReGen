require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sync() {
  // Get all posted posts with their social account info
  const posts = await prisma.outboundPost.findMany({
    where: { status: 'POSTED' },
    select: {
      id: true,
      provider: true,
      externalPostId: true,
      metadata: true,
      profile: {
        select: {
          socialAccounts: {
            select: {
              provider: true,
              accessToken: true,
              providerAccountId: true,
            }
          }
        }
      }
    }
  });

  console.log('Found', posts.length, 'posted posts to sync');

  let synced = 0;
  let failed = 0;
  let skipped = 0;

  for (const post of posts) {
    if (!post.externalPostId) {
      console.log('Skipping post', post.id.slice(0, 8), '- no externalPostId');
      skipped++;
      continue;
    }

    const account = post.profile?.socialAccounts?.find(a =>
      a.provider === post.provider ||
      (post.provider === 'meta' && a.provider === 'instagram') ||
      (post.provider === 'meta' && a.provider === 'meta')
    );

    if (!account?.accessToken) {
      console.log('Skipping post', post.id.slice(0, 8), '- no access token for provider:', post.provider);
      skipped++;
      continue;
    }

    try {
      // For Instagram/Meta posts
      if (post.provider === 'meta' || post.provider === 'instagram') {
        const mediaId = post.externalPostId;
        const url = `https://graph.facebook.com/v21.0/${mediaId}/insights?metric=impressions,reach,saved,likes,comments,shares&access_token=${account.accessToken}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.data) {
          const analytics = {};
          for (const metric of data.data) {
            analytics[metric.name] = metric.values?.[0]?.value || 0;
          }

          // Update post metadata with analytics
          const currentMetadata = post.metadata || {};
          await prisma.outboundPost.update({
            where: { id: post.id },
            data: {
              metadata: {
                ...currentMetadata,
                analytics,
                lastSyncedAt: new Date().toISOString()
              }
            }
          });

          console.log('Synced post', post.id.slice(0, 8), ':', JSON.stringify(analytics));
          synced++;
        } else if (data.error) {
          console.log('API error for post', post.id.slice(0, 8), ':', data.error.message);
          failed++;
        }
      } else {
        console.log('Skipping post', post.id.slice(0, 8), '- unsupported provider:', post.provider);
        skipped++;
      }
    } catch (err) {
      console.log('Error syncing post', post.id.slice(0, 8), ':', err.message);
      failed++;
    }
  }

  console.log('');
  console.log('=== SYNC COMPLETE ===');
  console.log('Synced:', synced);
  console.log('Failed:', failed);
  console.log('Skipped:', skipped);

  await prisma.$disconnect();
}

sync().catch(e => { console.error(e); process.exit(1); });
