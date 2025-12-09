# ReGen Backend API Reference

## Overview

ReGen's backend provides a comprehensive API for managing social media integrations across 7 platforms:
- Instagram
- TikTok
- YouTube
- Twitter/X
- LinkedIn
- Facebook
- Snapchat

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

---

## Authentication (OAuth)

### Initiate OAuth Connection

```http
GET /api/oauth/connect/{platform}
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| platform | string | Platform ID (instagram, tiktok, youtube, twitter, linkedin, facebook, snapchat) |
| userId | query | User ID for the connection |

**Response:**
```json
{
  "success": true,
  "authUrl": "https://platform.com/oauth/authorize?...",
  "platform": "instagram",
  "message": "Redirect to this URL to authorize"
}
```

### OAuth Callback

```http
GET /api/oauth/callback/{platform}
```

Handles the OAuth callback from the platform. Automatically exchanges code for tokens and redirects to settings page.

### Get Connection Status

```http
GET /api/oauth/status
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| userId | query | User ID to check connections for |

**Response:**
```json
{
  "success": true,
  "userId": "user123",
  "connectedPlatforms": [
    {
      "platform": "instagram",
      "username": "user_handle",
      "profileImageUrl": "https://...",
      "connectedAt": "2024-01-15T10:30:00Z",
      "isActive": true
    }
  ],
  "totalConnected": 1
}
```

### Disconnect Platform

```http
DELETE /api/oauth/disconnect/{platform}
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| platform | path | Platform to disconnect |
| userId | query | User ID |

**Response:**
```json
{
  "success": true,
  "platform": "instagram",
  "message": "Successfully disconnected from instagram"
}
```

---

## Content Publishing

### Publish Content

```http
POST /api/publish
```

**Request Body:**
```json
{
  "userId": "user123",
  "platforms": ["instagram", "tiktok", "youtube"],
  "content": {
    "caption": "Check out this amazing content!",
    "hashtags": ["viral", "trending", "content"],
    "mentionedUsers": ["@friend1"]
  },
  "media": {
    "mediaUrl": "https://storage.example.com/video.mp4",
    "mediaType": "video",
    "mimeType": "video/mp4",
    "fileSize": 15000000,
    "duration": 30
  },
  "platformContent": {
    "twitter": {
      "caption": "Shorter caption for Twitter!",
      "hashtags": ["viral"]
    }
  },
  "scheduleAt": "2024-01-20T15:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "scheduled": false,
  "results": {
    "instagram": {
      "success": true,
      "platformPostId": "123456789",
      "platformUrl": "https://instagram.com/p/abc123",
      "publishedAt": "2024-01-15T10:30:00Z"
    },
    "tiktok": {
      "success": true,
      "platformPostId": "987654321",
      "platformUrl": "https://tiktok.com/@user/video/987654321",
      "publishedAt": "2024-01-15T10:30:00Z"
    }
  },
  "summary": {
    "total": 3,
    "succeeded": 3,
    "failed": 0
  }
}
```

### Delete Post

```http
DELETE /api/publish
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| userId | query | User ID |
| platform | query | Platform |
| postId | query | Post ID to delete |

---

## Analytics

### Get Analytics

```http
GET /api/analytics
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| userId | query | User ID |
| platform | query | Platform (optional, omit for aggregated) |
| type | query | Analytics type: account, location, retention, save-rate, aggregated |
| postId | query | Required for retention type |
| start | query | Start date (ISO 8601) |
| end | query | End date (ISO 8601) |

**Account Analytics Response:**
```json
{
  "success": true,
  "type": "account",
  "platform": "instagram",
  "data": {
    "followers": 10500,
    "following": 250,
    "totalPosts": 145,
    "avgEngagementRate": 4.5,
    "avgReach": 8500,
    "avgImpressions": 12000,
    "followerGrowth": 2.3
  },
  "dateRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  }
}
```

**Location Analytics Response:**
```json
{
  "success": true,
  "type": "location",
  "platform": "instagram",
  "data": [
    {
      "country": "US",
      "percentage": 45.5,
      "engagement": 4500
    },
    {
      "country": "UK",
      "percentage": 15.2,
      "engagement": 1520
    }
  ]
}
```

**Retention Analytics Response:**
```json
{
  "success": true,
  "type": "retention",
  "platform": "youtube",
  "postId": "abc123",
  "data": [
    { "timestamp": 0, "retention": 100 },
    { "timestamp": 10, "retention": 85 },
    { "timestamp": 25, "retention": 70 },
    { "timestamp": 50, "retention": 55 },
    { "timestamp": 75, "retention": 45 },
    { "timestamp": 100, "retention": 35 }
  ]
}
```

**Save Rate Analytics Response:**
```json
{
  "success": true,
  "type": "save-rate",
  "platform": "instagram",
  "data": {
    "totalSaves": 1250,
    "saveRate": 3.2,
    "topSavedPosts": [
      { "postId": "123", "saves": 450, "format": "CAROUSEL_ALBUM" },
      { "postId": "456", "saves": 320, "format": "VIDEO" }
    ],
    "formatBreakdown": {
      "IMAGE": { "saves": 300, "posts": 50, "rate": 6.0 },
      "VIDEO": { "saves": 500, "posts": 40, "rate": 12.5 },
      "CAROUSEL_ALBUM": { "saves": 450, "posts": 25, "rate": 18.0 }
    }
  }
}
```

### Get Post Analytics

```http
GET /api/analytics/post/{postId}
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| postId | path | Post ID |
| userId | query | User ID |
| platform | query | Platform |

**Response:**
```json
{
  "success": true,
  "postId": "123456789",
  "platform": "instagram",
  "data": {
    "views": 15000,
    "likes": 1200,
    "comments": 85,
    "shares": 45,
    "saves": 320,
    "reach": 12000,
    "impressions": 18000,
    "avgWatchTime": 25.5,
    "completionRate": 65.0
  }
}
```

---

## Rate Limits

Each endpoint has rate limits to ensure fair usage:

| Endpoint Type | Limit |
|---------------|-------|
| Default | 100 requests/minute |
| Publish | 10 requests/minute |
| Analytics | 30 requests/minute |
| OAuth | 20 requests/minute |

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets (ISO 8601)

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": [
    { "field": "caption", "message": "Caption exceeds maximum length" }
  ]
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid request parameters |
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| RATE_LIMITED | 429 | Too many requests |
| PLATFORM_ERROR | 500 | Error from social media platform |
| INTERNAL_ERROR | 500 | Server error |

---

## Platform-Specific Limits

| Platform | Caption | Hashtags | Video Duration | File Size |
|----------|---------|----------|----------------|-----------|
| Instagram | 2,200 chars | 30 | 90 sec | 100 MB |
| TikTok | 2,200 chars | 100 | 10 min | 287 MB |
| YouTube | 5,000 chars | 60 | 12 hours | 256 GB |
| Twitter/X | 280 chars | 30 | 140 sec | 512 MB |
| LinkedIn | 3,000 chars | 30 | 10 min | 200 MB |
| Facebook | 63,206 chars | 30 | 4 hours | 10 GB |
| Snapchat | 250 chars | 10 | 3 min | 1 GB |

---

## Webhooks (Coming Soon)

Webhook endpoints for receiving platform callbacks:

```http
POST /api/webhooks/{platform}
```

Supported events:
- `post.published`
- `post.deleted`
- `analytics.updated`
- `connection.revoked`
