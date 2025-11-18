const AWS = require('aws-sdk');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Check if S3 is configured
const S3_ENABLED = !!(
  process.env.S3_BUCKET &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY
);

let s3;
if (S3_ENABLED) {
  s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    ...(process.env.AWS_ENDPOINT && { endpoint: process.env.AWS_ENDPOINT }),
    ...(process.env.AWS_S3_FORCE_PATH_STYLE && { s3ForcePathStyle: true }),
  });
  console.log('✅ S3 storage configured');
} else {
  console.log('⚠️  S3 not configured - using local storage');
}

// Local storage configuration
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `upload-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|mkv|webm/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Invalid file type. Only images and videos are allowed.'));
};

// Multer upload middleware
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: fileFilter,
});

// Export middleware for single file upload
exports.uploadMiddleware = upload.single('file');

/**
 * Upload file to S3 or save locally
 */
exports.uploadToS3 = async (file, jobId) => {
  if (!file) {
    throw new Error('No file provided');
  }

  if (S3_ENABLED) {
    try {
      const fileContent = fs.readFileSync(file.path);
      const ext = path.extname(file.originalname);
      const s3Key = `repurpose/${jobId}/${Date.now()}${ext}`;

      const params = {
        Bucket: process.env.S3_BUCKET,
        Key: s3Key,
        Body: fileContent,
        ContentType: file.mimetype,
        ACL: 'public-read',
      };

      const result = await s3.upload(params).promise();

      return {
        url: result.Location,
        key: result.Key,
        bucket: result.Bucket,
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error('Failed to upload to S3: ' + error.message);
    }
  } else {
    // Use local storage
    const filename = path.basename(file.path);
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const url = `${baseUrl}/uploads/${filename}`;

    return {
      url,
      key: filename,
      bucket: 'local',
    };
  }
};

/**
 * Upload buffer to S3 or save locally
 */
exports.uploadBufferToS3 = async (buffer, filename, contentType) => {
  if (S3_ENABLED) {
    try {
      const s3Key = `outputs/${Date.now()}-${filename}`;

      const params = {
        Bucket: process.env.S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
      };

      const result = await s3.upload(params).promise();

      return {
        url: result.Location,
        key: result.Key,
        bucket: result.Bucket,
      };
    } catch (error) {
      console.error('S3 buffer upload error:', error);
      throw new Error('Failed to upload buffer to S3: ' + error.message);
    }
  } else {
    // Save locally
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, buffer);

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const url = `${baseUrl}/uploads/${filename}`;

    return {
      url,
      key: filename,
      bucket: 'local',
    };
  }
};

exports.s3 = s3;
exports.upload = upload;
