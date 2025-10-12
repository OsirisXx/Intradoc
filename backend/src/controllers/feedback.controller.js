const { pool } = require('../config/database');

// Create feedback
exports.createFeedback = async (req, res) => {
  try {
    const { recipientId, relatedTaskId, relatedDocumentId, type, content } = req.body;
    const authorId = req.user.userId;

    // Validate required fields
    if (!recipientId || !type || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: recipientId, type, content'
      });
    }

    // Validate feedback type
    const validTypes = ['positive', 'constructive', 'action_required', 'question'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid feedback type. Must be one of: positive, constructive, action_required, question'
      });
    }

    // Insert feedback
    const [result] = await pool.query(
      `INSERT INTO feedback (AUTHOR_ID, RECIPIENT_ID, RELATED_TASK_ID, RELATED_DOCUMENT_ID, TYPE, CONTENT, CREATED_AT, IS_READ)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), 0)`,
      [authorId, recipientId, relatedTaskId || null, relatedDocumentId || null, type, content]
    );

    // Create notification for recipient
    await createNotification({
      userId: recipientId,
      type: 'feedback_received',
      title: 'New Feedback Received',
      message: `You have received ${type} feedback`,
      actionUrl: '/staff/feedback'
    });

    res.json({
      success: true,
      message: 'Feedback created successfully',
      feedbackId: result.insertId
    });
  } catch (error) {
    console.error('Create feedback error:', error);
    res.status(500).json({ success: false, error: 'Failed to create feedback' });
  }
};

// Get feedback for a user (received feedback)
exports.getFeedbackForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, unreadOnly } = req.query;

    let query = `
      SELECT 
        f.FEEDBACK_ID,
        f.AUTHOR_ID,
        f.RECIPIENT_ID,
        f.RELATED_TASK_ID,
        f.RELATED_DOCUMENT_ID,
        f.TYPE,
        f.CONTENT,
        f.CREATED_AT,
        f.IS_READ,
        author.NAME as AUTHOR_NAME,
        author.FUNCTIONAL_ROLE as AUTHOR_ROLE,
        recipient.NAME as RECIPIENT_NAME,
        t.TITLE as TASK_TITLE,
        d.TITLE as DOCUMENT_TITLE
      FROM feedback f
      LEFT JOIN user author ON f.AUTHOR_ID = author.USER_ID
      LEFT JOIN user recipient ON f.RECIPIENT_ID = recipient.USER_ID
      LEFT JOIN TASK t ON f.RELATED_TASK_ID = t.TASK_ID
      LEFT JOIN document d ON f.RELATED_DOCUMENT_ID = d.DOCUMENT_ID
      WHERE f.RECIPIENT_ID = ?
    `;

    const params = [userId];

    // Add type filter
    if (type && type !== 'all') {
      query += ' AND f.TYPE = ?';
      params.push(type);
    }

    // Add unread filter
    if (unreadOnly === 'true') {
      query += ' AND f.IS_READ = 0';
    }

    query += ' ORDER BY f.CREATED_AT DESC';

    const [feedback] = await pool.query(query, params);

    // Transform the data to match TaskFeedbackWithDetails interface
    const transformedFeedback = feedback.map(item => ({
      FEEDBACK_ID: item.FEEDBACK_ID,
      AUTHOR_ID: item.AUTHOR_ID,
      RECIPIENT_ID: item.RECIPIENT_ID,
      RELATED_TASK_ID: item.RELATED_TASK_ID,
      RELATED_DOCUMENT_ID: item.RELATED_DOCUMENT_ID,
      TYPE: item.TYPE,
      CONTENT: item.CONTENT,
      CREATED_AT: item.CREATED_AT,
      READ: item.IS_READ === 1 || item.IS_READ === true,
      author: {
        USER_ID: item.AUTHOR_ID,
        NAME: item.AUTHOR_NAME,
        FUNCTIONAL_ROLE: item.AUTHOR_ROLE
      },
      recipient: {
        USER_ID: item.RECIPIENT_ID,
        NAME: item.RECIPIENT_NAME
      },
      relatedTask: item.TASK_TITLE ? {
        TASK_ID: item.RELATED_TASK_ID,
        TITLE: item.TASK_TITLE
      } : undefined,
      relatedDocument: item.DOCUMENT_TITLE ? {
        DOCUMENT_ID: item.RELATED_DOCUMENT_ID,
        TITLE: item.DOCUMENT_TITLE
      } : undefined
    }));

    res.json({
      success: true,
      data: transformedFeedback
    });
  } catch (error) {
    console.error('Get feedback for user error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch feedback' });
  }
};

