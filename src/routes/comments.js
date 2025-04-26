const express = require('express');
const auth = require('../middleware/auth');
const { queryHandler } = require('../middleware/queryHandler');
const commentController = require('../controllers/commentController');

const router = express.Router();

// Create comment on a post (protected)
router.post('/post/:id', auth, commentController.createComment);

// Get all comments for a post (public)
router.get('/post/:id', queryHandler, commentController.getComments);

// Reply to a comment (protected)
router.post('/:id/reply', auth, commentController.replyToComment);

// Delete a comment (protected)
router.delete('/:id', auth, commentController.deleteComment);

module.exports = router;
