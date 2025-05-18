const express = require('express');
const userRoutes = require('./users');
const expertRoutes = require('./experts');
const postRoutes = require('./posts');
const commentRoutes = require('./comments');
const likeRoutes = require('./likes');
const followRoutes = require('./follows');
const notificationRoutes = require('./notifications');
const authRoutes = require('./auth');

const router = express.Router();

// Health check routes
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Expert In The City API' });
});

// Auth routes
router.use('/auth', authRoutes);

// API routes
router.use('/users', userRoutes);
router.use('/experts', expertRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/likes', likeRoutes);
router.use('/follows', followRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
