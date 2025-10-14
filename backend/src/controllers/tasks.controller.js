const { pool } = require('../config/database');

// Create task assignment
exports.createTask = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      assignedTo, 
      assignedBy,
      dueDate, 
      priority, 
      category, 
      tags, 
      requiresDocument,
      sectionId 
    } = req.body;

    // Validate required fields
    if (!title || !description || !assignedTo || !dueDate || !priority || !assignedBy) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, assignedTo, assignedBy, dueDate, priority'
      });
    }

    // Insert task into TASK table (or document_requirement if TASK doesn't exist)
    const [result] = await pool.query(
      `INSERT INTO TASK (
        TITLE, DESCRIPTION, ASSIGNED_TO, ASSIGNED_BY, DUE_DATE, 
        PRIORITY, STATUS, CATEGORY, TAGS, REQUIRES_DOCUMENT, 
        SECTION_ID, CREATED_AT
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NOW())`,
      [
        title, description, assignedTo, assignedBy, dueDate,
        priority, category || null, tags || null, 
        requiresDocument ? 1 : 0, sectionId || null
      ]
    );

    // Create notification for assigned user
    await pool.query(
      `INSERT INTO SYSTEM_NOTIFICATION (
        USER_ID, TYPE, TITLE, MESSAGE, ACTION_URL, 
        RELATED_TASK_ID, IS_READ, CREATED_AT
      ) VALUES (?, 'task_assigned', 'New Task Assigned', ?, '/staff/tasks', ?, 0, NOW())`,
      [assignedTo, `You have been assigned a new task: ${title}`, result.insertId]
    );

    res.json({
      success: true,
      message: 'Task created successfully',
      data: { TASK_ID: result.insertId }
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get tasks assigned to a user
exports.getTasksAssignedTo = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, overdue } = req.query;

    let query = `
      SELECT 
        t.TASK_ID,
        t.TITLE,
        t.DESCRIPTION,
        t.ASSIGNED_TO,
        t.ASSIGNED_BY,
        t.DUE_DATE,
        t.PRIORITY,
        t.CATEGORY,
        t.TAGS,
        t.STATUS,
        t.CREATED_AT,
        t.UPDATED_AT,
        t.REQUIRES_DOCUMENT,
        t.SECTION_ID,
        t.LINKED_DOCUMENT_ID,
        assigner.NAME as ASSIGNED_BY_NAME,
        assignee.NAME as ASSIGNED_TO_NAME,
        s.NAME as SECTION_NAME,
        d.DOCUMENT_ID as DOC_LINKED_DOCUMENT_ID,
        d.TITLE as DOC_TITLE,
        d.DESCRIPTION as DOC_DESCRIPTION,
        d.FILE_LINK as DOC_FILE_LINK,
        d.FINGERPRINT_HASH as DOC_FINGERPRINT_HASH,
        d.CREATED_AT as DOC_CREATED_AT,
        d.TAGS as DOC_TAGS,
        doc_creator.NAME as DOC_CREATED_BY_NAME
      FROM TASK t
      LEFT JOIN user assigner ON t.ASSIGNED_BY = assigner.USER_ID
      LEFT JOIN user assignee ON t.ASSIGNED_TO = assignee.USER_ID
      LEFT JOIN section s ON t.SECTION_ID = s.SECTION_ID
      LEFT JOIN document d ON t.LINKED_DOCUMENT_ID = d.DOCUMENT_ID
      LEFT JOIN user doc_creator ON d.CREATED_BY = doc_creator.USER_ID
      WHERE t.ASSIGNED_TO = ?
    `;

    const params = [userId];

    // Add status filter
    if (status && status !== 'all') {
      query += ' AND t.STATUS = ?';
      params.push(status);
    }

    // Add overdue filter
    if (overdue === 'true') {
      query += ' AND t.DUE_DATE < CURDATE() AND t.STATUS != "completed"';
    }

    query += ' ORDER BY t.DUE_DATE ASC, t.PRIORITY DESC';

    const [rawTasks] = await pool.query(query, params);
    console.log(`Found ${rawTasks.length} tasks for user ${userId}`);
    if (rawTasks.length > 0) {
      console.log('Sample task with linked document:', rawTasks[0]);
    }

    // Transform the flat query results into nested structure
    const tasks = rawTasks.map(task => ({
      TASK_ID: task.TASK_ID,
      TITLE: task.TITLE,
      DESCRIPTION: task.DESCRIPTION,
      ASSIGNED_TO: task.ASSIGNED_TO,
      ASSIGNED_BY: task.ASSIGNED_BY,
      DUE_DATE: task.DUE_DATE,
      PRIORITY: task.PRIORITY,
      CATEGORY: task.CATEGORY,
      TAGS: task.TAGS,
      STATUS: task.STATUS,
      CREATED_AT: task.CREATED_AT,
      UPDATED_AT: task.UPDATED_AT,
      REQUIRES_DOCUMENT: task.REQUIRES_DOCUMENT,
      SECTION_ID: task.SECTION_ID,
      LINKED_DOCUMENT_ID: task.LINKED_DOCUMENT_ID,
      ASSIGNED_BY_NAME: task.ASSIGNED_BY_NAME,
      ASSIGNED_TO_NAME: task.ASSIGNED_TO_NAME,
      SECTION_NAME: task.SECTION_NAME,
      linkedDocument: task.DOC_LINKED_DOCUMENT_ID ? {
        DOCUMENT_ID: task.DOC_LINKED_DOCUMENT_ID,
        TITLE: task.DOC_TITLE,
        DESCRIPTION: task.DOC_DESCRIPTION,
        FILE_LINK: task.DOC_FILE_LINK,
        FINGERPRINT_HASH: task.DOC_FINGERPRINT_HASH,
        CREATED_AT: task.DOC_CREATED_AT,
        TAGS: task.DOC_TAGS,
        CREATED_BY_NAME: task.DOC_CREATED_BY_NAME
      } : null
    }));

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Get tasks assigned to error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
};

