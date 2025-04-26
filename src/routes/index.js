const express = require('express');
const userRoutes = require('./users');
const mentorRoutes = require('./mentors');
const postRoutes = require('./posts');
const commentRoutes = require('./comments');
const likeRoutes = require('./likes');
const followRoutes = require('./follows');
const tagRoutes = require('./tags');
const notificationRoutes = require('./notifications');

const router = express.Router();

// Health check routes
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Expert In The City API' });
});

// API routes
router.use('/users', userRoutes);
router.use('/mentors', mentorRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/likes', likeRoutes);
router.use('/follows', followRoutes);
router.use('/tags', tagRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
