# Input Validation with Zod

ReGenr uses [Zod](https://zod.dev) for runtime validation of API inputs.

## Quick Start

### Basic Validation

```typescript
import { validateBody, z } from '@/lib/api';

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(10000),
  tags: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  // Throws ValidationError if invalid
  const data = await validateBody(request, createPostSchema);

  // data is typed as { title: string; content: string; tags?: string[] }
  return NextResponse.json({ id: '123', ...data });
}
```

### With Handler Wrapper

```typescript
import { createValidatedHandler, z, successResponse } from '@/lib/api';

const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
});

export const POST = createValidatedHandler(
  async (request, context, { body, user }) => {
    // body is validated and typed
    // user is authenticated (if auth: true)
    const post = await prisma.post.create({
      data: { ...body, profileId: user.profileId },
    });
    return successResponse(post);
  },
  { auth: true, body: createPostSchema }
);
```

## Common Schemas

Import pre-built schemas for common validation patterns:

```typescript
import {
  // Primitives
  emailSchema,          // Valid email, lowercased
  passwordSchema,       // 8+ chars, upper/lower/number
  uuidSchema,           // UUID v4 format
  urlSchema,            // Valid URL

  // Pagination
  paginationSchema,     // { page, limit }
  cursorPaginationSchema, // { cursor, limit }

  // Auth
  signUpSchema,         // { email, password, name? }
  signInSchema,         // { email, password }

  // Content
  titleSchema,          // 1-200 chars
  captionSchema,        // Max 2200 chars (Instagram limit)
  hashtagsSchema,       // Array of hashtags

  // Platform
  platformSchema,       // 'instagram' | 'facebook' | ...
  tierSchema,           // 'FREE' | 'CREATOR' | 'PRO'
} from '@/lib/validation';
```

## Validation Functions

### validateBody

Validate JSON request body:

```typescript
import { validateBody } from '@/lib/validation';

const schema = z.object({ name: z.string() });

export async function POST(request: NextRequest) {
  const data = await validateBody(request, schema);
  // data.name is string
}
```

### validateQuery

Validate URL query parameters:

```typescript
import { validateQuery, paginationSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  // ?page=2&limit=20
  const { page, limit } = validateQuery(request, paginationSchema);
  // page = 2, limit = 20 (with defaults)
}
```

### validateParams

Validate path parameters:

```typescript
import { validateParams, idParamSchema } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await validateParams(params, idParamSchema);
  // id is validated UUID
}
```

## Handler Wrappers

### createValidatedHandler

Full-featured handler with validation:

```typescript
import { createValidatedHandler, z } from '@/lib/api';

const bodySchema = z.object({
  title: z.string(),
});

const querySchema = z.object({
  draft: z.coerce.boolean().default(false),
});

export const POST = createValidatedHandler(
  async (request, context, { body, query, user }) => {
    // body: { title: string }
    // query: { draft: boolean }
    // user: VerifiedIdentity (if auth: true)
    return NextResponse.json({ success: true });
  },
  {
    auth: true,
    body: bodySchema,
    query: querySchema,
    rateLimit: true,
  }
);
```

### validatedAuthHandler

Shorthand for authenticated + body validation:

```typescript
import { validatedAuthHandler, z } from '@/lib/api';

const schema = z.object({
  content: z.string().min(1),
});

export const POST = validatedAuthHandler(schema, async (request, context, { body, user }) => {
  // body and user are both available
  return NextResponse.json({ userId: user.profileId, content: body.content });
});
```

### validatedPublicHandler

Shorthand for public + body validation:

```typescript
import { validatedPublicHandler, z } from '@/lib/api';

const schema = z.object({
  email: z.string().email(),
});

export const POST = validatedPublicHandler(schema, async (request, context, body) => {
  // body.email is validated
  return NextResponse.json({ subscribed: true });
});
```

## Validation Error Response

When validation fails, a 400 response is returned:

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "timestamp": "2024-01-15T10:30:45.000Z",
  "fields": {
    "email": "Invalid email address",
    "password": "Password must be at least 8 characters",
    "tags.2": "Invalid hashtag format"
  }
}
```

## Schema Patterns

### Optional with Default

```typescript
const schema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});
```

### Transform Input

```typescript
const schema = z.object({
  email: z.string().email().transform(e => e.toLowerCase()),
  tags: z.string().transform(s => s.split(',').map(t => t.trim())),
});
```

### Conditional Validation

```typescript
const schema = z.object({
  type: z.enum(['email', 'sms']),
  email: z.string().email().optional(),
  phone: z.string().optional(),
}).refine(
  (data) => {
    if (data.type === 'email') return !!data.email;
    if (data.type === 'sms') return !!data.phone;
    return true;
  },
  { message: 'Email or phone required based on type' }
);
```

### Nested Objects

```typescript
const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zip: z.string().regex(/^\d{5}$/),
});

