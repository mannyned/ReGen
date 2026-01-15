require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDrafts() {
  // Get all profiles
  const profiles = await prisma.profile.findMany({ select: { id: true, email: true } });

  for (const profile of profiles) {
    console.log('Profile:', profile.email || profile.id);

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

    // Get draft uploads
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
        createdAt: true,
      },
    });

    // Filter by URL match
    const filteredDrafts = draftUploads.filter(u => {
      if (!u.thumbnailUrl) return true;
      return !publishedMediaUrls.includes(u.thumbnailUrl);
    });

    console.log('Total content uploads with READY status:', await prisma.contentUpload.count({ where: { profileId: profile.id, status: 'READY' } }));
    console.log('Published posts:', publishedPosts.length);
    console.log('Linked content upload IDs:', linkedIds.length);
    console.log('Draft uploads (after filtering):', filteredDrafts.length);

    if (filteredDrafts.length > 0) {
      console.log('Draft files:');
      filteredDrafts.forEach(d => console.log('  -', d.fileName, '(created:', d.createdAt.toISOString().split('T')[0] + ')'));
    }
    console.log('');
  }

  await prisma.$disconnect();
}

checkDrafts().catch(console.error);
