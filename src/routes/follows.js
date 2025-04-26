const express = require('express');
const auth = require('../middleware/auth');
const { queryHandler } = require('../middleware/queryHandler');
const followController = require('../controllers/followController');

const router = express.Router();

// Follow a user (protected)
router.post('/user/:id', auth, followController.followUser);

// Unfollow a user (protected)
router.delete('/user/:id', auth, followController.unfollowUser);

// Get user's followers (public)
router.get('/user/:id/followers', queryHandler, followController.getFollowers);

// Get user's following (public)
router.get('/user/:id/following', queryHandler, followController.getFollowing);

module.exports = router;
