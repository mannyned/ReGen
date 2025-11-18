const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = 3002;
process.env.JWT_SECRET = 'test-secret';

const app = require('../server');

describe('ReGen API Tests', () => {
  let testJobId;
  let testScheduleId;

  describe('Health Check', () => {
    it('should return health status with configuration info', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('s3Enabled');
      expect(response.body).toHaveProperty('openaiEnabled');
    });
  });

  describe('Repurpose API', () => {
    describe('POST /api/repurpose - Text content', () => {
      it('should create a repurpose job for text content', async () => {
        const response = await request(app)
          .post('/api/repurpose')
          .send({
            type: 'text',
            platforms: ['instagram', 'tiktok'],
            textContent: 'This is a test post about AI-powered content repurposing!',
            brandVoice: 'professional and friendly',
          })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('jobId');
        expect(response.body.job).toHaveProperty('status', 'queued');
        expect(response.body.job).toHaveProperty('type', 'text');

        testJobId = response.body.jobId;
      });

      it('should reject invalid content type', async () => {
        const response = await request(app)
          .post('/api/repurpose')
          .send({
            type: 'invalid',
            platforms: ['instagram'],
            textContent: 'Test content',
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should reject invalid platform', async () => {
        const response = await request(app)
          .post('/api/repurpose')
          .send({
            type: 'text',
            platforms: ['invalid-platform'],
            textContent: 'Test content',
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should reject text type without textContent', async () => {
        const response = await request(app)
          .post('/api/repurpose')
          .send({
            type: 'text',
            platforms: ['instagram'],
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/repurpose/:jobId', () => {
      it('should get job status', async () => {
        const response = await request(app)
          .get(`/api/repurpose/${testJobId}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.job).toHaveProperty('id', testJobId);
        expect(response.body.job).toHaveProperty('status');
      });

      it('should return 404 for non-existent job', async () => {
        const response = await request(app)
          .get('/api/repurpose/non-existent-id')
          .expect(404);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/repurpose', () => {
      it('should get all jobs', async () => {
        const response = await request(app)
          .get('/api/repurpose')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('count');
        expect(response.body).toHaveProperty('jobs');
        expect(Array.isArray(response.body.jobs)).toBe(true);
      });
    });
  });

  describe('Analytics API', () => {
    describe('GET /api/analytics', () => {
      it('should get analytics dashboard data', async () => {
        const response = await request(app)
          .get('/api/analytics')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('overview');
        expect(response.body.data).toHaveProperty('contentTypes');
        expect(response.body.data).toHaveProperty('platforms');
        expect(response.body.data).toHaveProperty('outputs');
        expect(response.body.data).toHaveProperty('recentActivity');
      });
    });

    describe('GET /api/analytics/platform/:platform', () => {
      it('should get platform-specific analytics', async () => {
        const response = await request(app)
          .get('/api/analytics/platform/instagram')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('platform', 'instagram');
        expect(response.body.data).toHaveProperty('totalJobs');
        expect(response.body.data).toHaveProperty('successRate');
      });

      it('should reject invalid platform', async () => {
        const response = await request(app)
          .get('/api/analytics/platform/invalid')
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/analytics/hashtags', () => {
      it('should get trending hashtags', async () => {
        const response = await request(app)
          .get('/api/analytics/hashtags')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('hashtags');
        expect(Array.isArray(response.body.hashtags)).toBe(true);
      });
    });
  });

  describe('Publish API', () => {
    describe('POST /api/publish/now', () => {
      it('should publish content immediately', async () => {
        const response = await request(app)
          .post('/api/publish/now')
          .send({
            jobId: testJobId,
            platform: 'instagram',
            caption: 'Test caption',
            hashtags: ['#test', '#demo'],
            assetUrl: 'http://example.com/asset.jpg',
          })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.publishedPost).toHaveProperty('platform', 'instagram');
        expect(response.body.publishedPost).toHaveProperty('status', 'published');
      });
    });

    describe('POST /api/publish/schedule', () => {
      it('should schedule a post for future publishing', async () => {
        const futureDate = new Date();
        futureDate.setHours(futureDate.getHours() + 1);

        const response = await request(app)
          .post('/api/publish/schedule')
          .send({
            jobId: testJobId,
            platform: 'tiktok',
            scheduledTime: futureDate.toISOString(),
            caption: 'Scheduled test caption',
            hashtags: ['#scheduled', '#test'],
            assetUrl: 'http://example.com/asset.mp4',
          })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.scheduledPost).toHaveProperty('status', 'scheduled');
        expect(response.body.scheduledPost).toHaveProperty('platform', 'tiktok');

        testScheduleId = response.body.scheduledPost.id;
      });

      it('should reject past scheduled time', async () => {
        const pastDate = new Date();
        pastDate.setHours(pastDate.getHours() - 1);

        const response = await request(app)
          .post('/api/publish/schedule')
          .send({
            jobId: testJobId,
            platform: 'instagram',
            scheduledTime: pastDate.toISOString(),
            caption: 'Test',
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/publish/scheduled', () => {
      it('should get all scheduled posts', async () => {
        const response = await request(app)
          .get('/api/publish/scheduled')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('scheduledPosts');
        expect(Array.isArray(response.body.scheduledPosts)).toBe(true);
      });
    });

    describe('DELETE /api/publish/scheduled/:scheduleId', () => {
      it('should cancel a scheduled post', async () => {
        const response = await request(app)
          .delete(`/api/publish/scheduled/${testScheduleId}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.scheduledPost).toHaveProperty('status', 'cancelled');
      });
    });

    describe('POST /api/publish/export', () => {
      it('should export content for manual posting', async () => {
        const response = await request(app)
          .post('/api/publish/export')
          .send({
            jobId: testJobId,
            platform: 'youtube',
            caption: 'Export test caption',
            hashtags: ['#export', '#test'],
            assetUrl: 'http://example.com/video.mp4',
            type: 'video',
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.export).toHaveProperty('platform', 'youtube');
        expect(response.body.export).toHaveProperty('downloadUrl');
      });
    });
  });

  describe('Waitlist API', () => {
    const testEmail = 'test@example.com';

    describe('POST /api/waitlist', () => {
      it('should add email to waitlist', async () => {
        const response = await request(app)
          .post('/api/waitlist')
          .send({
            email: testEmail,
            name: 'Test User',
            referralSource: 'google',
          })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.entry).toHaveProperty('position');
      });

      it('should reject duplicate email', async () => {
        const response = await request(app)
          .post('/api/waitlist')
          .send({
            email: testEmail,
          })
          .expect(409);

        expect(response.body).toHaveProperty('success', false);
      });

      it('should reject invalid email', async () => {
        const response = await request(app)
          .post('/api/waitlist')
          .send({
            email: 'invalid-email',
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/waitlist/check/:email', () => {
      it('should check waitlist status', async () => {
        const response = await request(app)
          .get(`/api/waitlist/check/${testEmail}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.entry).toHaveProperty('position');
        expect(response.body.entry).toHaveProperty('status');
      });

      it('should return 404 for non-existent email', async () => {
        const response = await request(app)
          .get('/api/waitlist/check/nonexistent@example.com')
          .expect(404);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('GET /api/waitlist', () => {
      it('should get all waitlist entries', async () => {
        const response = await request(app)
          .get('/api/waitlist')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('waitlist');
        expect(Array.isArray(response.body.waitlist)).toBe(true);
      });
    });

    describe('GET /api/waitlist/stats', () => {
      it('should get waitlist statistics', async () => {
        const response = await request(app)
          .get('/api/waitlist/stats')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.stats).toHaveProperty('total');
        expect(response.body.stats).toHaveProperty('pending');
      });
    });

    describe('PATCH /api/waitlist/:email', () => {
      it('should update waitlist entry status', async () => {
        const response = await request(app)
          .patch(`/api/waitlist/${testEmail}`)
          .send({
            status: 'approved',
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.entry).toHaveProperty('status', 'approved');
      });

      it('should reject invalid status', async () => {
        const response = await request(app)
          .patch(`/api/waitlist/${testEmail}`)
          .send({
            status: 'invalid-status',
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('DELETE /api/waitlist/:email', () => {
      it('should remove email from waitlist', async () => {
        const response = await request(app)
          .delete(`/api/waitlist/${testEmail}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });

      it('should return 404 for non-existent email', async () => {
        const response = await request(app)
          .delete('/api/waitlist/nonexistent@example.com')
          .expect(404);

        expect(response.body).toHaveProperty('error');
      });
    });
  });
});
