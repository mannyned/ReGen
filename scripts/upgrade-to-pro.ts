/**
 * Upgrade a user to PRO tier
 *
 * Usage: npx ts-node scripts/upgrade-to-pro.ts your-email@example.com
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: npx ts-node scripts/upgrade-to-pro.ts <email>');
    process.exit(1);
  }

  const profile = await prisma.profile.findUnique({
    where: { email },
  });

  if (!profile) {
    console.error(`No profile found with email: ${email}`);
    process.exit(1);
  }

  const updated = await prisma.profile.update({
    where: { email },
    data: { tier: 'PRO' },
  });

  console.log(`✅ Upgraded ${email} to PRO tier`);
  console.log(`   Previous tier: ${profile.tier}`);
  console.log(`   New tier: ${updated.tier}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
