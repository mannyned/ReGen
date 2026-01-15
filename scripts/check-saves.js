require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Get posts that have analytics data
  const posts = await prisma.outboundPost.findMany({
    where: { status: 'POSTED' },
    select: {
      id: true,
      provider: true,
      metadata: true,
    }
  });

  // Filter to only posts with analytics
  const postsWithAnalytics = posts.filter(p => {
    const analytics = p.metadata?.analytics;
    return analytics && Object.keys(analytics).length > 0;
  });

  console.log('Posts with analytics data:', postsWithAnalytics.length);
  console.log('');
  console.log('Sample posts with analytics:');
  for (const post of postsWithAnalytics.slice(0, 5)) {
    const analytics = post.metadata?.analytics || {};
    console.log('---');
    console.log('Provider:', post.provider);
    console.log('Analytics:', JSON.stringify(analytics, null, 2));
  }

  // Count total saves across all posts
  const allPosts = await prisma.outboundPost.findMany({
    where: { status: 'POSTED' },
    select: { metadata: true, provider: true }
  });

  let totalSaves = 0;
  let totalReach = 0;
  let totalLikes = 0;
  let postsWithSavesCount = 0;
  let postsWithAnalyticsCount = 0;

  for (const p of allPosts) {
    const a = p.metadata?.analytics || {};
    if (Object.keys(a).length > 0) postsWithAnalyticsCount++;
    const saves = a.saved || a.saves || 0;
    const reach = a.reach || 0;
    const likes = a.likes || 0;
    if (saves > 0) postsWithSavesCount++;
    totalSaves += saves;
    totalReach += reach;
    totalLikes += likes;
  }

  console.log('');
  console.log('=== TOTALS ===');
  console.log('Total posts:', allPosts.length);
  console.log('Posts with analytics:', postsWithAnalyticsCount);
  console.log('Posts with saves > 0:', postsWithSavesCount);
  console.log('Total saves:', totalSaves);
  console.log('Total reach:', totalReach);
  console.log('Total likes:', totalLikes);

  await prisma.$disconnect();
}

check().catch(console.error);
