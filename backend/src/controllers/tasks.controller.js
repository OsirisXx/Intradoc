const { pool } = require('../config/database');

// Create task assignment (supports single or multiple assignees via assignedToIds)
exports.createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      assignedTo, // backward compatibility (single)
      assignedToIds, // new (array)
      assignedBy,
      dueDate,
      priority,
      category,
      tags,
      requiresDocument,
      sectionId
    } = req.body;

    // Validate required fields (excluding assignees which are normalized below)
    if (!title || !description || !dueDate || !priority || !assignedBy) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, assignedBy, dueDate, priority'
      });
    }

    // Normalize recipients
    let recipients = [];
    if (Array.isArray(assignedToIds) && assignedToIds.length > 0) {
      recipients = assignedToIds
        .map(id => parseInt(id, 10))
        .filter(id => Number.isFinite(id));
    } else if (assignedTo !== undefined && assignedTo !== null) {
      const single = parseInt(assignedTo, 10);
      if (Number.isFinite(single)) recipients = [single];
    }

    if (recipients.length === 0) {
      return res.status(400).json({ success: false, error: 'No assignees provided' });
    }

    const createdTaskIds = [];

    for (const userId of recipients) {
      const [result] = await pool.query(
        `INSERT INTO TASK (
          TITLE, DESCRIPTION, ASSIGNED_TO, ASSIGNED_BY, DUE_DATE,
          PRIORITY, STATUS, CATEGORY, TAGS, REQUIRES_DOCUMENT,
          SECTION_ID, CREATED_AT
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NOW())`,
        [
          title,
          description,
          userId,
          assignedBy,
          dueDate,
          priority,
          category || null,
          tags || null,
          requiresDocument ? 1 : 0,
          sectionId || null
        ]
      );

      createdTaskIds.push(result.insertId);

      await pool.query(
        `INSERT INTO SYSTEM_NOTIFICATION (
          USER_ID, TYPE, TITLE, MESSAGE, ACTION_URL,
          RELATED_TASK_ID, IS_READ, CREATED_AT
        ) VALUES (?, 'task_assigned', 'New Task Assigned', ?, '/staff/tasks', ?, 0, NOW())`,
        [userId, `You have been assigned a new task: ${title}`, result.insertId]
      );
    }

    res.json({
      success: true,
      message: recipients.length > 1 ? 'Tasks created successfully' : 'Task created successfully',
      data: recipients.length > 1 ? { TASK_IDS: createdTaskIds } : { TASK_ID: createdTaskIds[0] }
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
        t.STATUS as TASK_STATUS,
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
        AND NOT EXISTS (
          SELECT 1 FROM archive a
          WHERE a.TASK_ID = t.TASK_ID AND a.VIEWER_USER_ID = ? AND a.CONTEXT = 'assigned_to'
        )
    `;

    const params = [userId, userId];

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
      STATUS: task.TASK_STATUS,
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
        t.STATUS as TASK_STATUS,
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
        AND NOT EXISTS (
          SELECT 1 FROM archive a
          WHERE a.TASK_ID = t.TASK_ID AND a.VIEWER_USER_ID = ? AND a.CONTEXT = 'assigned_by'
        )
    `;

    const params = [userId, userId];

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
      STATUS: task.TASK_STATUS,
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
      
      // Get the role of the user who assigned the task to determine correct URL
      const [assignedByUser] = await pool.query('SELECT FUNCTIONAL_ROLE FROM user WHERE USER_ID = ?', [task.ASSIGNED_BY]);
      const userRole = assignedByUser.length > 0 ? assignedByUser[0].FUNCTIONAL_ROLE : 'section_unit_head';
      
      // Determine the correct action URL based on user role
      let actionUrl;
      if (userRole === 'division_manager') {
        actionUrl = `/division-manager/task-assignment/${task.TASK_ID}`;
      } else if (userRole === 'regional_director') {
        actionUrl = `/regional-director/task-assignment/${task.TASK_ID}`;
      } else {
        actionUrl = `/section-unit-head/work/${task.TASK_ID}`;
      }
      
      await createNotification({
        userId: task.ASSIGNED_BY,
        type: 'task_completed',
        title: 'Task Completed',
        message: `Task "${task.TITLE}" has been completed`,
        actionUrl: actionUrl
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

    const task = tasks[0];

    // Allow submission even without attachments (for "Mark as Done" functionality)
    await pool.query('UPDATE TASK SET STATUS = "completed", UPDATED_AT = NOW() WHERE TASK_ID = ? AND ASSIGNED_TO = ?', [taskId, userId]);

    // Get all documents linked to this task and set them to "Submitted" status
    const [documents] = await pool.query(
      'SELECT * FROM document WHERE ASSIGNED_TO = ?',
      [taskId]
    );

    // Update document statuses to "Submitted" for review
    for (const doc of documents) {
      // Insert new document status
      await pool.query(
        'INSERT INTO document_status (DOCUMENT_ID, STATUS, REMARKS, CREATED_AT) VALUES (?, ?, ?, NOW())',
        [doc.DOCUMENT_ID, 'Submitted', 'Task submitted for review']
      );
    }

    // Get the role of the user who assigned the task to determine correct URL
    const [assignedByUser] = await pool.query('SELECT FUNCTIONAL_ROLE FROM user WHERE USER_ID = ?', [task.ASSIGNED_BY]);
    const assignedByRole = assignedByUser.length > 0 ? assignedByUser[0].FUNCTIONAL_ROLE : 'section_unit_head';
    
    // Determine the correct action URL based on user role
    let actionUrl;
    if (assignedByRole === 'division_manager') {
      actionUrl = `/division-manager/task-assignment/${task.TASK_ID}`;
    } else if (assignedByRole === 'regional_director') {
      actionUrl = `/regional-director/task-assignment/${task.TASK_ID}`;
    } else {
      actionUrl = `/section-unit-head/work/${task.TASK_ID}`;
    }

    // Notify the user who assigned the task that it's ready for review
    await createNotification({
      userId: task.ASSIGNED_BY,
      type: 'task_submitted',
      title: 'Task Submitted for Review',
      message: `Task "${task.TITLE}" has been submitted and is ready for review`,
      actionUrl: actionUrl
    });

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

    // Also revert document statuses so attachments are no longer shown as Submitted
    const [documents] = await pool.query(
      'SELECT DOCUMENT_ID FROM document WHERE ASSIGNED_TO = ?',
      [taskId]
    );
    for (const doc of documents) {
      await pool.query(
        'INSERT INTO document_status (DOCUMENT_ID, STATUS, REMARKS, CREATED_AT) VALUES (?, ?, ?, NOW())',
        [doc.DOCUMENT_ID, 'Draft', 'Unsubmitted by assignee']
      );
    }

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

    const [rawTasks] = await pool.query(
      `SELECT 
        t.TASK_ID,
        t.TITLE,
        t.DESCRIPTION,
        t.DUE_DATE,
        t.PRIORITY,
        t.STATUS as TASK_STATUS,
        DATEDIFF(CURDATE(), t.DUE_DATE) as DAYS_OVERDUE
      FROM TASK t
      WHERE t.ASSIGNED_TO = ? 
        AND t.DUE_DATE < CURDATE() 
        AND t.STATUS != 'completed'
      ORDER BY t.DUE_DATE ASC`,
      [userId]
    );

    // Transform to map TASK_STATUS back to STATUS
    const tasks = rawTasks.map(task => ({
      ...task,
      STATUS: task.TASK_STATUS
    }));

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

// Get approval history for a specific task by a specific user
exports.getTaskApprovalHistory = async (req, res) => {
  try {
    const { taskId, userId } = req.params;

    // Get approval history for documents in this task by the specified user
    // Only show approvals for documents currently assigned to this specific task
    // Deduplicate by FINGERPRINT_HASH to show only one approval per unique document
    const [approvals] = await pool.query(
      `SELECT 
        da.APPROVAL_ID,
        da.DOCUMENT_ID,
        da.USER_ID,
        da.ROLE,
        da.STATUS,
        da.REMARKS,
        da.DATE_APPROVED,
        d.TITLE as DOCUMENT_TITLE,
        d.FINGERPRINT_HASH,
        u.NAME as APPROVER_NAME,
        CASE 
          WHEN da.DOCUMENT_ID < 0 THEN 'Task Approval'
          ELSE d.TITLE 
        END as DISPLAY_TITLE
      FROM document_approval da
      LEFT JOIN document d ON da.DOCUMENT_ID = d.DOCUMENT_ID
      LEFT JOIN user u ON da.USER_ID = u.USER_ID
      WHERE da.USER_ID = ? AND (
        -- Show approvals for documents currently assigned to this task
        (d.ASSIGNED_TO = ? AND d.DOCUMENT_ID > 0) OR 
        -- Show virtual task approvals (for tasks without documents)
        (da.DOCUMENT_ID = -? AND EXISTS (
          SELECT 1 FROM TASK t WHERE t.TASK_ID = ? AND (t.ASSIGNED_BY = da.USER_ID OR t.ASSIGNED_TO = da.USER_ID)
        ))
      ) AND (
        -- Exclude approvals for forwarded documents (documents with "(Forwarded)" in title)
        d.TITLE NOT LIKE '%(Forwarded)%' OR d.TITLE IS NULL
      )
      ORDER BY da.DATE_APPROVED DESC`,
      [userId, taskId, taskId, taskId]
    );

    // Deduplicate approval history by FINGERPRINT_HASH
    // Keep only the most recent approval for each unique document (by fingerprint hash)
    const deduplicatedApprovals = [];
    const fingerprintMap = new Map();
    
    approvals.forEach(approval => {
      const fingerprintHash = approval.FINGERPRINT_HASH;
      
      // For virtual task approvals (DOCUMENT_ID < 0), don't deduplicate
      if (approval.DOCUMENT_ID < 0) {
        deduplicatedApprovals.push(approval);
        return;
      }
      
      // For regular documents, deduplicate by fingerprint hash
      if (!fingerprintHash) {
        // If no fingerprint hash, include it (shouldn't happen but safety check)
        deduplicatedApprovals.push(approval);
        return;
      }
      
      const existing = fingerprintMap.get(fingerprintHash);
      if (!existing) {
        fingerprintMap.set(fingerprintHash, approval);
        deduplicatedApprovals.push(approval);
      } else {
        // Keep the most recent approval (already sorted by DATE_APPROVED DESC)
        // So the first occurrence is the most recent
        // No need to replace, just skip
      }
    });

    console.log('Approval history query result for task', taskId, 'user', userId, ':', approvals);
    console.log('Deduplicated approval history:', deduplicatedApprovals);
    console.log('Query parameters:', { userId, taskId });

    res.json({
      success: true,
      data: deduplicatedApprovals
    });
  } catch (error) {
    console.error('Get task approval history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch approval history for task' });
  }
};

// Get documents linked to a specific task
exports.getDocumentsForTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    // Get task details and current user info for visibility control
    const [taskDetails] = await pool.query('SELECT STATUS, ASSIGNED_TO, ASSIGNED_BY FROM TASK WHERE TASK_ID = ?', [taskId]);
    const task = taskDetails[0];
    const currentUserId = req.user.userId;
    const currentUserRole = req.user.role;
    
    // Determine if forwarded documents should be visible
    const canSeeForwardedDocuments = () => {
      if (!task) return false;
      
      // Section Unit Head can see forwarded documents in their own task immediately
      if (currentUserRole === 'section_unit_head' && task.ASSIGNED_TO === currentUserId) {
        return true; // Section Unit Head can see forwarded documents in their own task
      }
      
      // Division Manager can see forwarded documents in Section Unit Head's task after it's completed
      if (currentUserRole === 'division_manager' && task.ASSIGNED_BY === currentUserId) {
        return task.STATUS === 'completed'; // Only after Section Unit Head submits
      }
      
      // For other roles, use default behavior
      return task.STATUS === 'completed';
    };

    const [documents] = await pool.query(
      `SELECT 
        d.DOCUMENT_ID,
        d.TITLE,
        d.DESCRIPTION,
        d.FILE_LINK,
        d.FINGERPRINT_HASH,
        d.CREATED_AT,
        d.TAGS,
        d.CREATED_BY,
        creator.NAME as CREATED_BY_NAME,
        ds.STATUS_ID,
        ds.STATUS as CURRENT_STATUS,
        ds.REMARKS as CURRENT_REMARKS,
        ds.CREATED_AT as STATUS_DATE
      FROM document d
      LEFT JOIN user creator ON d.CREATED_BY = creator.USER_ID
      LEFT JOIN (
        SELECT STATUS_ID, DOCUMENT_ID, STATUS, REMARKS, CREATED_AT
        FROM document_status 
        WHERE STATUS_ID IN (
          SELECT MAX(STATUS_ID) 
          FROM document_status 
          GROUP BY DOCUMENT_ID
        )
      ) ds ON d.DOCUMENT_ID = ds.DOCUMENT_ID
      WHERE d.ASSIGNED_TO = ? AND (
        -- Show all documents if user can see forwarded documents
        ? = 1 OR 
        -- If user cannot see forwarded documents, hide them (documents with "(Forwarded)" in title)
        d.TITLE NOT LIKE '%(Forwarded)%'
      )
      ORDER BY d.CREATED_AT DESC`,
      [taskId, canSeeForwardedDocuments() ? 1 : 0]
    );

    // Transform documents to match DocumentWithDetails structure
    const transformedDocuments = documents.map(doc => ({
      ...doc,
      CREATED_BY: doc.CREATED_BY,
      CREATED_BY_NAME: doc.CREATED_BY_NAME,
      currentStatus: doc.CURRENT_STATUS ? {
        STATUS_ID: doc.STATUS_ID,
        DOCUMENT_ID: doc.DOCUMENT_ID,
        STATUS: doc.CURRENT_STATUS,
        REMARKS: doc.CURRENT_REMARKS,
        CREATED_AT: doc.STATUS_DATE
      } : null
    }));

    res.json({
      success: true,
      data: transformedDocuments
    });
  } catch (error) {
    console.error('Get documents for task error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch documents for task' });
  }
};

