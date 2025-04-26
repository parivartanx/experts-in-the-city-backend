const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { AppError, ErrorCodes, HttpStatus } = require('../utils/errors');
const { catchAsync } = require('./errorHandler');

const prisma = new PrismaClient();

const auth = catchAsync(async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    throw new AppError(
      'Please authenticate',
      HttpStatus.UNAUTHORIZED,
      ErrorCodes.UNAUTHORIZED
    );
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new AppError(
      'Invalid or expired token',
      HttpStatus.UNAUTHORIZED,
      ErrorCodes.INVALID_TOKEN
    );
  }
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true
      }
    });

    if (!user) {
      throw new AppError(
        'User not found',
        HttpStatus.UNAUTHORIZED,
        ErrorCodes.USER_NOT_FOUND
      );
    }

    req.user = user;
    req.token = token;
    next();
});

module.exports = auth;
