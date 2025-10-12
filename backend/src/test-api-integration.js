const mysql = require('mysql2/promise');
require('dotenv').config();

async function testTaskCreation() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log('🔗 Connected to database');

    // Test 1: Create a task directly in database
    console.log('\n📝 Test 1: Creating task in database...');
    const [taskResult] = await connection.execute(
      `INSERT INTO TASK (
        TITLE, DESCRIPTION, ASSIGNED_TO, ASSIGNED_BY, DUE_DATE, 
        PRIORITY, STATUS, CATEGORY, TAGS, REQUIRES_DOCUMENT, 
        SECTION_ID, CREATED_AT
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NOW())`,
      [
        'Test Task Integration',
        'This is a test task to verify database integration',
        1, // assignedTo
        1, // assignedBy
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // due in 7 days
        'medium',
        'Test Category',
        'integration,test',
        1, // requiresDocument
        1  // sectionId
      ]
    );

    console.log('✅ Task created successfully, ID:', taskResult.insertId);

    // Test 2: Create a notification
    console.log('\n🔔 Test 2: Creating notification...');
    const [notificationResult] = await connection.execute(
      `INSERT INTO SYSTEM_NOTIFICATION (
        USER_ID, TYPE, TITLE, MESSAGE, ACTION_URL, 
        RELATED_TASK_ID, IS_READ, CREATED_AT
      ) VALUES (?, 'task_assigned', 'New Task Assigned', ?, '/staff/tasks', ?, 0, NOW())`,
      [1, 'You have been assigned a new task: Test Task Integration', taskResult.insertId]
    );

    console.log('✅ Notification created successfully, ID:', notificationResult.insertId);

    // Test 3: Verify data exists
    console.log('\n🔍 Test 3: Verifying data...');
    const [tasks] = await connection.execute('SELECT * FROM TASK WHERE TASK_ID = ?', [taskResult.insertId]);
    const [notifications] = await connection.execute('SELECT * FROM SYSTEM_NOTIFICATION WHERE NOTIFICATION_ID = ?', [notificationResult.insertId]);

    console.log('📋 Task found:', tasks[0] ? 'YES' : 'NO');
    console.log('📢 Notification found:', notifications[0] ? 'YES' : 'NO');

    if (tasks[0]) {
      console.log('   Task title:', tasks[0].TITLE);
      console.log('   Task status:', tasks[0].STATUS);
    }

    if (notifications[0]) {
      console.log('   Notification type:', notifications[0].TYPE);
      console.log('   Notification read:', notifications[0].IS_READ ? 'YES' : 'NO');
    }

    // Test 4: Clean up
    console.log('\n🧹 Test 4: Cleaning up...');
    await connection.execute('DELETE FROM SYSTEM_NOTIFICATION WHERE NOTIFICATION_ID = ?', [notificationResult.insertId]);
    await connection.execute('DELETE FROM TASK WHERE TASK_ID = ?', [taskResult.insertId]);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! Database integration is working correctly.');
    console.log('\n📊 Summary:');
    console.log('   ✅ Task creation and storage');
    console.log('   ✅ Notification creation and storage');
    console.log('   ✅ Data retrieval and verification');
    console.log('   ✅ Data cleanup');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Check if TASK table exists, if not create it
async function ensureTaskTable() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    // Check if TASK table exists
    const [tables] = await connection.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'TASK'",
      [process.env.DB_NAME]
    );

    if (tables.length === 0) {
      console.log('📋 Creating TASK table...');
      await connection.execute(`
        CREATE TABLE TASK (
          TASK_ID INT(11) NOT NULL AUTO_INCREMENT,
          TITLE VARCHAR(255) NOT NULL,
          DESCRIPTION TEXT,
          ASSIGNED_TO INT(11) NOT NULL,
          ASSIGNED_BY INT(11) NOT NULL,
          DUE_DATE DATETIME NOT NULL,
          PRIORITY ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
          STATUS ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
          CATEGORY VARCHAR(100),
          TAGS TEXT,
          REQUIRES_DOCUMENT BOOLEAN DEFAULT FALSE,
          SECTION_ID INT(11),
          CREATED_AT DATETIME DEFAULT CURRENT_TIMESTAMP,
          UPDATED_AT DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (TASK_ID),
          FOREIGN KEY (ASSIGNED_TO) REFERENCES user(USER_ID),
          FOREIGN KEY (ASSIGNED_BY) REFERENCES user(USER_ID),
          FOREIGN KEY (SECTION_ID) REFERENCES section(SECTION_ID)
        )
      `);
      console.log('✅ TASK table created');
    } else {
      console.log('✅ TASK table already exists');
    }

  } catch (error) {
    console.error('❌ Error ensuring TASK table:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the tests
async function runTests() {
  await ensureTaskTable();
  await testTaskCreation();
}

runTests();