// Approve task documents (Section Unit Head)
exports.approveTaskDocuments = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { forwardToDivision, remarks } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!['section_unit_head', 'division_manager'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Only Section Unit Heads and Division Managers can approve task documents' });
    }

    // Get task details
    const [tasks] = await pool.query('SELECT * FROM TASK WHERE TASK_ID = ?', [taskId]);
    if (tasks.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const task = tasks[0];

    // Check permissions based on role
    if (userRole === 'section_unit_head' && task.ASSIGNED_BY !== userId) {
      return res.status(403).json({ success: false, error: 'You can only approve tasks assigned by you' });
    }
    if (userRole === 'division_manager' && task.ASSIGNED_BY !== userId) {
      return res.status(403).json({ success: false, error: 'You can only approve tasks assigned by you' });
    }

    // Check if user has already approved/rejected this task
    const [existingApprovals] = await pool.query(
      `SELECT da.APPROVAL_ID, da.STATUS 
       FROM document_approval da
       LEFT JOIN document d ON da.DOCUMENT_ID = d.DOCUMENT_ID
       WHERE da.USER_ID = ? AND (
         d.ASSIGNED_TO = ? OR 
         (da.DOCUMENT_ID = -? AND EXISTS (
           SELECT 1 FROM TASK t WHERE t.TASK_ID = ? AND t.ASSIGNED_BY = da.USER_ID
         ))
       )`,
      [userId, taskId, taskId, taskId]
    );

    if (existingApprovals.length > 0) {
      const hasApproved = existingApprovals.some(approval => approval.STATUS === 1);
      const hasRejected = existingApprovals.some(approval => approval.STATUS === 0);
      
      if (hasApproved) {
        return res.status(400).json({ success: false, error: 'You have already approved this task' });
      }
      if (hasRejected) {
        return res.status(400).json({ success: false, error: 'You have already rejected this task' });
      }
    }

    // Get all documents linked to this task
    const [documents] = await pool.query(
      'SELECT * FROM document WHERE ASSIGNED_TO = ?',
      [taskId]
    );

    // Allow approving tasks even without documents
    let newStatus;
    let approvalMessage;
    
    if (userRole === 'section_unit_head') {
      newStatus = forwardToDivision ? 'Under_Division_Review' : 'Approved';
      approvalMessage = remarks || 'Approved by Section Unit Head';
    } else if (userRole === 'division_manager') {
      newStatus = 'Approved'; // Division Manager approval is final
      approvalMessage = remarks || 'Approved by Division Manager';
    }

    // Update document statuses and create approval records (if documents exist)
    for (const doc of documents) {
      // Insert new document status
      await pool.query(
        'INSERT INTO document_status (DOCUMENT_ID, STATUS, REMARKS, CREATED_AT) VALUES (?, ?, ?, NOW())',
        [doc.DOCUMENT_ID, newStatus, approvalMessage]
      );

      // Create approval record
      await pool.query(
        'INSERT INTO document_approval (DOCUMENT_ID, USER_ID, ROLE, STATUS, REMARKS, DATE_APPROVED) VALUES (?, ?, ?, 1, ?, NOW())',
        [doc.DOCUMENT_ID, userId, userRole, approvalMessage]
      );
    }

    // For tasks without documents, we need a different approach since DOCUMENT_ID cannot be NULL
    // We'll create a special "virtual document" entry or use a different tracking mechanism
    if (documents.length === 0) {
      // Create a special entry in document_approval with a placeholder document_id
      // We'll use a negative task_id as a unique identifier for document-less approvals
      const virtualDocumentId = -parseInt(taskId); // Use negative task_id as virtual document_id
      
      await pool.query(
        'INSERT INTO document_approval (DOCUMENT_ID, USER_ID, ROLE, STATUS, REMARKS, DATE_APPROVED) VALUES (?, ?, ?, 1, ?, NOW())',
        [virtualDocumentId, userId, userRole, approvalMessage]
      );
    }

    // Send notifications
    await notifyTaskDocumentApproval(task, documents, newStatus, remarks, userId, userRole, forwardToDivision);

    // Update message based on whether documents exist and role
    let message;
    if (userRole === 'section_unit_head') {
      if (documents.length > 0) {
        message = forwardToDivision ? 'Task documents approved and forwarded to Division Manager' : 'Task documents approved';
      } else {
        message = forwardToDivision ? 'Task approved and forwarded to Division Manager' : 'Task approved';
      }
    } else if (userRole === 'division_manager') {
      message = documents.length > 0 ? 'Task documents approved successfully' : 'Task approved successfully';
    }

    res.json({
      success: true,
      message: message
    });
  } catch (error) {
    console.error('Approve task documents error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve task documents' });
  }
};

