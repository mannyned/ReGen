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

  let aiCount = 0;
  let manualCount = 0;
  const aiPosts = [];
  const manualPosts = [];

  for (const post of posts) {
    const generatedCaptions = post.contentUpload?.generatedCaptions;
    const metadata = post.metadata;

    // Check if post has AI-generated captions:
    // 1. contentUpload with generatedCaptions object (went through Upload flow)
    // 2. OR has caption in metadata (published via generate-caption API without Upload flow)
    const hasContentUploadAi = generatedCaptions && typeof generatedCaptions === 'object' && !Array.isArray(generatedCaptions) && Object.keys(generatedCaptions).length > 0;
    const hasMetadataCaption = metadata && metadata.caption;
    const hasAiCaption = hasContentUploadAi || hasMetadataCaption;

    if (hasAiCaption) {
      aiCount++;
      let source = 'unknown';
      let usageMode = null;

      if (hasContentUploadAi) {
        source = 'contentUpload';
        const platforms = Object.keys(generatedCaptions);
        const platformCaption = generatedCaptions[post.provider] || generatedCaptions[platforms[0]];
        usageMode = platformCaption?.usageMode;
      } else if (hasMetadataCaption) {
        source = 'metadata';
      }

      aiPosts.push({
        id: post.id,
        provider: post.provider,
        source,
        usageMode,
      });
    } else {
      manualCount++;
      manualPosts.push({
        id: post.id,
        provider: post.provider,
      });
    }
  }

  console.log('=== UPDATED AI IMPACT COUNTS ===');
  console.log('AI Captions:', aiCount);
  console.log('Manual Captions:', manualCount);
  console.log('');

  console.log('=== AI POSTS BREAKDOWN ===');
  const fromContentUpload = aiPosts.filter(p => p.source === 'contentUpload').length;
  const fromMetadata = aiPosts.filter(p => p.source === 'metadata').length;
  console.log('From contentUpload (Upload flow):', fromContentUpload);
  console.log('From metadata caption (Direct publish):', fromMetadata);
  console.log('');

  if (aiPosts.length > 0) {
    console.log('Sample AI posts:', JSON.stringify(aiPosts.slice(0, 5), null, 2));
  }

  if (manualPosts.length > 0) {
    console.log('');
    console.log('Manual posts:', JSON.stringify(manualPosts, null, 2));
  }

  await prisma.$disconnect();
}

checkAiImpact().catch(console.error);
