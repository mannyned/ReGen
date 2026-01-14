require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAiImpact() {
  const posts = await prisma.outboundPost.findMany({
    where: { status: 'POSTED' },
    select: {
      id: true,
      provider: true,
      metadata: true,
      contentUpload: {
        select: {
          id: true,
          generatedCaptions: true,
        }
      }
    }
  });

  console.log('Total POSTED posts:', posts.length);
  console.log('');

  let withContentUpload = 0;
  let withGeneratedCaptions = 0;
  let withoutContentUpload = 0;

  const aiPosts = [];
  const manualPosts = [];

  for (const post of posts) {
    if (post.contentUpload) {
      withContentUpload++;
      const generatedCaptions = post.contentUpload.generatedCaptions;

      // generatedCaptions is an object with platform keys: { instagram: {...}, facebook: {...} }
      const hasAi = generatedCaptions && typeof generatedCaptions === 'object' && !Array.isArray(generatedCaptions) && Object.keys(generatedCaptions).length > 0;

      if (hasAi) {
        withGeneratedCaptions++;
        const platforms = Object.keys(generatedCaptions);
        const platformCaption = generatedCaptions[post.provider] || generatedCaptions[platforms[0]];
        aiPosts.push({
          id: post.id,
          provider: post.provider,
          platforms: platforms,
          usageMode: platformCaption?.usageMode || 'unknown',
        });
      } else {
        manualPosts.push({
          id: post.id,
          provider: post.provider,
          hasContentUpload: true,
          generatedCaptions: generatedCaptions,
        });
      }
    } else {
      withoutContentUpload++;
      manualPosts.push({
        id: post.id,
        provider: post.provider,
        hasContentUpload: false,
      });
    }
  }

  console.log('=== CONTENT UPLOAD STATS ===');
  console.log('Posts with contentUpload:', withContentUpload);
  console.log('Posts with generatedCaptions:', withGeneratedCaptions);
  console.log('Posts without contentUpload:', withoutContentUpload);
  console.log('');

  console.log('=== AI CAPTION POSTS ===');
  console.log('Count:', aiPosts.length);
  if (aiPosts.length > 0) {
    console.log('Sample:', JSON.stringify(aiPosts.slice(0, 5), null, 2));
  }
  console.log('');

  console.log('=== MANUAL/NO-AI POSTS ===');
  console.log('Count:', manualPosts.length);
  console.log('- With contentUpload but no AI captions:', manualPosts.filter(p => p.hasContentUpload).length);
  console.log('- Without contentUpload:', manualPosts.filter(p => !p.hasContentUpload).length);

  // Check what's in generatedCaptions for posts that have contentUpload but no AI captions
  const withContentUploadNoAi = manualPosts.filter(p => p.hasContentUpload);
  if (withContentUploadNoAi.length > 0) {
    console.log('');
    console.log('Sample posts with contentUpload but no AI captions:');
    console.log(JSON.stringify(withContentUploadNoAi.slice(0, 3), null, 2));
  }

  await prisma.$disconnect();
}

checkAiImpact().catch(console.error);