// Reject task documents
exports.rejectTaskDocuments = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { remarks } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!['section_unit_head', 'division_manager'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Unauthorized to reject task documents' });
    }

    if (!remarks || remarks.trim() === '') {
      return res.status(400).json({ success: false, error: 'Rejection remarks are required' });
    }

    // Get task details
    const [tasks] = await pool.query('SELECT * FROM TASK WHERE TASK_ID = ?', [taskId]);
    if (tasks.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const task = tasks[0];

    // Check permissions based on role
    if (userRole === 'section_unit_head' && task.ASSIGNED_BY !== userId) {
      return res.status(403).json({ success: false, error: 'You can only reject tasks assigned by you' });
    }
    if (userRole === 'division_manager' && task.ASSIGNED_BY !== userId) {
      return res.status(403).json({ success: false, error: 'You can only reject tasks assigned by you' });
    }

    // Check if user has already approved/rejected this task
    const [existingApprovals] = await pool.query(
      `SELECT da.APPROVAL_ID, da.STATUS 
       FROM document_approval da
       LEFT JOIN document d ON da.DOCUMENT_ID = d.DOCUMENT_ID
       WHERE da.USER_ID = ? AND (
         d.ASSIGNED_TO = ? OR 
         (da.DOCUMENT_ID = -? AND EXISTS (
           SELECT 1 FROM TASK t WHERE t.TASK_ID = ? AND (t.ASSIGNED_BY = da.USER_ID OR t.ASSIGNED_TO = da.USER_ID)
         ))
       )`,
      [userId, taskId, taskId, taskId]
    );

    if (existingApprovals.length > 0) {
      const hasApproved = existingApprovals.some(approval => approval.STATUS === 1);
      const hasRejected = existingApprovals.some(approval => approval.STATUS === 0);
      
      if (hasApproved) {
        return res.status(400).json({ success: false, error: 'You have already approved this task' });
      }
      if (hasRejected) {
        return res.status(400).json({ success: false, error: 'You have already rejected this task' });
      }
    }

    // Get all documents linked to this task
    const [documents] = await pool.query(
      'SELECT * FROM document WHERE ASSIGNED_TO = ?',
      [taskId]
    );

    // Allow rejecting tasks even without documents (document-less rejection)
    // Update document statuses and create rejection records (if documents exist)
    for (const doc of documents) {
      // Insert new document status
      await pool.query(
        'INSERT INTO document_status (DOCUMENT_ID, STATUS, REMARKS, CREATED_AT) VALUES (?, ?, ?, NOW())',
        [doc.DOCUMENT_ID, 'Rejected', remarks]
      );

      // Create rejection record
      await pool.query(
        'INSERT INTO document_approval (DOCUMENT_ID, USER_ID, ROLE, STATUS, REMARKS, DATE_APPROVED) VALUES (?, ?, ?, 0, ?, NOW())',
        [doc.DOCUMENT_ID, userId, userRole, remarks]
      );
    }

    // For tasks without documents, create a special rejection record with virtual document_id
    if (documents.length === 0) {
      const virtualDocumentId = -parseInt(taskId); // Use negative task_id as virtual document_id
      
      await pool.query(
        'INSERT INTO document_approval (DOCUMENT_ID, USER_ID, ROLE, STATUS, REMARKS, DATE_APPROVED) VALUES (?, ?, ?, 0, ?, NOW())',
        [virtualDocumentId, userId, userRole, remarks]
      );
    }

    // Send rejection notification to staff
    await createNotification({
      userId: task.ASSIGNED_TO,
      type: 'task_rejected',
      title: 'Task Documents Rejected',
      message: `Your task "${task.TITLE}" documents have been rejected. Reason: ${remarks}`,
      actionUrl: '/staff/work'
    });

    // Update message based on whether documents exist
    let message;
    if (documents.length > 0) {
      message = 'Task documents rejected';
    } else {
      message = 'Task rejected';
    }

    res.json({
      success: true,
      message: message
    });
  } catch (error) {
    console.error('Reject task documents error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject task documents' });
  }
};

