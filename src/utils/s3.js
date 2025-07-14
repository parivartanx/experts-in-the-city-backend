const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Initialize Cloudflare R2 client (S3-compatible)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT, // e.g. https://<accountid>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

// Generate presigned URL for uploading to R2
const generatePresignedUrl = async (key, contentType) => {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    ContentType: contentType
  });

  try {
    const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 }); // 1 hour
    return {
      presignedUrl,
      key,
      bucket: process.env.R2_BUCKET
    };
  } catch (error) {
    console.error('Error generating R2 presigned URL:', error);
    throw error;
  }
};

// Generate presigned URL for reading from R2
const generateReadUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key
  });

  try {
    const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 }); // 1 hour
    return presignedUrl;
  } catch (error) {
    console.error('Error generating R2 read URL:', error);
    throw error;
  }
};

module.exports = {
  generatePresignedUrl,
  generateReadUrl
}; 