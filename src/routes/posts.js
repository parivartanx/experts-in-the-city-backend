const express = require('express');
const isAuthenticated = require('../middleware/auth');
const { queryHandler } = require('../middleware/queryHandler');
const postController = require('../controllers/postController');

const router = express.Router();

// List all posts with filters (public)
router.get('/', queryHandler, postController.listPosts);

// Get presigned URL for post image upload
router.get('/upload-url', isAuthenticated, postController.getUploadUrl);

// Create post (protected)
router.post('/', isAuthenticated, postController.createPost);

// Add tags to post (protected)
router.post('/:id/tags', isAuthenticated, postController.addTags);

// Get post by ID (public)
router.get('/:id', postController.getPost);

// Update post (protected)
router.patch('/:id', isAuthenticated, postController.updatePost);

// Delete post (protected)
router.delete('/:id', isAuthenticated, postController.deletePost);

module.exports = router;
