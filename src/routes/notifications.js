const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

// All notification routes are protected
router.use(isAuthenticated);

// Get all notifications
router.get('/', notificationController.getNotifications);

// Mark notification as read
router.patch('/:id/read', notificationController.markAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
