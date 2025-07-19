const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const { queryHandler } = require('../middleware/queryHandler');
const likeController = require('../controllers/likeController');

const router = express.Router();

// All like routes are protected
router.use(isAuthenticated);

// Get all posts liked by the authenticated user
router.get('/user/me', queryHandler, likeController.getUserLikes);

// Like/Unlike post routes
router.post('/post/:id', likeController.likePost);
router.delete('/post/:id', likeController.unlikePost);

// Get all likes for a post
router.get('/post/:id', queryHandler, likeController.getPostLikes);

module.exports = router;
