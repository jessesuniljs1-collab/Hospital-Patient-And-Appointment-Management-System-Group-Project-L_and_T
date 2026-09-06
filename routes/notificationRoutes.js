const express = require('express');
const router = express.Router();
const { getMyNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');
const { authenticateJWT } = require('../middleware/auth');

// GET /api/notifications — Get current user's notifications
router.get('/', authenticateJWT, getMyNotifications);

// PUT /api/notifications/read-all — Mark all as read
router.put('/read-all', authenticateJWT, markAllAsRead);

// PUT /api/notifications/:id/read — Mark single notification as read
router.put('/:id/read', authenticateJWT, markAsRead);

module.exports = router;
