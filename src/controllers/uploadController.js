const { generatePresignedUrl } = require('../utils/s3');
const { AppError, ErrorCodes, HttpStatus } = require('../utils/errors');
const crypto = require('crypto');

// File type configurations
const FILE_TYPES = {
  // Images
  'image/jpeg': { maxSize: 5 * 1024 * 1024, folder: 'images' }, // 5MB
  'image/png': { maxSize: 5 * 1024 * 1024, folder: 'images' },
  'image/gif': { maxSize: 5 * 1024 * 1024, folder: 'images' },
  'image/webp': { maxSize: 5 * 1024 * 1024, folder: 'images' },
  
  // Documents
  'application/pdf': { maxSize: 10 * 1024 * 1024, folder: 'documents' }, // 10MB
  'application/msword': { maxSize: 10 * 1024 * 1024, folder: 'documents' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { maxSize: 10 * 1024 * 1024, folder: 'documents' },
  'application/vnd.ms-excel': { maxSize: 10 * 1024 * 1024, folder: 'documents' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { maxSize: 10 * 1024 * 1024, folder: 'documents' },
  
  // Videos
  'video/mp4': { maxSize: 50 * 1024 * 1024, folder: 'videos' }, // 50MB
  'video/quicktime': { maxSize: 50 * 1024 * 1024, folder: 'videos' },
  'video/x-msvideo': { maxSize: 50 * 1024 * 1024, folder: 'videos' }
};

// Generate a unique file key
const generateFileKey = (originalName, userId, contentType) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = originalName.split('.').pop().toLowerCase();
  const folder = FILE_TYPES[contentType]?.folder || 'others';
  return `${folder}/${userId}/${timestamp}-${randomString}.${extension}`;
};

// Validate file type
const validateFileType = (contentType) => {
  if (!FILE_TYPES[contentType]) {
    throw new AppError(
      'Invalid file type. Please check the documentation for supported file types.',
      HttpStatus.BAD_REQUEST,
      ErrorCodes.INVALID_INPUT
    );
  }
};

// Get presigned URL(s) for file upload(s)
const getUploadUrls = async (req, res) => {
  try {
    const userId = req.user.id;
    const { files } = req.body;
    const { fileName, contentType } = req.query;

    // Handle single file upload via query parameters
    if (fileName && contentType) {
      // Validate file type
      validateFileType(contentType);

      // Generate unique file key
      const fileKey = generateFileKey(fileName, userId, contentType);

      // Generate presigned URL
      const { presignedUrl, key } = await generatePresignedUrl(fileKey, contentType);

      return res.json({
        status: 'success',
        data: {
          uploadUrl: presignedUrl,
          key,
          expiresIn: 3600, // URL expires in 1 hour
          maxSize: FILE_TYPES[contentType].maxSize
        }
      });
    }

    // Handle bulk file upload via request body
    if (files) {
      if (!Array.isArray(files) || files.length === 0) {
        throw new AppError(
          'Files array is required and must not be empty',
          HttpStatus.BAD_REQUEST,
          ErrorCodes.INVALID_INPUT
        );
      }

      if (files.length > 10) {
        throw new AppError(
          'Maximum 10 files can be processed at once',
          HttpStatus.BAD_REQUEST,
          ErrorCodes.INVALID_INPUT
        );
      }

      const uploadUrls = await Promise.all(
        files.map(async ({ fileName, contentType }) => {
          // Validate file type
          validateFileType(contentType);

          // Generate unique file key
          const fileKey = generateFileKey(fileName, userId, contentType);

          // Generate presigned URL
          const { presignedUrl, key } = await generatePresignedUrl(fileKey, contentType);

          return {
            fileName,
            contentType,
            uploadUrl: presignedUrl,
            key,
            maxSize: FILE_TYPES[contentType].maxSize
          };
        })
      );

      return res.json({
        status: 'success',
        data: {
          uploadUrls,
          expiresIn: 3600 // URLs expire in 1 hour
        }
      });
    }

    // If neither single nor bulk upload parameters are provided
    throw new AppError(
      'Either provide fileName and contentType as query parameters for single file upload, or files array in request body for bulk upload',
      HttpStatus.BAD_REQUEST,
      ErrorCodes.INVALID_INPUT
    );
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      'Failed to generate upload URL(s)',
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCodes.INTERNAL_ERROR
    );
  }
};

module.exports = {
  getUploadUrls
}; 