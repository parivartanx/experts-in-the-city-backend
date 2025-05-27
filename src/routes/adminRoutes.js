const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/auth');
const isAdmin = require('../middleware/adminMiddleware');
const {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost
} = require('../controllers/adminController');

// Apply admin middleware to all routes
router.use(isAuthenticated, isAdmin);

// Dashboard
router.get('/dashboard-stats', getDashboardStats);

// User management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Post management
router.get('/posts', getAllPosts);
router.get('/posts/:id', getPostById);
router.patch('/posts/:id', updatePost);
router.delete('/posts/:id', deletePost);

module.exports = router;
