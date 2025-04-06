const Notification = require('../models/notification');

exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    
    const notifications = await Notification.findByUserId(userId);
    
    return res.status(200).json({
      success: true,
      count: notifications.length,
      notifications: notifications.map(n => n.toJSON())
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error getting notifications'
    });
  }
};

exports.getMyUnreadNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    
    const notifications = await Notification.findUnreadByUserId(userId);
    
    return res.status(200).json({
      success: true,
      count: notifications.length,
      notifications: notifications.map(n => n.toJSON())
    });
  } catch (error) {
    console.error('Error getting unread notifications:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error getting unread notifications'
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    if (notification.userId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only mark your own notifications as read'
      });
    }
    
    await notification.markAsRead();
    
    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification: notification.toJSON()
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error marking notification as read'
    });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    
    const notifications = await Notification.findUnreadByUserId(userId);
    
    for (const notification of notifications) {
      await notification.markAsRead();
    }
    
    return res.status(200).json({
      success: true,
      message: `${notifications.length} notifications marked as read`
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error marking all notifications as read'
    });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    if (notification.userId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own notifications'
      });
    }
    
    await notification.delete();
    
    return res.status(200).json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error deleting notification'
    });
  }
};

exports.deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    
    await Notification.deleteAllForUser(userId);
    
    return res.status(200).json({
      success: true,
      message: 'All notifications deleted'
    });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error deleting all notifications'
    });
  }
};
