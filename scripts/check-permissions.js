require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

// Decrypt function (same as TokenManager)
function decrypt(encryptedText) {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) return null;
  try {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const keyBuffer = Buffer.from(key, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return null;
  }
}

async function checkPermissions() {
  // Debug encryption key
  const encKey = process.env.TOKEN_ENCRYPTION_KEY;
  console.log('TOKEN_ENCRYPTION_KEY set:', encKey ? 'Yes' : 'No');
  console.log('KEY length:', encKey ? encKey.length : 0);
  console.log('');

  const connections = await prisma.oAuthConnection.findMany({
    where: {
      provider: { in: ['meta', 'instagram', 'facebook'] }
    },
    select: {
      provider: true,
      providerAccountId: true,
      accessTokenEnc: true,
      expiresAt: true,
      createdAt: true,
      profile: { select: { email: true } }
    }
  });

  console.log('Found', connections.length, 'Meta/Instagram connections');

  for (const conn of connections) {
    console.log('');
    console.log('---');
    console.log('Provider:', conn.provider);
    console.log('Account ID:', conn.providerAccountId);
    console.log('Profile:', conn.profile?.email);
    console.log('Created:', conn.createdAt);
    console.log('Expires:', conn.expiresAt);
    console.log('Token length:', conn.accessTokenEnc ? conn.accessTokenEnc.length : 0);

    if (!conn.accessTokenEnc) {
      console.log('No token stored');
      continue;
    }

    const token = decrypt(conn.accessTokenEnc);
    if (!token) {
      console.log('Could not decrypt token');
      console.log('Token preview:', conn.accessTokenEnc.slice(0, 60) + '...');
      continue;
    }

    console.log('Token decrypted successfully, length:', token.length);

    console.log('');
    console.log('=== ' + conn.provider.toUpperCase() + ' ===');
    console.log('Profile:', conn.profile?.email);
    console.log('Expires:', conn.expiresAt);

    // Check permissions via Meta API
    const url = 'https://graph.facebook.com/v21.0/me/permissions?access_token=' + token;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      console.log('API Error:', data.error.message);
    } else if (data.data) {
      const granted = data.data.filter(p => p.status === 'granted').map(p => p.permission);
      const declined = data.data.filter(p => p.status === 'declined').map(p => p.permission);

      console.log('');
      console.log('GRANTED permissions:', granted.length);
      granted.forEach(p => console.log('  +', p));

      if (declined.length > 0) {
        console.log('');
        console.log('DECLINED permissions:', declined.length);
        declined.forEach(p => console.log('  -', p));
      }

      // Check for key permissions
      console.log('');
      console.log('=== KEY PERMISSIONS CHECK ===');
      console.log('instagram_manage_insights:', granted.includes('instagram_manage_insights') ? 'YES' : 'NO');
      console.log('pages_read_engagement:', granted.includes('pages_read_engagement') ? 'YES' : 'NO');
      console.log('instagram_basic:', granted.includes('instagram_basic') ? 'YES' : 'NO');
      console.log('instagram_content_publish:', granted.includes('instagram_content_publish') ? 'YES' : 'NO');
    }
  }

  await prisma.$disconnect();
}

checkPermissions().catch(console.error);