// Forward task to Division Manager
exports.forwardTaskToDivisionManager = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { remarks, targetDivisionManagerId, targetTaskId } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole !== 'section_unit_head') {
      return res.status(403).json({ success: false, error: 'Only Section Unit Heads can forward tasks to Division Manager' });
    }

    // Get task details
    const [tasks] = await pool.query('SELECT * FROM TASK WHERE TASK_ID = ?', [taskId]);
    if (tasks.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const task = tasks[0];

    // Check if user has permission
    if (task.ASSIGNED_BY !== userId) {
      return res.status(403).json({ success: false, error: 'You can only forward tasks assigned by you' });
    }

    // Check if user has already approved this task (required for forwarding)
    const [existingApprovals] = await pool.query(
      `SELECT da.APPROVAL_ID, da.STATUS 
       FROM document_approval da
       LEFT JOIN document d ON da.DOCUMENT_ID = d.DOCUMENT_ID
       WHERE da.USER_ID = ? AND (
         d.ASSIGNED_TO = ? OR 
         (da.DOCUMENT_ID = -? AND EXISTS (
           SELECT 1 FROM TASK t WHERE t.TASK_ID = ? AND t.ASSIGNED_BY = da.USER_ID
         ))
       )`,
      [userId, taskId, taskId, taskId]
    );

    if (existingApprovals.length === 0) {
      return res.status(400).json({ success: false, error: 'You must approve the task before forwarding' });
    }

    const hasApproved = existingApprovals.some(approval => approval.STATUS === 1);
    if (!hasApproved) {
      return res.status(400).json({ success: false, error: 'You must approve the task before forwarding' });
    }

    // Get all documents linked to this task
    const [documents] = await pool.query(
      'SELECT * FROM document WHERE ASSIGNED_TO = ?',
      [taskId]
    );

    // Allow forwarding tasks even without documents

    // Update document statuses and create approval records
    for (const doc of documents) {
      // Insert new document status
      await pool.query(
        'INSERT INTO document_status (DOCUMENT_ID, STATUS, REMARKS, CREATED_AT) VALUES (?, ?, ?, NOW())',
        [doc.DOCUMENT_ID, 'Under_Division_Review', remarks || 'Forwarded to Division Manager']
      );

      // Create approval record
      await pool.query(
        'INSERT INTO document_approval (DOCUMENT_ID, USER_ID, ROLE, STATUS, REMARKS, DATE_APPROVED) VALUES (?, ?, ?, 1, ?, NOW())',
        [doc.DOCUMENT_ID, userId, userRole, remarks || 'Forwarded to Division Manager']
      );
    }

    // Handle notifications based on targeting
    if (targetDivisionManagerId) {
      // Copy documents to the Division Manager for review in reports
      for (const doc of documents) {
        // Create a copy of the document for Division Manager review
        const [newDocResult] = await pool.query(
          `INSERT INTO document (
            TITLE, DESCRIPTION, FILE_LINK, FINGERPRINT_HASH, 
            CATEGORY_ID, SECTION_ID, CREATED_BY, ASSIGNED_TO,
            TAGS, FREQUENCY
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            doc.TITLE + ' (Forwarded)',
            doc.DESCRIPTION + (remarks ? `\n\nForwarded with remarks: ${remarks}` : ''),
            doc.FILE_LINK,
            doc.FINGERPRINT_HASH,
            doc.CATEGORY_ID,
            doc.SECTION_ID,
            doc.CREATED_BY,
            -targetDivisionManagerId, // Use negative ID to indicate forwarded to division manager
            doc.TAGS,
            doc.FREQUENCY
          ]
        );

        // Create initial status for the copied document
        await pool.query(
          'INSERT INTO document_status (DOCUMENT_ID, STATUS, REMARKS, CREATED_AT) VALUES (?, ?, ?, NOW())',
          [newDocResult.insertId, 'Under_Division_Review', 'Forwarded from Section Unit Head']
        );

        // Create approval record for the copied document with forwarded by information
        await pool.query(
          'INSERT INTO document_approval (DOCUMENT_ID, USER_ID, ROLE, STATUS, REMARKS, DATE_APPROVED) VALUES (?, ?, ?, 1, ?, NOW())',
          [newDocResult.insertId, userId, userRole, `Forwarded by Section Unit Head to Division Manager${remarks ? ` - ${remarks}` : ''}`]
        );
      }

      // Notify specific Division Manager
      await createNotification({
        userId: targetDivisionManagerId,
        type: 'task_forwarded',
        title: 'Task Documents Forwarded',
        message: `Task "${task.TITLE}" documents have been copied and forwarded to you for review. ${remarks ? `Remarks: ${remarks}` : ''}`,
        actionUrl: `/division-manager/reports`
      });
    } else if (targetTaskId) {
      // Verify target task exists and get its details
      const [targetTasks] = await pool.query('SELECT * FROM TASK WHERE TASK_ID = ?', [targetTaskId]);
      if (targetTasks.length === 0) {
        return res.status(404).json({ success: false, error: 'Target task not found' });
      }

      const targetTask = targetTasks[0];

      // Copy documents to the Section Unit Head's own task (the one assigned to them by Division Manager)
      for (const doc of documents) {
        // Create a copy of the document for the Section Unit Head's task
        const [newDocResult] = await pool.query(
          `INSERT INTO document (
            TITLE, DESCRIPTION, FILE_LINK, FINGERPRINT_HASH, 
            CATEGORY_ID, SECTION_ID, CREATED_BY, ASSIGNED_TO,
            TAGS, FREQUENCY
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            doc.TITLE + ' (Forwarded)',
            doc.DESCRIPTION + (remarks ? `\n\nForwarded with remarks: ${remarks}` : ''),
            doc.FILE_LINK,
            doc.FINGERPRINT_HASH,
            doc.CATEGORY_ID,
            doc.SECTION_ID,
            doc.CREATED_BY, // Preserve original creator
            targetTaskId, // Assign to the Section Unit Head's task
            doc.TAGS,
            doc.FREQUENCY
          ]
        );

        // Create initial status for the copied document
        await pool.query(
          'INSERT INTO document_status (DOCUMENT_ID, STATUS, REMARKS, CREATED_AT) VALUES (?, ?, ?, NOW())',
          [newDocResult.insertId, 'Under_Division_Review', 'Forwarded from staff task']
        );

        // Note: We don't create approval records for forwarded documents
        // The approval records should only exist for the original documents
        // This prevents duplicate entries in the approval history
      }

      // Notify the Division Manager that documents have been forwarded to the Section Unit Head's task
      await createNotification({
        userId: targetTask.ASSIGNED_TO, // Division Manager
        type: 'task_forwarded',
        title: 'Task Documents Forwarded',
        message: `Documents have been forwarded to the Section Unit Head's task "${targetTask.TITLE}". They will be available for review once the Section Unit Head submits their task. ${remarks ? `Remarks: ${remarks}` : ''}`,
        actionUrl: `/division-manager/task-assignment/${targetTaskId}`
      });
    } else {
      // Notify all Division Managers in the section's division (default behavior)
      await notifyDivisionManagersForReview(task, documents, remarks);
    }

    // Update message based on targeting
    let message;
    if (targetDivisionManagerId) {
      message = 'Task forwarded to specific Division Manager';
    } else if (targetTaskId) {
      message = 'Task forwarded to specific task';
    } else {
      message = 'Task forwarded to Division Manager';
    }

    res.json({
      success: true,
      message: message
    });
  } catch (error) {
    console.error('Forward task to division manager error:', error);
    res.status(500).json({ success: false, error: 'Failed to forward task to Division Manager' });
  }
};

