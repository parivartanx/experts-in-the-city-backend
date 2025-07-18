const express = require('express');
const isAuthenticated = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

// Profile routes (protected)
router.get('/profile', isAuthenticated, userController.getProfile);
router.patch('/profile', isAuthenticated, userController.updateProfile);

// Public routes
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);

// Report a user (protected)
router.post('/:userId/report', isAuthenticated, userController.reportUser);

module.exports = router;
