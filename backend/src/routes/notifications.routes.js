const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const { authenticate } = require('../middleware/auth');

// All notification routes require authentication
router.use(authenticate);

// Notification CRUD operations
router.get('/user/:userId', notificationsController.getUserNotifications);
router.get('/unread/:userId', notificationsController.getUnreadCount);
router.get('/types', notificationsController.getNotificationTypes);

// Notification actions
router.put('/:notificationId/read', notificationsController.markAsRead);
router.put('/mark-all-read/:userId', notificationsController.markAllAsRead);
router.delete('/:notificationId', notificationsController.deleteNotification);
router.delete('/clear-old/:userId', notificationsController.clearOldNotifications);

// Admin only - Create notification
router.post('/', notificationsController.createNotification);

module.exports = router;
