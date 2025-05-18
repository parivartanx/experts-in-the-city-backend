const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('./errors');

const prisma = new PrismaClient();

class TokenHandler {
  static generateTokens(userId, role) {
    const accessToken = jwt.sign(
      { userId, role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { userId, role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }

  static async verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      return { user, decoded };
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new AppError('Invalid access token', 401);
      }
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Access token expired', 401);
      }
      throw error;
    }
  }

  static async verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      return { user, decoded };
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new AppError('Invalid refresh token', 401);
      }
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Refresh token expired', 401);
      }
      throw error;
    }
  }

  static async refreshTokens(refreshToken) {
    const { user } = await this.verifyRefreshToken(refreshToken);
    return this.generateTokens(user.id, user.role);
  }
}

module.exports = TokenHandler; 