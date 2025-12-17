# ReGenr API Documentation

Complete API documentation for the ReGenr content repurposing platform.

## Base URL
```
http://localhost:3000
```

## Table of Contents
1. [Health Check](#health-check)
2. [Repurpose API](#repurpose-api)
3. [Analytics API](#analytics-api)
4. [Publish/Schedule API](#publishschedule-api)
5. [Waitlist API](#waitlist-api)

---

## Health Check

### GET /health
Check server status and configuration.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-12T17:00:00.000Z",
  "environment": "development",
  "s3Enabled": false,
  "openaiEnabled": true
}
```

---

## Repurpose API

### POST /api/repurpose
Create a new content repurposing job.

**Request Body (Text Content):**
```json
{
  "type": "text",
  "platforms": ["instagram", "tiktok", "youtube", "x"],
  "textContent": "Your content here...",
  "brandVoice": "professional and friendly"
}
```

**Request Body (Video/Image Upload):**
```
Content-Type: multipart/form-data

type: "video" or "image"
platforms: ["instagram", "tiktok"]
brandVoice: "professional and friendly"
file: [binary file data]
```

**Response:**
```json
{
  "success": true,
  "jobId": "5402a914-b71c-478c-a385-77e79fbd82ef",
  "status": "queued",
  "message": "Job created and queued for processing",
  "job": {
    "id": "5402a914-b71c-478c-a385-77e79fbd82ef",
    "type": "text",
    "platforms": ["instagram", "tiktok"],
    "status": "queued",
    "createdAt": "2025-11-12T17:00:00.000Z"
  }
}
```

**Valid Types:**
- `text` - Text content
- `video` - Video file upload
- `image` - Image file upload

**Valid Platforms:**
- `instagram`
- `tiktok`
- `youtube`
- `x` (formerly Twitter)

---

### GET /api/repurpose/:jobId
Get job status and details.

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "5402a914-b71c-478c-a385-77e79fbd82ef",
    "type": "text",
    "platforms": ["instagram", "tiktok"],
    "status": "completed",
    "createdAt": "2025-11-12T17:00:00.000Z",
    "updatedAt": "2025-11-12T17:00:30.000Z",
    "completedAt": "2025-11-12T17:00:30.000Z",
    "outputs": [...]
  }
}
```

**Job Statuses:**
- `queued` - Job waiting to be processed
- `processing` - Processing content
- `generating_content` - Generating AI captions and hashtags
- `completed` - Job finished successfully
- `failed` - Job failed with error

---

### GET /api/repurpose
Get all jobs.

**Response:**
```json
{
  "success": true,
  "count": 5,
  "jobs": [
    {
      "id": "...",
      "type": "text",
      "platforms": ["instagram"],
      "status": "completed",
      "createdAt": "2025-11-12T17:00:00.000Z",
      "updatedAt": "2025-11-12T17:00:30.000Z",
      "completedAt": "2025-11-12T17:00:30.000Z",
      "outputCount": 1
    }
  ]
}
```

---

### GET /api/repurpose/:jobId/outputs
Get outputs for a completed job.

**Response:**
```json
{
  "success": true,
  "jobId": "5402a914-b71c-478c-a385-77e79fbd82ef",
  "outputs": [
    {
      "platform": "instagram",
      "type": "text",
      "captionVariant1": "Short & punchy caption...",
      "captionVariant2": "Descriptive & engaging caption...",
      "captionVariant3": "CTA-focused caption with hook...",
      "hashtags": ["#content", "#socialmedia", "#viral"],
      "originalText": "Your original text...",
      "metadata": {
        "characterCount": 50,
        "wordCount": 10
      }
    }
  ]
}
```

---

## Analytics API

### GET /api/analytics
Get comprehensive analytics dashboard data.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalJobs": 10,
      "completedJobs": 8,
      "failedJobs": 1,
      "processingJobs": 0,
      "queuedJobs": 1,
      "successRate": "80.0%"
    },
    "contentTypes": {
      "video": 3,
      "image": 2,
      "text": 5
    },
    "platforms": {
      "instagram": 7,
      "tiktok": 5,
      "youtube": 2,
      "x": 3
    },
    "outputs": {
      "totalGenerated": 17,
      "averagePerJob": "1.7"
    },
    "recentActivity": [...]
  },
  "timestamp": "2025-11-12T17:00:00.000Z"
}
```

---

### GET /api/analytics/platform/:platform
Get platform-specific analytics.

**Valid Platforms:** `instagram`, `tiktok`, `youtube`, `x`

**Response:**
```json
{
  "success": true,
  "data": {
    "platform": "instagram",
    "totalJobs": 7,
    "completedJobs": 6,
    "failedJobs": 1,
    "outputsGenerated": 6,
    "successRate": "85.7%"
  },
  "timestamp": "2025-11-12T17:00:00.000Z"
}
```

---

### GET /api/analytics/hashtags
Get trending hashtags from all completed jobs.

**Response:**
```json
{
  "success": true,
  "count": 20,
  "hashtags": [
    { "tag": "#content", "count": 15 },
    { "tag": "#socialmedia", "count": 12 },
    { "tag": "#viral", "count": 10 }
  ],
  "timestamp": "2025-11-12T17:00:00.000Z"
}
```

---

## Publish/Schedule API

### POST /api/publish/now
Publish content immediately.

**Request Body:**
```json
{
  "jobId": "5402a914-b71c-478c-a385-77e79fbd82ef",
  "outputId": "output-1",
  "platform": "instagram",
  "caption": "Your caption here...",
  "hashtags": ["#content", "#viral"],
  "assetUrl": "http://example.com/asset.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Post published successfully",
  "publishedPost": {
    "id": "pub-123",
    "platform": "instagram",
    "status": "published",
    "publishedAt": "2025-11-12T17:00:00.000Z",
    "platformResponse": {
      "success": true,
      "message": "Successfully published to instagram (simulated)",
      "postUrl": "https://instagram.com/post/pub-123"
    }
  }
}
```

---

### POST /api/publish/schedule
Schedule a post for future publishing.

**Request Body:**
```json
{
  "jobId": "5402a914-b71c-478c-a385-77e79fbd82ef",
  "outputId": "output-1",
  "platform": "tiktok",
  "scheduledTime": "2025-11-12T20:00:00.000Z",
  "caption": "Scheduled caption...",
  "hashtags": ["#scheduled", "#tiktok"],
  "assetUrl": "http://example.com/video.mp4"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Post scheduled successfully",
  "scheduledPost": {
    "id": "sched-456",
    "platform": "tiktok",
    "scheduledTime": "2025-11-12T20:00:00.000Z",
    "status": "scheduled",
    "createdAt": "2025-11-12T17:00:00.000Z"
  }
}
```

---

### GET /api/publish/scheduled
Get all scheduled posts.

**Response:**
```json
{
  "success": true,
  "count": 3,
  "scheduledPosts": [
    {
      "id": "sched-456",
      "platform": "tiktok",
      "scheduledTime": "2025-11-12T20:00:00.000Z",
      "status": "scheduled",
      "createdAt": "2025-11-12T17:00:00.000Z"
    }
  ]
}
```

---

### GET /api/publish/scheduled/:scheduleId
Get specific scheduled post.

**Response:**
```json
{
  "success": true,
  "scheduledPost": {
    "id": "sched-456",
    "jobId": "5402a914-b71c-478c-a385-77e79fbd82ef",
    "platform": "tiktok",
    "scheduledTime": "2025-11-12T20:00:00.000Z",
    "caption": "Scheduled caption...",
    "hashtags": ["#scheduled"],
    "status": "scheduled"
  }
}
```

---

### DELETE /api/publish/scheduled/:scheduleId
Cancel a scheduled post.

**Response:**
```json
{
  "success": true,
  "message": "Scheduled post cancelled",
  "scheduledPost": {
    "id": "sched-456",
    "status": "cancelled",
    "cancelledAt": "2025-11-12T17:05:00.000Z"
  }
}
```

---

### POST /api/publish/export
Export content for manual posting.

**Request Body:**
```json
{
  "jobId": "5402a914-b71c-478c-a385-77e79fbd82ef",
  "outputId": "output-1",
  "platform": "youtube",
  "caption": "Export caption...",
  "hashtags": ["#export"],
  "assetUrl": "http://example.com/video.mp4",
  "type": "video"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Content exported successfully",
  "export": {
    "id": "exp-789",
    "platform": "youtube",
    "exportedAt": "2025-11-12T17:00:00.000Z",
    "downloadUrl": "http://example.com/video.mp4",
    "content": {
      "assetUrl": "http://example.com/video.mp4",
      "caption": "Export caption...",
      "hashtags": ["#export"],
      "type": "video"
    }
  }
}
```

---

## Waitlist API

### POST /api/waitlist
Join the waitlist.

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "referralSource": "google"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully joined waitlist",
  "entry": {
    "position": 42,
    "joinedAt": "2025-11-12T17:00:00.000Z"
  }
}
```

**Error (Duplicate):**
```json
{
  "success": false,
  "message": "Email already on waitlist",
  "entry": {
    "position": 42,
    "joinedAt": "2025-11-12T16:00:00.000Z"
  }
}
```

---

### GET /api/waitlist/check/:email
Check waitlist status by email.

**Response:**
```json
{
  "success": true,
  "entry": {
    "position": 42,
    "status": "pending",
    "joinedAt": "2025-11-12T17:00:00.000Z"
  }
}
```

---

### GET /api/waitlist
Get all waitlist entries (Admin).

**Response:**
```json
{
  "success": true,
  "count": 100,
  "waitlist": [
    {
      "email": "user@example.com",
      "name": "John Doe",
      "position": 1,
      "status": "pending",
      "referralSource": "google",
      "joinedAt": "2025-11-12T17:00:00.000Z"
    }
  ]
}
```

---

### GET /api/waitlist/stats
Get waitlist statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 100,
    "pending": 75,
    "approved": 20,
    "invited": 5,
    "referralSources": {
      "google": 40,
      "twitter": 30,
      "friend": 20,
      "other": 10
    }
  }
}
```

---

### PATCH /api/waitlist/:email
Update waitlist entry status (Admin).

**Request Body:**
```json
{
  "status": "approved"
}
```

**Valid Statuses:** `pending`, `approved`, `invited`, `rejected`

**Response:**
```json
{
  "success": true,
  "message": "Waitlist entry updated",
  "entry": {
    "email": "user@example.com",
    "status": "approved",
    "updatedAt": "2025-11-12T17:05:00.000Z"
  }
}
```

---

### DELETE /api/waitlist/:email
Remove from waitlist (Admin).

**Response:**
```json
{
  "success": true,
  "message": "Email removed from waitlist"
}
```

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message here",
  "message": "Additional details if available"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `409` - Conflict (e.g., duplicate email)
- `500` - Internal Server Error

---

## Testing

Run the comprehensive test suite:

```bash
cd server
npm test
```

**Test Coverage:**
- 32 test cases covering all API endpoints
- Health check, repurpose, analytics, publish, and waitlist APIs
- Validation and error handling tests
- 62.61% overall code coverage

---

## Notes

- **OpenAI Integration**: The API uses OpenAI GPT-4 for caption and hashtag generation. If `OPENAI_API_KEY` is not configured, it falls back to generic responses.
- **File Storage**: Supports both AWS S3 and local file storage. Configure via environment variables.
- **Job Processing**: Background worker processes jobs every 5 seconds. Jobs go through: `queued` → `processing` → `generating_content` → `completed`.
- **Scheduling**: Uses node-cron for scheduled posts. Scheduled posts are executed at the specified time automatically.

---

## Environment Variables

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key

# OpenAI (optional - falls back to generic responses)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# AWS S3 (optional - falls back to local storage)
S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
BASE_URL=http://localhost:3000
```
