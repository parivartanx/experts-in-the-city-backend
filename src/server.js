const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const { errorHandler } = require('./middleware/errorHandler');
const { AppError, ErrorCodes, HttpStatus } = require('./utils/errors');
const routes = require('./routes');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
