const { pool } = require('../config/database');

// Get notifications for a user
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, unreadOnly, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        sn.NOTIFICATION_ID,
        sn.TYPE,
        sn.TITLE,
        sn.MESSAGE,
        sn.ACTION_URL,
        sn.RELATED_TASK_ID,
        sn.IS_READ,
        sn.CREATED_AT,
        sn.READ_AT
      FROM SYSTEM_NOTIFICATION sn
      WHERE sn.USER_ID = ?
    `;

    const params = [userId];

    // Add type filter
    if (type && type !== 'all') {
      query += ' AND sn.TYPE = ?';
      params.push(type);
    }

    // Add unread filter
    if (unreadOnly === 'true') {
      query += ' AND sn.IS_READ = 0';
    }

    query += ' ORDER BY sn.CREATED_AT DESC';

    // Add pagination
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    if (offset) {
      query += ' OFFSET ?';
      params.push(parseInt(offset));
    }

    const [notifications] = await pool.query(query, params);

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

// Get unread notification count
exports.getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;

    const [result] = await pool.query(
      'SELECT COUNT(*) as unread_count FROM SYSTEM_NOTIFICATION WHERE USER_ID = ? AND IS_READ = 0',
      [userId]
    );

    res.json({
      success: true,
      count: result[0].unread_count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;

    // Verify notification belongs to user
    const [notifications] = await pool.query(
      'SELECT * FROM SYSTEM_NOTIFICATION WHERE NOTIFICATION_ID = ? AND USER_ID = ?',
      [notificationId, userId]
    );

    if (notifications.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found or does not belong to you'
      });
    }

    await pool.query(
      'UPDATE SYSTEM_NOTIFICATION SET IS_READ = 1, READ_AT = NOW() WHERE NOTIFICATION_ID = ?',
      [notificationId]
    );

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    await pool.query(
      'UPDATE SYSTEM_NOTIFICATION SET IS_READ = 1, READ_AT = NOW() WHERE USER_ID = ? AND IS_READ = 0',
      [userId]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all notifications as read' });
  }
};

// Create notification (internal use)
exports.createNotification = async (req, res) => {
  try {
    const { userId, type, title, message, actionUrl } = req.body;

    // Validate required fields
    if (!userId || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, type, title, message'
      });
    }

    // Validate notification type
    const validTypes = [
      'task_assigned',
      'task_completed',
      'document_submitted',
      'document_approved',
      'document_rejected',
      'document_requires_review',
      'revision_required',
      'document_resubmitted',
      'document_forwarded',
      'feedback_received',
      'deadline_approaching',
      'deadline_overdue',
      'system_announcement'
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification type'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO SYSTEM_NOTIFICATION (USER_ID, TYPE, TITLE, MESSAGE, ACTION_URL, IS_READ, CREATED_AT)
       VALUES (?, ?, ?, ?, ?, 0, NOW())`,
      [userId, type, title, message, actionUrl || null]
    );

    res.json({
      success: true,
      message: 'Notification created successfully',
      notificationId: result.insertId
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to create notification' });
  }
};

// Get notification types (for filtering)
exports.getNotificationTypes = async (req, res) => {
  try {
    const types = [
      { value: 'task_assigned', label: 'Task Assigned' },
      { value: 'task_completed', label: 'Task Completed' },
      { value: 'document_submitted', label: 'Document Submitted' },
      { value: 'document_approved', label: 'Document Approved' },
      { value: 'document_rejected', label: 'Document Rejected' },
      { value: 'document_requires_review', label: 'Document Requires Review' },
      { value: 'revision_required', label: 'Revision Required' },
      { value: 'document_resubmitted', label: 'Document Resubmitted' },
      { value: 'document_forwarded', label: 'Document Forwarded' },
      { value: 'feedback_received', label: 'Feedback Received' },
      { value: 'deadline_approaching', label: 'Deadline Approaching' },
      { value: 'deadline_overdue', label: 'Deadline Overdue' },
      { value: 'system_announcement', label: 'System Announcement' }
    ];

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    console.error('Get notification types error:', error);
    res.status(500).json({ success: false, error: 'Failed to get notification types' });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;

    // Verify notification belongs to user
    const [notifications] = await pool.query(
      'SELECT * FROM SYSTEM_NOTIFICATION WHERE NOTIFICATION_ID = ? AND USER_ID = ?',
      [notificationId, userId]
    );

    if (notifications.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found or does not belong to you'
      });
    }

    await pool.query(
      'DELETE FROM SYSTEM_NOTIFICATION WHERE NOTIFICATION_ID = ?',
      [notificationId]
    );

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
};

// Clear old notifications (keep last 100 per user)
exports.clearOldNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { keepCount = 100 } = req.query;

    // Get notifications to keep
    const [keepNotifications] = await pool.query(
      `SELECT NOTIFICATION_ID FROM SYSTEM_NOTIFICATION 
       WHERE USER_ID = ? 
       ORDER BY CREATED_AT DESC 
       LIMIT ?`,
      [userId, parseInt(keepCount)]
    );

    const keepIds = keepNotifications.map(n => n.NOTIFICATION_ID);

    if (keepIds.length > 0) {
      // Delete notifications not in the keep list
      const placeholders = keepIds.map(() => '?').join(',');
      await pool.query(
        `DELETE FROM SYSTEM_NOTIFICATION 
         WHERE USER_ID = ? 
         AND NOTIFICATION_ID NOT IN (${placeholders})`,
        [userId, ...keepIds]
      );
    } else {
      // Delete all notifications if none to keep
      await pool.query(
        'DELETE FROM SYSTEM_NOTIFICATION WHERE USER_ID = ?',
        [userId]
      );
    }

    res.json({
      success: true,
      message: 'Old notifications cleared successfully'
    });
  } catch (error) {
    console.error('Clear old notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to clear old notifications' });
  }
};

