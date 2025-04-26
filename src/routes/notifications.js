const express = require('express');
const auth = require('../middleware/auth');
const { queryHandler } = require('../middleware/queryHandler');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

// Get user's notifications (protected)
router.get('/', auth, queryHandler, notificationController.getNotifications);

// Mark notification as read (protected)
router.patch('/:id/read', auth, notificationController.markAsRead);

// Mark all notifications as read (protected)
router.patch('/read-all', auth, notificationController.markAllAsRead);

// Delete a notification (protected)
router.delete('/:id', auth, notificationController.deleteNotification);

module.exports = router;
