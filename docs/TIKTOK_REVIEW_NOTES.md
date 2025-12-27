# TikTok API Integration - Review Notes

This document provides information required for TikTok API review submission.

## Scopes Requested

| Scope | Purpose | Justification |
|-------|---------|---------------|
| `user.info.basic` | Display profile info | Shows connected account name and avatar in the app. Required for basic integration. |
| `video.list` | List user's videos | Displays the user's TikTok content in the analytics dashboard with engagement metrics. |
| `video.publish` | Post videos | Core feature: enables users to export and schedule content to TikTok directly from the app. |

## User Experience Flow

### 1. Connection Flow
1. User navigates to Settings → Integrations
2. User clicks "Connect TikTok"
3. App redirects to TikTok OAuth authorization page
4. User grants permissions for requested scopes
5. TikTok redirects back to app with authorization code
6. App exchanges code for access tokens and stores securely
7. User sees confirmation with their TikTok username

### 2. Analytics Flow
1. User navigates to Analytics dashboard
2. User selects TikTok tab
3. App fetches user's video list via `video.list` scope
4. Videos displayed with thumbnails and metrics (views, likes, comments, shares)
5. Metrics cached for 1 hour to reduce API calls

### 3. Posting Flow
1. User creates/uploads content in the app
2. User clicks "Export to TikTok"
3. User customizes caption, privacy settings
4. User can schedule for later or post immediately
5. App uses `video.publish` scope to post
6. User receives confirmation with link to view on TikTok

## Data Handling & Security

### Token Storage
- Access tokens encrypted at rest using **AES-256-GCM**
- Encryption key stored as environment variable, not in codebase
- Tokens stored in PostgreSQL database with Row-Level Security (RLS)
- Users can only access their own tokens via RLS policies

### Token Lifecycle
- Access tokens refreshed automatically before expiration (5-minute buffer)
- Refresh tokens used to obtain new access tokens
- Failed refresh results in user being prompted to reconnect
- Tokens deleted on disconnect

### Data Privacy
- Tokens **never** exposed to client-side JavaScript
- All API calls made server-side via Next.js API routes
- No OAuth credentials stored in client bundles
- HTTPS enforced for all API communications

## API Endpoints Created

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tiktok/status` | GET | Check connection status |
| `/api/tiktok/videos` | GET | List user's videos with metrics |
| `/api/tiktok/metrics` | GET | Get metrics for specific video |
| `/api/tiktok/post` | POST | Create new TikTok post |

## Error Handling

### User-Facing Errors
- "TikTok not connected" - Prompts user to connect account
- "Connection failed. Try reconnecting." - OAuth flow error
- "Posting failed. Check permissions or try again." - Publishing error
- "Metrics unavailable" - API didn't return data for video

### Logging
- All API errors logged with correlation IDs
- No PII or tokens in logs
- Error details stored for debugging, not exposed to users

## Posting Guidelines Compliance

### Direct Post UX
- User explicitly initiates post action
- Clear preview before posting
- Privacy level selection (public, friends only, etc.)
- Caption editing with character limit (150 chars for title)

### Content Requirements
- Video format validation before upload
- Duration limits respected
- File size limits enforced
- Only user's own content can be posted

## Rate Limiting

- Respects TikTok API rate limits
- Implements caching to reduce unnecessary calls
- Metrics cached for 1 hour per video
- Failed requests don't retry immediately

## Testing Checklist

- [ ] OAuth connect flow works
- [ ] OAuth disconnect flow works
- [ ] Token refresh works when token expires
- [ ] Video list displays correctly
- [ ] Metrics show for videos
- [ ] Post via URL works (PULL_FROM_URL)
- [ ] Post via upload works (FILE_UPLOAD)
- [ ] Scheduled posts work
- [ ] Error messages display correctly
- [ ] RLS policies prevent cross-user access

## Technical Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth + Custom OAuth Engine
- **Encryption**: AES-256-GCM via Node.js crypto
- **Hosting**: Vercel

## Contact

For questions about this integration:
- App: ReGenr (https://regenr.app)
- Support: [Add support email]
