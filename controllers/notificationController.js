const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/notifications
 * Get current user's notifications
 */
const getMyNotifications = async (req, res, next) => {
  try {
    const { isRead, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.user._id };

    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find(filter)
      .populate('appointmentId', 'date slot status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });

    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully.',
      data: {
        notifications,
        unreadCount,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      throw new AppError('Notification not found.', 404, 'NOTIFICATION_NOT_FOUND');
    }

    // Ownership check
    if (notification.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Access denied.', 403, 'OWNERSHIP_VIOLATION');
    }

    notification.isRead = true;
    notification.status = 'Read';
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true, status: 'Read' }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyNotifications, markAsRead, markAllAsRead };