// Get tasks created by a user
exports.getTasksAssignedBy = async (req, res) => {
  try {
    console.log('getTasksAssignedBy called with userId:', req.params.userId);
    const { userId } = req.params;
    const { status } = req.query;

    let query = `
      SELECT 
        t.TASK_ID,
        t.TITLE,
        t.DESCRIPTION,
        t.ASSIGNED_TO,
        t.ASSIGNED_BY,
        t.DUE_DATE,
        t.PRIORITY,
        t.CATEGORY,
        t.TAGS,
        t.STATUS,
        t.CREATED_AT,
        t.UPDATED_AT,
        t.REQUIRES_DOCUMENT,
        t.SECTION_ID,
        t.LINKED_DOCUMENT_ID,
        assignee.NAME as ASSIGNED_TO_NAME,
        s.NAME as SECTION_NAME,
        d.DOCUMENT_ID as DOC_LINKED_DOCUMENT_ID,
        d.TITLE as DOC_TITLE,
        d.DESCRIPTION as DOC_DESCRIPTION,
        d.FILE_LINK as DOC_FILE_LINK,
        d.FINGERPRINT_HASH as DOC_FINGERPRINT_HASH,
        d.CREATED_AT as DOC_CREATED_AT,
        d.TAGS as DOC_TAGS,
        doc_creator.NAME as DOC_CREATED_BY_NAME
      FROM TASK t
      LEFT JOIN user assignee ON t.ASSIGNED_TO = assignee.USER_ID
      LEFT JOIN section s ON t.SECTION_ID = s.SECTION_ID
      LEFT JOIN document d ON t.LINKED_DOCUMENT_ID = d.DOCUMENT_ID
      LEFT JOIN user doc_creator ON d.CREATED_BY = doc_creator.USER_ID
      WHERE t.ASSIGNED_BY = ?
    `;

    const params = [userId];

    if (status && status !== 'all') {
      query += ' AND t.STATUS = ?';
      params.push(status);
    }

    query += ' ORDER BY t.CREATED_AT DESC';

    console.log('Executing query:', query);
    console.log('With params:', params);

    const [rawTasks] = await pool.query(query, params);
    console.log('Query result:', rawTasks.length, 'tasks found');
    if (rawTasks.length > 0) {
      console.log('Sample task with linked document:', rawTasks[0]);
    }

    // Transform the flat query results into nested structure
    const tasks = rawTasks.map(task => ({
      TASK_ID: task.TASK_ID,
      TITLE: task.TITLE,
      DESCRIPTION: task.DESCRIPTION,
      ASSIGNED_TO: task.ASSIGNED_TO,
      ASSIGNED_BY: task.ASSIGNED_BY,
      DUE_DATE: task.DUE_DATE,
      PRIORITY: task.PRIORITY,
      CATEGORY: task.CATEGORY,
      TAGS: task.TAGS,
      STATUS: task.STATUS,
      CREATED_AT: task.CREATED_AT,
      UPDATED_AT: task.UPDATED_AT,
      REQUIRES_DOCUMENT: task.REQUIRES_DOCUMENT,
      SECTION_ID: task.SECTION_ID,
      LINKED_DOCUMENT_ID: task.LINKED_DOCUMENT_ID,
      ASSIGNED_TO_NAME: task.ASSIGNED_TO_NAME,
      SECTION_NAME: task.SECTION_NAME,
      linkedDocument: task.DOC_LINKED_DOCUMENT_ID ? {
        DOCUMENT_ID: task.DOC_LINKED_DOCUMENT_ID,
        TITLE: task.DOC_TITLE,
        DESCRIPTION: task.DOC_DESCRIPTION,
        FILE_LINK: task.DOC_FILE_LINK,
        FINGERPRINT_HASH: task.DOC_FINGERPRINT_HASH,
        CREATED_AT: task.DOC_CREATED_AT,
        TAGS: task.DOC_TAGS,
        CREATED_BY_NAME: task.DOC_CREATED_BY_NAME
      } : null
    }));

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Get tasks assigned by error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sql: error.sql
    });
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
};

