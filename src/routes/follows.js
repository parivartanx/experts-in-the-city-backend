const express = require('express');
const isAuthenticated = require('../middleware/auth');
const { queryHandler } = require('../middleware/queryHandler');
const followController = require('../controllers/followController');

const router = express.Router();

// All follow routes are protected
router.use(isAuthenticated);

// Follow/Unfollow routes
router.post('/:id', followController.followExpert);
router.delete('/:id', followController.unfollowExpert);

// Get followers/following lists (with pagination and filtering)
router.get('/followers', queryHandler, followController.getFollowers);
router.get('/following', queryHandler, followController.getFollowing);

// Check follow status
router.get('/status/:id', followController.checkFollowStatus);

module.exports = router;
