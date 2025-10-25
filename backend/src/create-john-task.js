const { pool } = require('./config/database');

async function createJohnTask() {
  try {
    console.log('Creating task for John doe...');
    
    // Create task assigned to John doe (ID: 18, staff in section 2)
    const [result] = await pool.query(`
      INSERT INTO TASK (
        TITLE, 
        DESCRIPTION, 
        ASSIGNED_TO, 
        ASSIGNED_BY, 
        DUE_DATE, 
        PRIORITY, 
        CATEGORY, 
        TAGS, 
        STATUS, 
        SECTION_ID, 
        REQUIRES_DOCUMENT
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Update Project Documentation',  // title
      'Review and update all project documentation files',  // description
      18,  // assigned_to (John doe - staff)
      14,  // assigned_by (Sarah Johnson - section_unit_head)
      '2024-11-30 17:00:00',  // due_date
      'MEDIUM',  // priority
      'Documentation',  // category
      'documentation,update,project',  // tags
      'pending',  // status
      2,  // section_id
      1   // requires_document
    ]);

    const taskId = result.insertId;
    console.log('Task created with ID:', taskId);

    // Create notification for the assigned staff member
    await pool.query(`
      INSERT INTO SYSTEM_NOTIFICATION (
        USER_ID,
        TYPE,
        TITLE,
        MESSAGE,
        ACTION_URL,
        RELATED_TASK_ID,
        IS_READ,
        CREATED_AT
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      18,  // user_id (John doe)
      'task_assigned',
      'New Task Assigned',
      'You have been assigned a new task: Update Project Documentation',
      '/staff/work',
      taskId,
      0  // is_read
    ]);

    console.log('Notification created for John doe');
    
    // Verify the task was created
    const [tasks] = await pool.query(`
      SELECT 
        t.TASK_ID,
        t.TITLE,
        t.DESCRIPTION,
        t.ASSIGNED_TO,
        t.ASSIGNED_BY,
        assignee.NAME as ASSIGNED_TO_NAME,
        assigner.NAME as ASSIGNED_BY_NAME
      FROM TASK t
      LEFT JOIN user assignee ON t.ASSIGNED_TO = assignee.USER_ID
      LEFT JOIN user assigner ON t.ASSIGNED_BY = assigner.USER_ID
      WHERE t.TASK_ID = ?
    `, [taskId]);

    if (tasks.length > 0) {
      const task = tasks[0];
      console.log('\nTask Details:');
      console.log('   ID:', task.TASK_ID);
      console.log('   Title:', task.TITLE);
      console.log('   Assigned To:', task.ASSIGNED_TO_NAME, '(ID:', task.ASSIGNED_TO + ')');
      console.log('   Assigned By:', task.ASSIGNED_BY_NAME, '(ID:', task.ASSIGNED_BY + ')');
      console.log('   Status:', 'pending');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating John task:', error);
    process.exit(1);
  }
}

createJohnTask();























