# Logging and Error Handling

ReGenr provides structured logging and comprehensive error handling utilities.

## Logging

### Quick Start

```typescript
import { logger, info, warn, error } from '@/lib/logger';

// Simple logging
info('User signed up');
warn('Rate limit approaching');
error('Payment failed');

// With context
logger.info('User action', {
  userId: 'user_123',
  action: 'upload',
  fileSize: 1024,
});

// Log errors with stack trace
logger.logError('Database query failed', err, {
  query: 'SELECT * FROM users',
});
```

### Log Levels

| Level | Use Case | Method |
|-------|----------|--------|
| `debug` | Development debugging | `logger.debug()` |
| `info` | Normal operations | `logger.info()` |
| `warn` | Potential issues | `logger.warn()` |
| `error` | Errors and failures | `logger.error()` |

### Output Formats

**Development** (pretty):
```
10:30:45 INFO  User signed up {"userId":"user_123"}
10:30:46 ERROR Payment failed
  Error: Insufficient funds
    at processPayment (/app/lib/payment.ts:45:11)
```

**Production** (JSON):
```json
{"level":"info","message":"User signed up","timestamp":"2024-01-15T10:30:45.000Z","service":"regenr","userId":"user_123"}
```

### Request Logging

```typescript
import { createRequestLogger, generateRequestId } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const log = createRequestLogger(requestId, {
    path: '/api/upload',
    method: 'POST',
  });

  log.info('Processing upload');
  // ... handle request
  log.info('Upload complete', { fileId: 'file_123' });
}
```

### Configuration

```bash
# .env.local
LOG_LEVEL=debug          # debug | info | warn | error
SERVICE_NAME=regenr      # Service identifier in logs
```

## Error Handling

### Error Classes

```typescript
import {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  TierRequiredError,
  NotFoundError,
  ValidationError,
  BadRequestError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
} from '@/lib/errors';

// Authentication error (401)
throw new UnauthorizedError('Invalid token');

// Authorization error (403)
throw new ForbiddenError('Access denied');

// Tier requirement (403)
throw new TierRequiredError('CREATOR', user.tier);

// Not found (404)
throw new NotFoundError('User');

// Validation error (400)
throw new ValidationError('Invalid input', {
  email: 'Invalid email format',
  password: 'Must be at least 8 characters',
});

// Bad request (400)
throw new BadRequestError('Missing required field');

// Conflict (409)
throw new ConflictError('Email already registered');

// Rate limit (429)
throw new RateLimitError(60, 100); // retry after 60s, limit was 100

// Database error (500)
throw new DatabaseError('Connection failed');

// External service (502)
throw new ExternalServiceError('Stripe', 'Payment processing failed');
```

### Error Codes

```typescript
import { ErrorCode } from '@/lib/errors';

// Available error codes
ErrorCode.UNAUTHORIZED       // 401
ErrorCode.FORBIDDEN          // 403
ErrorCode.TIER_REQUIRED      // 403
ErrorCode.NOT_FOUND          // 404
ErrorCode.VALIDATION_ERROR   // 400
ErrorCode.RATE_LIMIT_EXCEEDED // 429
ErrorCode.INTERNAL_ERROR     // 500
// ... and more
```

### Error Response Format

All errors return consistent JSON:

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "timestamp": "2024-01-15T10:30:45.000Z",
  "fields": {
    "email": "Invalid email format"
  }
}
```

### Error Handling in Routes

```typescript
import { handleError, withErrorHandler } from '@/lib/errors';

// Manual error handling
export async function POST(request: NextRequest) {
  try {
    // ... handle request
  } catch (error) {
    return handleError(error);
  }
}

// Automatic error handling wrapper
export const POST = withErrorHandler(async (request) => {
  // Errors are automatically caught and converted to responses
  throw new ValidationError('Invalid input');
});
```

## API Handler Utilities

### createHandler

The recommended way to create API routes with built-in logging, error handling, auth, and rate limiting:

```typescript
import { createHandler } from '@/lib/api';

// Simple public endpoint
export const GET = createHandler(async (request) => {
  return NextResponse.json({ status: 'ok' });
});

// Authenticated endpoint
export const POST = createHandler(
  async (request, context, user) => {
    // user is verified identity
    return NextResponse.json({ userId: user.profileId });
  },
  { auth: true }
);

// With rate limiting
export const POST = createHandler(
  async (request, context, user) => {
    return NextResponse.json({ success: true });
  },
  { auth: true, rateLimit: true }
);

// Tier-restricted
export const POST = createHandler(
  async (request, context, user) => {
    // Only CREATOR+ can access
    return NextResponse.json({ premium: true });
  },
  { requiredTier: 'CREATOR' }
);
```

### Convenience Handlers

```typescript
import {
  publicHandler,
  authHandler,
  rateLimitedHandler,
  tierHandler,
} from '@/lib/api';