// Get feedback by document
exports.getFeedbackByDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const [feedback] = await pool.query(
      `SELECT 
        f.FEEDBACK_ID,
        f.AUTHOR_ID,
        f.TYPE,
        f.CONTENT,
        f.CREATED_AT,
        author.NAME as AUTHOR_NAME,
        author.FUNCTIONAL_ROLE as AUTHOR_ROLE
      FROM feedback f
      LEFT JOIN user author ON f.AUTHOR_ID = author.USER_ID
      WHERE f.RELATED_DOCUMENT_ID = ?
      ORDER BY f.CREATED_AT DESC`,
      [documentId]
    );

    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Get feedback by document error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch document feedback' });
  }
};

// Get feedback by task
exports.getFeedbackByTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const [feedback] = await pool.query(
      `SELECT 
        f.FEEDBACK_ID,
        f.AUTHOR_ID,
        f.TYPE,
        f.CONTENT,
        f.CREATED_AT,
        author.NAME as AUTHOR_NAME,
        author.FUNCTIONAL_ROLE as AUTHOR_ROLE
      FROM feedback f
      LEFT JOIN user author ON f.AUTHOR_ID = author.USER_ID
      WHERE f.RELATED_TASK_ID = ?
      ORDER BY f.CREATED_AT DESC`,
      [taskId]
    );

    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Get feedback by task error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch task feedback' });
  }
};

// Mark feedback as read
exports.markFeedbackAsRead = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const userId = req.user.userId;

    // Verify feedback belongs to user
    const [feedback] = await pool.query(
      'SELECT * FROM feedback WHERE FEEDBACK_ID = ? AND RECIPIENT_ID = ?',
      [feedbackId, userId]
    );

    if (feedback.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Feedback not found or does not belong to you'
      });
    }

    await pool.query(
      'UPDATE feedback SET IS_READ = 1 WHERE FEEDBACK_ID = ?',
      [feedbackId]
    );

    res.json({
      success: true,
      message: 'Feedback marked as read'
    });
  } catch (error) {
    console.error('Mark feedback as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark feedback as read' });
  }
};

// Get feedback written by user
exports.getFeedbackWrittenBy = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.query;

    let query = `
      SELECT 
        f.FEEDBACK_ID,
        f.RECIPIENT_ID,
        f.RELATED_TASK_ID,
        f.RELATED_DOCUMENT_ID,
        f.TYPE,
        f.CONTENT,
        f.CREATED_AT,
        recipient.NAME as RECIPIENT_NAME,
        recipient.FUNCTIONAL_ROLE as RECIPIENT_ROLE,
        dr.TITLE as TASK_TITLE,
        d.TITLE as DOCUMENT_TITLE
      FROM feedback f
      LEFT JOIN user recipient ON f.RECIPIENT_ID = recipient.USER_ID
      LEFT JOIN document_requirement dr ON f.RELATED_TASK_ID = dr.REQUIREMENT_ID
      LEFT JOIN document d ON f.RELATED_DOCUMENT_ID = d.DOCUMENT_ID
      WHERE f.AUTHOR_ID = ?
    `;

    const params = [userId];

    if (type && type !== 'all') {
      query += ' AND f.TYPE = ?';
      params.push(type);
    }

    query += ' ORDER BY f.CREATED_AT DESC';

    const [feedback] = await pool.query(query, params);

    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Get feedback written by error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch written feedback' });
  }
};

// Get unread feedback count
exports.getUnreadFeedbackCount = async (req, res) => {
  try {
    const { userId } = req.params;

    const [result] = await pool.query(
      'SELECT COUNT(*) as unread_count FROM feedback WHERE RECIPIENT_ID = ? AND IS_READ = 0',
      [userId]
    );

    res.json({
      success: true,
      count: result[0].unread_count
    });
  } catch (error) {
    console.error('Get unread feedback count error:', error);
    res.status(500).json({ success: false, error: 'Failed to get unread feedback count' });
  }
};

// Helper function to create notifications
async function createNotification({ userId, type, title, message, actionUrl }) {
  try {
    await pool.query(
      `INSERT INTO SYSTEM_NOTIFICATION (USER_ID, TYPE, TITLE, MESSAGE, ACTION_URL, IS_READ, CREATED_AT)
       VALUES (?, ?, ?, ?, ?, 0, NOW())`,
      [userId, type, title, message, actionUrl || null]
    );
  } catch (error) {
    console.error('Create notification error:', error);
  }
}