// Forward task to Regional Director
exports.forwardTaskToRegional = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { remarks } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole !== 'division_manager') {
      return res.status(403).json({ success: false, error: 'Only Division Managers can forward tasks to Regional Director' });
    }

    // Get task details
    const [tasks] = await pool.query('SELECT * FROM TASK WHERE TASK_ID = ?', [taskId]);
    if (tasks.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const task = tasks[0];

    // Check if user has already approved this task (required for forwarding)
    const [existingApprovals] = await pool.query(
      `SELECT da.APPROVAL_ID, da.STATUS 
       FROM document_approval da
       LEFT JOIN document d ON da.DOCUMENT_ID = d.DOCUMENT_ID
       WHERE da.USER_ID = ? AND (
         d.ASSIGNED_TO = ? OR 
         (da.DOCUMENT_ID = -? AND EXISTS (
           SELECT 1 FROM TASK t WHERE t.TASK_ID = ? AND (t.ASSIGNED_BY = da.USER_ID OR t.ASSIGNED_TO = da.USER_ID)
         ))
       )`,
      [userId, taskId, taskId, taskId]
    );

    if (existingApprovals.length === 0) {
      return res.status(400).json({ success: false, error: 'You must approve the task before forwarding' });
    }

    const hasApproved = existingApprovals.some(approval => approval.STATUS === 1);
    if (!hasApproved) {
      return res.status(400).json({ success: false, error: 'You must approve the task before forwarding' });
    }

    // Get all documents linked to this task
    const [documents] = await pool.query(
      'SELECT * FROM document WHERE ASSIGNED_TO = ?',
      [taskId]
    );

    if (documents.length === 0) {
      return res.status(400).json({ success: false, error: 'No documents found for this task' });
    }

    // Update document statuses and create approval records
    for (const doc of documents) {
      // Insert new document status
      await pool.query(
        'INSERT INTO document_status (DOCUMENT_ID, STATUS, REMARKS, CREATED_AT) VALUES (?, ?, ?, NOW())',
        [doc.DOCUMENT_ID, 'Under_Regional_Review', remarks || 'Forwarded to Regional Director']
      );

      // Create approval record
      await pool.query(
        'INSERT INTO document_approval (DOCUMENT_ID, USER_ID, ROLE, STATUS, REMARKS, DATE_APPROVED) VALUES (?, ?, ?, 1, ?, NOW())',
        [doc.DOCUMENT_ID, userId, userRole, remarks || 'Forwarded to Regional Director']
      );

      // Update document forwarding status
      await pool.query(
        'UPDATE document SET FORWARDED_TO_REGIONAL = 1, FORWARDED_BY = ?, FORWARDED_AT = NOW() WHERE DOCUMENT_ID = ?',
        [userId, doc.DOCUMENT_ID]
      );
    }

    // Notify Regional Directors
    await notifyRegionalDirectorsForReview(task, documents, remarks);

    res.json({
      success: true,
      message: 'Task forwarded to Regional Director'
    });
  } catch (error) {
    console.error('Forward task to regional error:', error);
    res.status(500).json({ success: false, error: 'Failed to forward task to Regional Director' });
  }
};

