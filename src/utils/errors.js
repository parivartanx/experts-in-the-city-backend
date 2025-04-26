class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errorCode = errorCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error codes for different types of errors
const ErrorCodes = {
  // Authentication Errors (401)
  UNAUTHORIZED: 'AUTH001',
  INVALID_TOKEN: 'AUTH002',
  TOKEN_EXPIRED: 'AUTH003',

  // Authorization Errors (403)
  FORBIDDEN: 'AUTH004',
  INSUFFICIENT_PERMISSIONS: 'AUTH005',

  // Resource Errors (404)
  NOT_FOUND: 'RES001',
  USER_NOT_FOUND: 'RES002',
  POST_NOT_FOUND: 'RES003',
  COMMENT_NOT_FOUND: 'RES004',

  // Validation Errors (400)
  VALIDATION_ERROR: 'VAL001',
  INVALID_INPUT: 'VAL002',
  MISSING_FIELD: 'VAL003',
  INVALID_FORMAT: 'VAL004',

  // Conflict Errors (409)
  DUPLICATE_ENTRY: 'CON001',
  ALREADY_EXISTS: 'CON002',
  RESOURCE_CONFLICT: 'CON003',

  // Database Errors (500)
  DATABASE_ERROR: 'DB001',
  QUERY_FAILED: 'DB002',
  TRANSACTION_FAILED: 'DB003',

  // File Upload Errors (400)
  FILE_TOO_LARGE: 'FILE001',
  INVALID_FILE_TYPE: 'FILE002',
  UPLOAD_FAILED: 'FILE003',

  // Rate Limiting Errors (429)
  TOO_MANY_REQUESTS: 'RATE001',

  // Server Errors (500)
  INTERNAL_ERROR: 'SRV001',
  SERVICE_UNAVAILABLE: 'SRV002',
  EXTERNAL_SERVICE_ERROR: 'SRV003'
};

// Error messages mapped to error codes
const ErrorMessages = {
  [ErrorCodes.UNAUTHORIZED]: 'Authentication required to access this resource',
  [ErrorCodes.INVALID_TOKEN]: 'Invalid authentication token provided',
  [ErrorCodes.TOKEN_EXPIRED]: 'Authentication token has expired',
  [ErrorCodes.FORBIDDEN]: 'You do not have permission to perform this action',
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions to access this resource',
  [ErrorCodes.NOT_FOUND]: 'The requested resource was not found',
  [ErrorCodes.USER_NOT_FOUND]: 'User not found',
  [ErrorCodes.POST_NOT_FOUND]: 'Post not found',
  [ErrorCodes.COMMENT_NOT_FOUND]: 'Comment not found',
  [ErrorCodes.VALIDATION_ERROR]: 'Validation error occurred',
  [ErrorCodes.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCodes.MISSING_FIELD]: 'Required field is missing',
  [ErrorCodes.INVALID_FORMAT]: 'Invalid format provided',
  [ErrorCodes.DUPLICATE_ENTRY]: 'Duplicate entry found',
  [ErrorCodes.ALREADY_EXISTS]: 'Resource already exists',
  [ErrorCodes.RESOURCE_CONFLICT]: 'Resource conflict occurred',
  [ErrorCodes.DATABASE_ERROR]: 'Database error occurred',
  [ErrorCodes.QUERY_FAILED]: 'Database query failed',
  [ErrorCodes.TRANSACTION_FAILED]: 'Database transaction failed',
  [ErrorCodes.FILE_TOO_LARGE]: 'File size exceeds maximum limit',
  [ErrorCodes.INVALID_FILE_TYPE]: 'Invalid file type provided',
  [ErrorCodes.UPLOAD_FAILED]: 'File upload failed',
  [ErrorCodes.TOO_MANY_REQUESTS]: 'Too many requests, please try again later',
  [ErrorCodes.INTERNAL_ERROR]: 'Internal server error occurred',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'Service is currently unavailable',
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 'External service error occurred'
};

// HTTP Status codes mapped to error types
const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

module.exports = {
  AppError,
  ErrorCodes,
  ErrorMessages,
  HttpStatus
};