// Update task status
exports.updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: pending, in_progress, completed, cancelled'
      });
    }

    // Check if user has permission to update this task
    const [tasks] = await pool.query(
      'SELECT * FROM TASK WHERE TASK_ID = ? AND ASSIGNED_TO = ?',
      [taskId, userId]
    );

    if (tasks.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You can only update tasks assigned to you'
      });
    }

    const updateFields = ['STATUS = ?', 'UPDATED_AT = NOW()'];
    const params = [status];

    // Add COMPLETED_AT when status is completed
    if (status === 'completed') {
      updateFields.push('COMPLETED_AT = NOW()');
    }

    await pool.query(
      `UPDATE TASK SET ${updateFields.join(', ')} WHERE TASK_ID = ?`,
      [...params, taskId]
    );

    // Create notification for task creator if completed
    if (status === 'completed') {
      const task = tasks[0];
      await createNotification({
        userId: task.ASSIGNED_BY,
        type: 'task_completed',
        title: 'Task Completed',
        message: `Task "${task.TITLE}" has been completed`,
        actionUrl: '/section-unit-head/tasks'
      });
    }

    res.json({
      success: true,
      message: 'Task status updated successfully'
    });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update task status' });
  }
};

// Mark task complete
exports.completeTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;

    // Ensure the task exists and belongs to user
    const [tasks] = await pool.query('SELECT * FROM TASK WHERE TASK_ID = ? AND ASSIGNED_TO = ?', [taskId, userId]);
    if (tasks.length === 0) {
      return res.status(403).json({ success: false, error: 'You can only update tasks assigned to you' });
    }

    // Optional: ensure there is at least one attachment
    const [docs] = await pool.query('SELECT COUNT(1) as cnt FROM document WHERE ASSIGNED_TO = ?', [taskId]);
    if (docs[0]?.cnt === 0) {
      return res.status(400).json({ success: false, error: 'At least one attachment is required to complete the task' });
    }

    await pool.query(
      'UPDATE TASK SET STATUS = "completed", COMPLETED_AT = NOW(), UPDATED_AT = NOW() WHERE TASK_ID = ? AND ASSIGNED_TO = ?',
      [taskId, userId]
    );

    res.json({
      success: true,
      message: 'Task marked as complete'
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ success: false, error: 'Failed to complete task' });
  }
};

// Submit task (lock attachments)
exports.submitTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;

    // Ensure the task exists and belongs to user
    const [tasks] = await pool.query('SELECT * FROM TASK WHERE TASK_ID = ? AND ASSIGNED_TO = ?', [taskId, userId]);
    if (tasks.length === 0) {
      return res.status(403).json({ success: false, error: 'You can only submit tasks assigned to you' });
    }

    // Allow submission even without attachments (for "Mark as Done" functionality)

    await pool.query('UPDATE TASK SET STATUS = "submitted", UPDATED_AT = NOW() WHERE TASK_ID = ? AND ASSIGNED_TO = ?', [taskId, userId]);

    res.json({ success: true, message: 'Task submitted' });
  } catch (error) {
    console.error('Submit task error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit task' });
  }
};

