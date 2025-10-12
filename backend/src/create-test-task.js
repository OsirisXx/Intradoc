const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTestTask() {
  let connection;
  
  try {
    console.log('📝 Creating Test Task');
    console.log('====================\n');

    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log('✅ Database connected');

    // Create a test task assigned by user 13 (Michael chen)
    console.log('\n📋 Creating test task...');
    const [result] = await connection.execute(
      `INSERT INTO TASK (
        TITLE, DESCRIPTION, ASSIGNED_TO, ASSIGNED_BY, DUE_DATE, 
        PRIORITY, STATUS, CATEGORY, TAGS, REQUIRES_DOCUMENT, 
        SECTION_ID, CREATED_AT
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NOW())`,
      [
        'Test Task for Frontend',
        'This is a test task created for frontend testing',
        14, // assignedTo (Sarah Johnson - section_unit_head)
        13, // assignedBy (Michael chen - section_unit_head)
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // due in 7 days
        'medium',
        'Testing',
        'frontend,test',
        1, // requiresDocument
        1  // sectionId
      ]
    );

    console.log('✅ Test task created successfully');
    console.log('   Task ID:', result.insertId);
    console.log('   Assigned By: Michael chen (ID: 13)');
    console.log('   Assigned To: Sarah Johnson (ID: 14)');

    // Create a notification for the assigned user
    console.log('\n🔔 Creating notification...');
    const [notificationResult] = await connection.execute(
      `INSERT INTO SYSTEM_NOTIFICATION (
        USER_ID, TYPE, TITLE, MESSAGE, ACTION_URL, 
        RELATED_TASK_ID, IS_READ, CREATED_AT
      ) VALUES (?, 'task_assigned', 'New Task Assigned', ?, '/staff/tasks', ?, 0, NOW())`,
      [14, 'You have been assigned a new task: Test Task for Frontend', result.insertId]
    );

    console.log('✅ Notification created successfully');
    console.log('   Notification ID:', notificationResult.insertId);

    // Verify the task was created
    console.log('\n🔍 Verifying task creation...');
    const [tasks] = await connection.execute(
      'SELECT * FROM TASK WHERE TASK_ID = ?',
      [result.insertId]
    );

    if (tasks.length > 0) {
      const task = tasks[0];
      console.log('✅ Task verified in database');
      console.log('   Title:', task.TITLE);
      console.log('   Status:', task.STATUS);
      console.log('   Assigned To:', task.ASSIGNED_TO);
      console.log('   Assigned By:', task.ASSIGNED_BY);
    }

    console.log('\n🎉 Test task creation completed successfully!');
    console.log('   Now user 13 (Michael chen) should have 1 task when fetching assigned tasks');

  } catch (error) {
    console.error('❌ Failed to create test task:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createTestTask();


