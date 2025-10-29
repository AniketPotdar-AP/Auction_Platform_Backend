const express = require('express');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification
} = require('../controllers/notificationController');

const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.put('/mark-all-read', markAllAsRead);
router.get('/unread-count', getUnreadCount);
router.delete('/:id', deleteNotification);

module.exports = router;