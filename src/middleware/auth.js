const { AppError, ErrorCodes, HttpStatus } = require('../utils/errors');
const { catchAsync } = require('./errorHandler');
const TokenHandler = require('../utils/tokenHandler');

const isAuthenticated = catchAsync(async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    throw new AppError(
      'Please authenticate',
      HttpStatus.UNAUTHORIZED,
      ErrorCodes.UNAUTHORIZED
    );
  }

  try {
    const { user } = await TokenHandler.verifyAccessToken(token);
    
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role
    };
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError(
        'Token expired',
        HttpStatus.UNAUTHORIZED,
        ErrorCodes.TOKEN_EXPIRED
      );
    }
    throw new AppError(
      'Invalid token',
      HttpStatus.UNAUTHORIZED,
      ErrorCodes.INVALID_TOKEN
    );
  }
});

// Optional authentication middleware
const optionalAuth = catchAsync(async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    req.user = undefined;
    return next();
  }
  try {
    const { user } = await TokenHandler.verifyAccessToken(token);
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role
    };
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError(
        'Token expired',
        HttpStatus.UNAUTHORIZED,
        ErrorCodes.TOKEN_EXPIRED
      );
    }
    throw new AppError(
      'Invalid token',
      HttpStatus.UNAUTHORIZED,
      ErrorCodes.INVALID_TOKEN
    );
  }
});

module.exports = { isAuthenticated, optionalAuth };
