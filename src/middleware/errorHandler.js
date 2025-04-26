// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Set default error
  let statusCode = 500;
  let message = 'Something went wrong';
  let code = 'INTERNAL_ERROR';
  let errors = null;

  // Handle Prisma errors
  if (err.name?.includes('Prisma')) {
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        message = 'A record with this value already exists';
        code = 'DUPLICATE_ENTRY';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Record not found';
        code = 'NOT_FOUND';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Invalid relation data provided';
        code = 'INVALID_INPUT';
        break;
    }
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again';
    code = 'INVALID_TOKEN';
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your token has expired. Please log in again';
    code = 'TOKEN_EXPIRED';
  }
  // Handle file upload errors
  else if (err.name === 'MulterError') {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE' 
      ? 'File too large. Maximum size is 5MB'
      : 'File upload error';
    code = 'FILE_ERROR';
  }
  // Handle validation errors
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    errors = err.errors;
  }
  // Handle custom errors with status code
  else if (err.statusCode || err.status) {
    statusCode = err.statusCode || err.status;
    message = err.message || 'Error occurred';
    code = err.code || 'CUSTOM_ERROR';
  }

  // Send error response
  const errorResponse = {
    status: 'error',
    error: {
      code,
      message,
      ...(errors && { errors })
    }
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = err;
  }

  res.status(statusCode).json(errorResponse);
};

// Catch async errors
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  catchAsync
};
