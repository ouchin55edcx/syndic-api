const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification-controller');
const { verifyToken } = require('../middleware/auth-middleware');

router.use(verifyToken);

router.get('/', notificationController.getMyNotifications);

router.get('/unread', notificationController.getMyUnreadNotifications);

router.put('/:id/read', notificationController.markAsRead);

router.put('/read-all', notificationController.markAllAsRead);

router.delete('/:id', notificationController.deleteNotification);

router.delete('/', notificationController.deleteAllNotifications);

module.exports = router;
