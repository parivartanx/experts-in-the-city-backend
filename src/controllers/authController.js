const { PrismaClient } = require('@prisma/client');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const bcrypt = require('bcryptjs');
const { AppError } = require('../utils/errors');
const TokenHandler = require('../utils/tokenHandler');

const prisma = new PrismaClient();

// Initialize Firebase Admin with environment variables
const firebaseConfig = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
};

initializeApp({
  credential: cert(firebaseConfig)
});

// Register with email/password
exports.register = async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new AppError('User already exists', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'USER'
      }
    });

    // Generate tokens
    const tokens = TokenHandler.generateTokens(user.id, user.role);

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        ...tokens
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login with email/password
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate tokens
    const tokens = TokenHandler.generateTokens(user.id, user.role);

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        ...tokens
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin Login
exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.admin.findUnique({
      where: { email }
    });

    if (!user || !(await bcrypt.compare(password, user.password)) || user.role !== 'ADMIN') {
      throw new AppError('Invalid credentials', 401);
    }

    const tokens = TokenHandler.generateTokens(user.id, user.role);

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        ...tokens
      }
    });
  } catch (error) {
    next(error);
  }
};

// Google Sign In
exports.googleSignIn = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    // Verify Firebase token
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const { email, name, picture } = decodedToken;

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatar: picture,
          password: '', // Empty password for social login
          role: 'USER'
        }
      });
    }

    // Generate tokens
    const tokens = TokenHandler.generateTokens(user.id, user.role);
    console.log(tokens)

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar
        },
        ...tokens
      }
    });
  } catch (error) {
    next(error);
  }
};

// Refresh token
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    // Generate new tokens using TokenHandler
    const tokens = await TokenHandler.refreshTokens(refreshToken);

    res.status(200).json({
      status: 'success',
      message: 'Tokens refreshed successfully',
      ...tokens
    });
  } catch (error) {
    next(error);
  }
}; 