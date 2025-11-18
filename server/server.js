require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const tempDir = path.join(__dirname, 'temp');
const dataDir = path.join(__dirname, 'data');

[uploadsDir, tempDir, dataDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(uploadsDir));

// Serve static files from public directory
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
app.use(express.static(publicDir));

// Import routes
const repurposeRoutes = require('./routes/repurpose');
const analyticsRoutes = require('./routes/analytics');
const publishRoutes = require('./routes/publish');
const waitlistRoutes = require('./routes/waitlist');
const oauthRoutes = require('./routes/oauth');

// Import and start worker
const { startWorker } = require('./services/repurposeWorker');

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    s3Enabled: !!process.env.S3_BUCKET,
    openaiEnabled: !!process.env.OPENAI_API_KEY,
  });
});

// Basic test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// API Routes
app.use('/api/repurpose', repurposeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/publish', publishRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/oauth', oauthRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 ReGen server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 S3 Storage: ${process.env.S3_BUCKET ? 'Enabled' : 'Local fallback'}`);
  console.log(`🤖 OpenAI API: ${process.env.OPENAI_API_KEY ? 'Enabled' : 'Fallback mode'}`);
  console.log(`✅ Server is ready`);

  // Start the repurpose worker
  startWorker();
});

module.exports = app;
