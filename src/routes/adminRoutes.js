const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const isAdmin = require('../middleware/adminMiddleware');
const { queryHandler } = require('../middleware/queryHandler');
const {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  getAllExperts,
  getExpertById,
  updateExpert,
  deleteExpert
} = require('../controllers/adminController');

const {
  getAllNotifications,
  createNotification,
  updateNotification,
  deleteNotificationAdmin,
  getNotificationById,
  bulkDeleteNotifications,
  bulkMarkAsRead
} = require('../controllers/notificationController');


// Apply admin middleware to all routes
router.use(isAuthenticated, isAdmin);

// Apply query handler to routes that need pagination/filtering
router.use('/users', queryHandler);
router.use('/posts', queryHandler);
router.use('/experts', queryHandler);
router.use('/notifications', queryHandler);

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

// Expert management
router.get('/experts', getAllExperts);
router.get('/experts/:id', getExpertById);
router.patch('/experts/:id', updateExpert);
router.delete('/experts/:id', deleteExpert);


// Notification Management
router.get('/notifications', getAllNotifications);
router.get('/notifications/:id', getNotificationById);
router.post('/notifications', createNotification);
router.patch('/notifications/:id', updateNotification);
router.delete('/notifications/:id', deleteNotificationAdmin);
router.delete('/notifications/bulk', bulkDeleteNotifications);
router.patch('/notifications/bulk/read', bulkMarkAsRead);

module.exports = router;
