const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const { errorHandler } = require('./middleware/errorHandler');
const { AppError, ErrorCodes, HttpStatus } = require('./utils/errors');
const routes = require('./routes');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const prisma = new PrismaClient();

// API Rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many API requests, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiter to API routes
app.use('/api', apiLimiter);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());  
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Welcome to Experts in the City API',
    version: '1.0.0',
    health: '/health',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Use centralized routes
app.use('/api', routes);

// Handle 404
app.use((req, res, next) => {
  next(new AppError(
    `Can't find ${req.originalUrl} on this server!`,
    HttpStatus.NOT_FOUND,
    ErrorCodes.NOT_FOUND
  ));
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 8080;

// Handle both serverless and traditional deployments
if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
  // Export for Vercel serverless
  module.exports = app;
} else {
  // Traditional server deployment
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