// Send documents back to Section Unit Head for revision
exports.sendBackToSectionHead = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { remarks } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole !== 'division_manager') {
      return res.status(403).json({ success: false, error: 'Only Division Managers can send documents back to Section Head' });
    }

    if (!remarks || remarks.trim() === '') {
      return res.status(400).json({ success: false, error: 'Remarks are required when sending back for revision' });
    }

    // Get task details
    const [tasks] = await pool.query('SELECT * FROM TASK WHERE TASK_ID = ?', [taskId]);
    if (tasks.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const task = tasks[0];

    // Get all documents linked to this task
    const [documents] = await pool.query(
      'SELECT * FROM document WHERE ASSIGNED_TO = ?',
      [taskId]
    );

    // Allow sending back tasks even without documents
    // Update document statuses and create revision records (if documents exist)
    for (const doc of documents) {
      // Insert new document status
      await pool.query(
        'INSERT INTO document_status (DOCUMENT_ID, STATUS, REMARKS, CREATED_AT) VALUES (?, ?, ?, NOW())',
        [doc.DOCUMENT_ID, 'Revision_Required', remarks]
      );

      // Create revision record
      await pool.query(
        'INSERT INTO document_approval (DOCUMENT_ID, USER_ID, ROLE, STATUS, REMARKS, DATE_APPROVED) VALUES (?, ?, ?, 0, ?, NOW())',
        [doc.DOCUMENT_ID, userId, userRole, remarks]
      );
    }

    // Get the role of the user who assigned the task to determine correct URL
    const [assignedByUser] = await pool.query('SELECT FUNCTIONAL_ROLE FROM user WHERE USER_ID = ?', [task.ASSIGNED_BY]);
    const assignedByRole = assignedByUser.length > 0 ? assignedByUser[0].FUNCTIONAL_ROLE : 'section_unit_head';
    
    // Determine the correct action URL based on user role
    let actionUrl;
    if (assignedByRole === 'division_manager') {
      actionUrl = `/division-manager/task-assignment/${task.TASK_ID}`;
    } else if (assignedByRole === 'regional_director') {
      actionUrl = `/regional-director/task-assignment/${task.TASK_ID}`;
    } else {
      actionUrl = `/section-unit-head/work/${task.TASK_ID}`;
    }

    // Send notification to the user who assigned the task
    await createNotification({
      userId: task.ASSIGNED_BY,
      type: 'task_revision_required',
      title: 'Task Requires Revision',
      message: `Your task "${task.TITLE}" has been sent back for revision. Reason: ${remarks}`,
      actionUrl: actionUrl
    });

    // Update message based on whether documents exist
    let message;
    if (documents.length > 0) {
      message = 'Task documents sent back to Section Unit Head for revision';
    } else {
      message = 'Task sent back to Section Unit Head for revision';
    }

    res.json({
      success: true,
      message: message
    });
  } catch (error) {
    console.error('Send back to section head error:', error);
    res.status(500).json({ success: false, error: 'Failed to send back to Section Unit Head' });
  }
};

