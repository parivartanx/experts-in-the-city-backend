const express = require('express');
const adminRoutes = require('./adminRoutes');
const userRoutes = require('./users');
const expertRoutes = require('./experts');
const postRoutes = require('./posts');
const commentRoutes = require('./comments');
const likeRoutes = require('./likes');
const followRoutes = require('./follows');
const notificationRoutes = require('./notifications');
const authRoutes = require('./auth');
const uploadRoutes = require('./upload');
const categoryRoutes = require('./categories');
const sessionReview = require('./sessionReviews');
const reportsRoutes = require('./reports');

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

// Admin routes
router.use('/admin', adminRoutes);

// API routes
router.use('/users', userRoutes);
router.use('/experts', expertRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/likes', likeRoutes);
router.use('/follows', followRoutes);
router.use('/notifications', notificationRoutes);
router.use('/upload', uploadRoutes);
router.use('/', categoryRoutes);
router.use('/feedback', sessionReview);
router.use('/reports', reportsRoutes);

module.exports = router;
