const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/auth');
const isAdmin = require('../middleware/adminMiddleware');
const {
  getAllUsers,
  getUserStats,
  deleteUser
} = require('../controllers/adminController');

// Apply authentication and admin middleware to all routes
router.use(isAuthenticated);
router.use(isAdmin);

// Admin routes
router.get('/users', getAllUsers);
router.get('/users/stats', getUserStats);
router.delete('/users/:id', deleteUser);

module.exports = router;