// Get all tasks for oversight (Regional Director)
exports.getAllTasksForOversight = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Only Regional Directors can access this endpoint
    if (userRole !== 'regional_director') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only Regional Directors can access all tasks for oversight' 
      });
    }

    const query = `
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
        t.STATUS as TASK_STATUS,
        t.CREATED_AT,
        t.UPDATED_AT,
        t.REQUIRES_DOCUMENT,
        t.SECTION_ID,
        t.LINKED_DOCUMENT_ID,
        assigner.NAME as ASSIGNED_BY_NAME,
        assignee.NAME as ASSIGNED_TO_NAME,
        s.NAME as SECTION_NAME,
        s.DIVISION_ID,
        d.NAME as DIVISION_NAME
      FROM TASK t
      LEFT JOIN user assigner ON t.ASSIGNED_BY = assigner.USER_ID
      LEFT JOIN user assignee ON t.ASSIGNED_TO = assignee.USER_ID
      LEFT JOIN section s ON t.SECTION_ID = s.SECTION_ID
      LEFT JOIN division d ON s.DIVISION_ID = d.DIVISION_ID
      ORDER BY 
        CASE 
          WHEN t.DUE_DATE < CURDATE() AND t.STATUS != 'completed' THEN 1
          WHEN t.STATUS = 'pending' THEN 2
          WHEN t.STATUS = 'in_progress' THEN 3
          WHEN t.STATUS = 'completed' THEN 4
          ELSE 5
        END,
        t.DUE_DATE ASC
    `;

    const [rawTasks] = await pool.query(query);

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
      STATUS: task.TASK_STATUS,
      CREATED_AT: task.CREATED_AT,
      UPDATED_AT: task.UPDATED_AT,
      REQUIRES_DOCUMENT: task.REQUIRES_DOCUMENT,
      SECTION_ID: task.SECTION_ID,
      LINKED_DOCUMENT_ID: task.LINKED_DOCUMENT_ID,
      assignedBy: task.ASSIGNED_BY_NAME ? {
        USER_ID: task.ASSIGNED_BY,
        NAME: task.ASSIGNED_BY_NAME
      } : null,
      assignedTo: task.ASSIGNED_TO_NAME ? {
        USER_ID: task.ASSIGNED_TO,
        NAME: task.ASSIGNED_TO_NAME
      } : null,
      section: task.SECTION_NAME ? {
        SECTION_ID: task.SECTION_ID,
        NAME: task.SECTION_NAME,
        DIVISION_ID: task.DIVISION_ID
      } : null,
      division: task.DIVISION_NAME ? {
        DIVISION_ID: task.DIVISION_ID,
        NAME: task.DIVISION_NAME
      } : null
    }));

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Get all tasks for oversight error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch all tasks' });
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

// Helper function to notify task document approval
async function notifyTaskDocumentApproval(task, documents, newStatus, remarks, approverId, approverRole, forwardToDivision) {
  try {
    // Notify staff that their task was approved
    let message;
    if (forwardToDivision) {
      message = `Your task "${task.TITLE}" has been approved and forwarded to Division Manager`;
    } else {
      message = `Your task "${task.TITLE}" has been approved`;
    }

    if (remarks) {
      message += `. Remarks: ${remarks}`;
    }

    await createNotification({
      userId: task.ASSIGNED_TO,
      type: 'task_approved',
      title: 'Task Approved',
      message: message,
      actionUrl: '/staff/work'
    });

    // If forwarded to division, notify division managers
    if (forwardToDivision) {
      await notifyDivisionManagersForReview(task, documents, remarks);
    }
  } catch (error) {
    console.error('Notify task document approval error:', error);
  }
}

