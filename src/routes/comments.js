const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const { queryHandler } = require('../middleware/queryHandler');
const commentController = require('../controllers/commentController');

const router = express.Router();

// All comment routes are protected
router.use(isAuthenticated);

// Comment routes
router.get('/post/:postId', queryHandler, commentController.getComments);
router.post('/post/:postId', commentController.createComment);
router.patch('/:commentId', commentController.updateComment);
router.delete('/:commentId', commentController.deleteComment);

// Reply routes
router.get('/:commentId/replies', queryHandler, commentController.getReplies);
router.post('/:commentId/replies', commentController.createReply);
router.patch('/replies/:replyId', commentController.updateReply);
router.delete('/replies/:replyId', commentController.deleteReply);

module.exports = router;