const userSchema = z.object({
  name: z.string(),
  address: addressSchema.optional(),
});
```

### Arrays

```typescript
const schema = z.object({
  // Array of strings
  tags: z.array(z.string()).min(1).max(10),

  // Array of objects
  items: z.array(z.object({
    id: z.string().uuid(),
    quantity: z.number().positive(),
  })),
});
```

### Union Types

```typescript
const schema = z.object({
  // String or number
  id: z.union([z.string(), z.number()]),

  // Discriminated union
  notification: z.discriminatedUnion('type', [
    z.object({ type: z.literal('email'), email: z.string().email() }),
    z.object({ type: z.literal('sms'), phone: z.string() }),
  ]),
});
```

## Custom Schema Helpers

### booleanFromString

Parse string 'true'/'false' to boolean:

```typescript
import { booleanFromString } from '@/lib/validation';

const schema = z.object({
  published: booleanFromString, // "true" -> true
});
```

### arrayFromString

Parse comma-separated string to array:

```typescript
import { arrayFromString } from '@/lib/validation';

const schema = z.object({
  tags: arrayFromString(z.string()), // "a,b,c" -> ["a", "b", "c"]
});
```

### jsonString

Parse JSON string to object:

```typescript
import { jsonString } from '@/lib/validation';

const metadataSchema = z.object({ key: z.string() });

const schema = z.object({
  metadata: jsonString(metadataSchema), // '{"key":"value"}' -> { key: "value" }
});
```

### partialUpdate

Make all fields optional for PATCH:

```typescript
import { partialUpdate } from '@/lib/validation';

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

const updateSchema = partialUpdate(userSchema);
// At least one field required, all optional
```

## Complete Example

```typescript
// app/api/posts/route.ts
import {
  createValidatedHandler,
  validatedAuthHandler,
  successResponse,
  createdResponse,
  z,
} from '@/lib/api';
import {
  paginationSchema,
  titleSchema,
  captionSchema,
  platformSchema,
  futureDateSchema,
} from '@/lib/validation';
import { prisma } from '@/lib/db';

// GET /api/posts - List posts with pagination
const listQuerySchema = paginationSchema.extend({
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
});

export const GET = createValidatedHandler(
  async (request, context, { query, user }) => {
    const { page, limit, status } = query;

    const posts = await prisma.post.findMany({
      where: {
        profileId: user!.profileId,
        ...(status && { status }),
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ posts, page, limit });
  },
  { auth: true, query: listQuerySchema }
);

// POST /api/posts - Create post
const createPostSchema = z.object({
  title: titleSchema,
  content: captionSchema,
  platforms: z.array(platformSchema).min(1),
  scheduledAt: futureDateSchema.optional(),
  tags: z.array(z.string()).max(30).optional(),
});

export const POST = validatedAuthHandler(
  createPostSchema,
  async (request, context, { body, user }) => {
    const post = await prisma.post.create({
      data: {
        profileId: user.profileId,
        title: body.title,
        content: body.content,
        platforms: body.platforms,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        tags: body.tags || [],
        status: body.scheduledAt ? 'scheduled' : 'draft',
      },
    });

    return createdResponse({ post });
  }
);
```

## Module Structure

```
lib/validation/
├── index.ts      # Public exports
├── schemas.ts    # Common schemas
└── validate.ts   # Validation utilities
```

## Best Practices

1. **Define schemas in separate files** for reuse
2. **Use common schemas** instead of redefining
3. **Transform inputs** (lowercase emails, trim strings)
4. **Provide helpful error messages**
5. **Use coerce** for query params (strings by default)
6. **Validate early** - fail fast on bad input