// Helper function to notify division managers for review
async function notifyDivisionManagersForReview(task, documents, remarks) {
  try {
    // Get section head's section to find division
    const [sections] = await pool.query(
      'SELECT s.SECTION_ID, s.DIVISION_ID FROM section s JOIN user u ON s.SECTION_ID = u.SECTION_ID WHERE u.USER_ID = ?',
      [task.ASSIGNED_BY]
    );

    if (sections.length > 0) {
      const divisionId = sections[0].DIVISION_ID;

      // Get division managers
      const [divisionManagers] = await pool.query(
        'SELECT USER_ID FROM user WHERE FUNCTIONAL_ROLE = "division_manager" AND SECTION_ID IN (SELECT SECTION_ID FROM section WHERE DIVISION_ID = ?)',
        [divisionId]
      );

      for (const manager of divisionManagers) {
        await createNotification({
          userId: manager.USER_ID,
          type: 'task_requires_review',
          title: 'Task Documents Require Review',
          message: `Task "${task.TITLE}" documents require your review`,
          actionUrl: `/division-manager/task-assignment/${task.TASK_ID}`
        });
      }
    }
  } catch (error) {
    console.error('Notify division managers error:', error);
  }
}

// Helper function to notify regional directors for review
async function notifyRegionalDirectorsForReview(task, documents, remarks) {
  try {
    // Get all regional directors
    const [regionalDirectors] = await pool.query(
      'SELECT USER_ID FROM user WHERE FUNCTIONAL_ROLE = "regional_director"'
    );

    // Use the first document ID for the notification URL since tasks can have multiple documents
    const firstDocumentId = documents.length > 0 ? documents[0].DOCUMENT_ID : null;

    for (const director of regionalDirectors) {
      await createNotification({
        userId: director.USER_ID,
        type: 'task_requires_review',
        title: 'Task Documents Require Review',
        message: `Task "${task.TITLE}" documents require your review`,
        actionUrl: firstDocumentId ? `/regional-director/reports?documentId=${firstDocumentId}` : '/regional-director/reports'
      });
    }
  } catch (error) {
    console.error('Notify regional directors error:', error);
  }
}

// Archive a task (assigner only) - hides for both assigner and assignee
exports.archiveTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;

    // Validate assigner and get assignee
    const [rows] = await pool.query('SELECT ASSIGNED_TO FROM TASK WHERE TASK_ID = ? AND ASSIGNED_BY = ?', [taskId, userId]);
    if (rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Only the assigner can archive this task' });
    }
    const assigneeId = rows[0].ASSIGNED_TO;

    // Insert two archive rows (assigner view and assignee view)
    const now = new Date();
    await pool.query(
      `INSERT INTO archive (TASK_ID, VIEWER_USER_ID, CONTEXT, ARCHIVED_BY, DATE_ARCHIVED)
       VALUES (?, ?, 'assigned_by', ?, ?)
       ON DUPLICATE KEY UPDATE DATE_ARCHIVED = VALUES(DATE_ARCHIVED)`,
      [taskId, userId, userId, now]
    );

    await pool.query(
      `INSERT INTO archive (TASK_ID, VIEWER_USER_ID, CONTEXT, ARCHIVED_BY, DATE_ARCHIVED)
       VALUES (?, ?, 'assigned_to', ?, ?)
       ON DUPLICATE KEY UPDATE DATE_ARCHIVED = VALUES(DATE_ARCHIVED)`,
      [taskId, assigneeId, userId, now]
    );

    res.json({ success: true, message: 'Task archived' });
  } catch (error) {
    console.error('Archive task error:', error);
    res.status(500).json({ success: false, error: 'Failed to archive task' });
  }
};

// Unarchive a task (assigner only) - restores for both
exports.unarchiveTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;

    // Validate assigner and get assignee
    const [rows] = await pool.query('SELECT ASSIGNED_TO FROM TASK WHERE TASK_ID = ? AND ASSIGNED_BY = ?', [taskId, userId]);
    if (rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Only the assigner can unarchive this task' });
    }
    const assigneeId = rows[0].ASSIGNED_TO;

    await pool.query(
      `DELETE FROM archive WHERE TASK_ID = ? AND ( (VIEWER_USER_ID = ? AND CONTEXT = 'assigned_by') OR (VIEWER_USER_ID = ? AND CONTEXT = 'assigned_to') )`,
      [taskId, userId, assigneeId]
    );

    res.json({ success: true, message: 'Task unarchived' });
  } catch (error) {
    console.error('Unarchive task error:', error);
    res.status(500).json({ success: false, error: 'Failed to unarchive task' });
  }
};

// List archived tasks for current user by context
exports.listArchivedTasks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { context } = req.query; // 'assigned_by' | 'assigned_to'

    if (!['assigned_by', 'assigned_to'].includes(context)) {
      return res.status(400).json({ success: false, error: 'Invalid context' });
    }

    const [rows] = await pool.query(
      `SELECT t.*, a.DATE_ARCHIVED
       FROM TASK t
       JOIN archive a ON a.TASK_ID = t.TASK_ID
       WHERE a.VIEWER_USER_ID = ? AND a.CONTEXT = ?
       ORDER BY a.DATE_ARCHIVED DESC`,
      [userId, context]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('List archived tasks error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch archived tasks' });
  }
};
