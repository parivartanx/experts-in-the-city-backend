const express = require('express');
const isAuthenticated = require('../middleware/auth');
const followController = require('../controllers/followController');

const router = express.Router();

// All follow routes are protected
router.use(isAuthenticated);

// Follow/Unfollow routes
router.post('/:id', followController.followExpert);
router.delete('/:id', followController.unfollowExpert);

// Get followers/following lists
router.get('/followers', followController.getFollowers);
router.get('/following', followController.getFollowing);

// Check follow status
router.get('/status/:id', followController.checkFollowStatus);

module.exports = router;
