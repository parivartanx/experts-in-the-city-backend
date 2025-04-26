const express = require('express');
const auth = require('../middleware/auth');
const { queryHandler } = require('../middleware/queryHandler');
const likeController = require('../controllers/likeController');

const router = express.Router();

// Like a post (protected)
router.post('/post/:id', auth, likeController.likePost);

// Unlike a post (protected)
router.delete('/post/:id', auth, likeController.unlikePost);

// Get all likes for a post (public)
router.get('/post/:id', queryHandler, likeController.getPostLikes);

// Get all posts liked by the authenticated user (protected)
router.get('/user/me', auth, queryHandler, likeController.getUserLikes);

module.exports = router;