// Public (no auth)
export const GET = publicHandler(async (request) => {
  return NextResponse.json({ public: true });
});

// Authenticated
export const GET = authHandler(async (request, context, user) => {
  return NextResponse.json({ userId: user.profileId });
});

// Authenticated + rate limited
export const POST = rateLimitedHandler(async (request, context, user) => {
  return NextResponse.json({ success: true });
});

// Tier restricted (includes auth + rate limit)
export const POST = tierHandler('PRO', async (request, context, user) => {
  return NextResponse.json({ pro: true });
});
```

### Request Parsing Helpers

```typescript
import {
  parseBody,
  requireBody,
  getParam,
  requireParam,
} from '@/lib/api';

export const POST = authHandler(async (request, context, user) => {
  // Parse JSON body (returns null if invalid)
  const body = await parseBody<{ name: string }>(request);

  // Or require body (throws BadRequestError if invalid)
  const data = await requireBody<{ name: string }>(request);

  // Get path parameter (returns undefined if missing)
  const id = await getParam(context, 'id');

  // Or require parameter (throws BadRequestError if missing)
  const userId = await requireParam(context, 'userId');

  return NextResponse.json({ success: true });
});
```

### Response Helpers

```typescript
import {
  successResponse,
  createdResponse,
  noContentResponse,
  errorResponse,
} from '@/lib/api';

// 200 OK
return successResponse({ data: result });

// 201 Created
return createdResponse({ id: newId });

// 204 No Content
return noContentResponse();

// Custom error
return errorResponse('Something went wrong', ErrorCode.INTERNAL_ERROR, 500);
```

## Handler Options

```typescript
interface HandlerOptions {
  // Enable request/response logging (default: true)
  logging?: boolean;

  // Enable automatic error handling (default: true)
  errorHandling?: boolean;

  // Require authentication (default: false)
  auth?: boolean;

  // Required tier (implies auth: true)
  requiredTier?: 'FREE' | 'CREATOR' | 'PRO';

  // Enable rate limiting (default: false)
  // true = use default tier limits
  // TierRateLimits = custom limits
  rateLimit?: boolean | TierRateLimits;

  // Skip logging for these status codes (default: [404])
  skipLogStatuses?: number[];
}
```

## Complete Example

```typescript
// app/api/posts/route.ts
import { createHandler, requireBody, successResponse, createdResponse } from '@/lib/api';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { prisma } from '@/lib/db';

// GET /api/posts - List user's posts
export const GET = createHandler(
  async (request, context, user) => {
    const posts = await prisma.post.findMany({
      where: { profileId: user.profileId },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ posts });
  },
  { auth: true }
);

// POST /api/posts - Create a post
export const POST = createHandler(
  async (request, context, user) => {
    const { title, content } = await requireBody<{
      title: string;
      content: string;
    }>(request);

    // Validate
    if (!title || title.length < 3) {
      throw new ValidationError('Invalid post', {
        title: 'Title must be at least 3 characters',
      });
    }

    // Create post
    const post = await prisma.post.create({
      data: {
        profileId: user.profileId,
        title,
        content,
      },
    });

    return createdResponse({ post });
  },
  { auth: true, rateLimit: true }
);
```

```typescript
// app/api/posts/[id]/route.ts
import { createHandler, requireParam, successResponse, noContentResponse } from '@/lib/api';
import { NotFoundError, ForbiddenError } from '@/lib/errors';
import { prisma } from '@/lib/db';

// GET /api/posts/:id
export const GET = createHandler(
  async (request, context, user) => {
    const id = await requireParam(context, 'id');

    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundError('Post');
    }

    if (post.profileId !== user.profileId) {
      throw new ForbiddenError('You do not own this post');
    }

    return successResponse({ post });
  },
  { auth: true }
);

// DELETE /api/posts/:id
export const DELETE = createHandler(
  async (request, context, user) => {
    const id = await requireParam(context, 'id');

    const result = await prisma.post.deleteMany({
      where: {
        id,
        profileId: user.profileId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundError('Post');
    }

    return noContentResponse();
  },
  { auth: true }
);
```

## Request Flow

```
Request
   ↓
createHandler
   ↓
Generate Request ID
   ↓
Log: "POST /api/posts"
   ↓
Authentication (if required)
   ↓
Tier Check (if required)
   ↓
Rate Limit Check (if enabled)
   ↓
Execute Handler
   ↓
Catch Errors → handleError()
   ↓
Log: "POST /api/posts 201 (45ms)"
   ↓
Response (with X-Request-Id header)
```

## Module Structure

```
lib/
├── logger/
│   └── index.ts        # Logging utilities
├── errors/
│   └── index.ts        # Error classes and handling
└── api/
    ├── index.ts        # Public exports
    └── handler.ts      # Handler utilities
```
