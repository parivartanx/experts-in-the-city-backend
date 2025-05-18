const express = require('express');
const isAuthenticated = require('../middleware/auth');
const commentController = require('../controllers/commentController');

const router = express.Router();

// All comment routes are protected
router.use(isAuthenticated);

// Get comments for a post
router.get('/post/:postId', commentController.getComments);

// Create comment on a post
router.post('/post/:postId', commentController.createComment);

// Update/Delete specific comment
router.patch('/:commentId', commentController.updateComment);
router.delete('/:commentId', commentController.deleteComment);

module.exports = router;
