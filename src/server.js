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

// Use centralized routes
app.use('/api', routes);

// Handle 404
app.all('*', (req, res, next) => {
  next(new AppError(
    `Can't find ${req.originalUrl} on this server!`,
    HttpStatus.NOT_FOUND,
    ErrorCodes.NOT_FOUND
  ));
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
