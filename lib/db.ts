/**
 * Prisma Database Client
 *
 * Singleton pattern for Prisma client to prevent connection exhaustion.
 *
 * Why this pattern?
 * - Next.js hot-reloading creates new modules on each change
 * - Without caching, each reload creates a new Prisma client
 * - This leads to connection pool exhaustion in development
 * - Production builds don't have this issue, but pattern works for both
 */

import { PrismaClient } from '@prisma/client';

// Extend global type to include prisma
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Create Prisma client with logging configuration
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
}

/**
 * Cached Prisma client instance
 *
 * In development: Reuse client across hot reloads via global
 * In production: Create single instance per server start
 */
export const prisma = global.prisma ?? createPrismaClient();

// Cache in global for development hot reloading
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
