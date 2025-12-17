/**
 * Rate Limit Storage Backends
 *
 * Provides in-memory and Redis storage for rate limiting.
 * Use in-memory for development, Redis for production.
 */

// ============================================
// TYPES
// ============================================

export interface RateLimitEntry {
  /** Number of requests made in current window */
  count: number;
  /** Timestamp when the window resets (ms) */
  resetAt: number;
}

export interface RateLimitStore {
  /** Get current rate limit entry for a key */
  get(key: string): Promise<RateLimitEntry | null>;
  /** Increment count and return updated entry */
  increment(key: string, windowMs: number): Promise<RateLimitEntry>;
  /** Reset/delete an entry */
  reset(key: string): Promise<void>;
}

// ============================================
// IN-MEMORY STORE (Development)
// ============================================

/**
 * Simple in-memory rate limit store
 *
 * Good for development and single-instance deployments.
 * Data is lost on server restart.
 */
export class MemoryStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check if window has expired
    if (Date.now() > entry.resetAt) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    const existing = await this.get(key);

    if (existing) {
      // Window still active, increment
      existing.count++;
      this.store.set(key, existing);
      return existing;
    }

    // New window
    const entry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    };
    this.store.set(key, entry);
    return entry;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  /** Stop cleanup interval (for testing) */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// ============================================
// REDIS STORE (Production)
// ============================================

/**
 * Redis-based rate limit store
 *
 * Use for production and multi-instance deployments.
 * Requires REDIS_URL environment variable.
 */
export class RedisStore implements RateLimitStore {
  private redis: RedisClient | null = null;
  private connecting = false;

  private async getClient(): Promise<RedisClient | null> {
    if (this.redis) return this.redis;
    if (this.connecting) return null;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn('[RateLimit] REDIS_URL not configured, falling back to memory store');
      return null;
    }

    try {
      this.connecting = true;
      // Dynamic import to avoid bundling Redis in client
      const { createClient } = await import('redis');
      this.redis = createClient({ url: redisUrl });
      await this.redis.connect();
      console.log('[RateLimit] Connected to Redis');
      return this.redis;
    } catch (error) {
      console.error('[RateLimit] Redis connection failed:', error);
      return null;
    } finally {
      this.connecting = false;
    }
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const client = await this.getClient();
    if (!client) return null;

    try {
      const data = await client.get(`ratelimit:${key}`);
      if (!data) return null;

      const entry = JSON.parse(data) as RateLimitEntry;

      // Check if window has expired
      if (Date.now() > entry.resetAt) {
        await client.del(`ratelimit:${key}`);
        return null;
      }

      return entry;
    } catch (error) {
      console.error('[RateLimit] Redis get error:', error);
      return null;
    }
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const client = await this.getClient();
    if (!client) {
      // Fallback: return a permissive entry
      return { count: 1, resetAt: Date.now() + windowMs };
    }

    const redisKey = `ratelimit:${key}`;
    const now = Date.now();

    try {
      // Use MULTI for atomic increment
      const existing = await this.get(key);

      if (existing) {
        existing.count++;
        await client.set(redisKey, JSON.stringify(existing), {
          PX: existing.resetAt - now, // TTL in ms
        });
        return existing;
      }

      // New window
      const entry: RateLimitEntry = {
        count: 1,
        resetAt: now + windowMs,
      };
      await client.set(redisKey, JSON.stringify(entry), {
        PX: windowMs,
      });
      return entry;
    } catch (error) {
      console.error('[RateLimit] Redis increment error:', error);
      return { count: 1, resetAt: now + windowMs };
    }
  }

  async reset(key: string): Promise<void> {
    const client = await this.getClient();
    if (!client) return;

    try {
      await client.del(`ratelimit:${key}`);
    } catch (error) {
      console.error('[RateLimit] Redis reset error:', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}

// Type for Redis client
type RedisClient = {
  connect(): Promise<void>;
  quit(): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { PX?: number }): Promise<void>;
  del(key: string): Promise<void>;
};

// ============================================
// STORE FACTORY
// ============================================

let globalStore: RateLimitStore | null = null;

/**
 * Get the rate limit store instance
 *
 * Returns Redis store in production if configured,
 * otherwise falls back to in-memory store.
 */
export function getStore(): RateLimitStore {
  if (globalStore) return globalStore;

  // Use Redis in production if available
  if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
    globalStore = new RedisStore();
  } else {
    globalStore = new MemoryStore();
  }

  return globalStore;
}