// Unsubmit task (unlock attachments)
exports.unsubmitTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;

    // Ensure the task exists and belongs to user
    const [tasks] = await pool.query('SELECT * FROM TASK WHERE TASK_ID = ? AND ASSIGNED_TO = ?', [taskId, userId]);
    if (tasks.length === 0) {
      return res.status(403).json({ success: false, error: 'You can only unsubmit tasks assigned to you' });
    }

    await pool.query('UPDATE TASK SET STATUS = "in_progress", UPDATED_AT = NOW() WHERE TASK_ID = ? AND ASSIGNED_TO = ?', [taskId, userId]);

    res.json({ success: true, message: 'Task unsubmitted' });
  } catch (error) {
    console.error('Unsubmit task error:', error);
    res.status(500).json({ success: false, error: 'Failed to unsubmit task' });
  }
};

// Delete task (only by creator)
exports.deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;

    // Check if user created this task
    const [tasks] = await pool.query(
      'SELECT * FROM TASK WHERE TASK_ID = ? AND ASSIGNED_BY = ?',
      [taskId, userId]
    );

    if (tasks.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete tasks you created'
      });
    }

    await pool.query('DELETE FROM TASK WHERE TASK_ID = ?', [taskId]);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
};

// Get overdue tasks
exports.getOverdueTasks = async (req, res) => {
  try {
    const { userId } = req.params;

    const [tasks] = await pool.query(
      `SELECT 
        t.TASK_ID,
        t.TITLE,
        t.DESCRIPTION,
        t.DUE_DATE,
        t.PRIORITY,
        t.STATUS,
        DATEDIFF(CURDATE(), t.DUE_DATE) as DAYS_OVERDUE
      FROM TASK t
      WHERE t.ASSIGNED_TO = ? 
        AND t.DUE_DATE < CURDATE() 
        AND t.STATUS != 'completed'
      ORDER BY t.DUE_DATE ASC`,
      [userId]
    );

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Get overdue tasks error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch overdue tasks' });
  }
};

// Link document to task
exports.linkDocumentToTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { documentId } = req.body;

    // Update task status to in_progress
    await pool.query(
      'UPDATE document_requirement SET STATUS = "in_progress" WHERE REQUIREMENT_ID = ?',
      [taskId]
    );

    // Update document to link to task
    await pool.query(
      'UPDATE document SET FULFILLS_TASK_ID = ? WHERE DOCUMENT_ID = ?',
      [taskId, documentId]
    );

    res.json({
      success: true,
      message: 'Document linked to task successfully'
    });
  } catch (error) {
    console.error('Link document to task error:', error);
    res.status(500).json({ success: false, error: 'Failed to link document to task' });
  }
};

// Get documents linked to a specific task
exports.getDocumentsForTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const [documents] = await pool.query(
      `SELECT 
        d.DOCUMENT_ID,
        d.TITLE,
        d.DESCRIPTION,
        d.FILE_LINK,
        d.FINGERPRINT_HASH,
        d.CREATED_AT,
        d.TAGS,
        creator.NAME as CREATED_BY_NAME,
        ds.STATUS as CURRENT_STATUS,
        ds.REMARKS as CURRENT_REMARKS,
        ds.CREATED_AT as STATUS_DATE
      FROM document d
      LEFT JOIN user creator ON d.CREATED_BY = creator.USER_ID
      LEFT JOIN (
        SELECT DOCUMENT_ID, STATUS, REMARKS, CREATED_AT
        FROM document_status 
        WHERE STATUS_ID IN (
          SELECT MAX(STATUS_ID) 
          FROM document_status 
          GROUP BY DOCUMENT_ID
        )
      ) ds ON d.DOCUMENT_ID = ds.DOCUMENT_ID
      WHERE d.ASSIGNED_TO = ?
      ORDER BY d.CREATED_AT DESC`,
      [taskId]
    );

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Get documents for task error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch documents for task' });
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
