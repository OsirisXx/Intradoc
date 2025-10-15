const mysql = require('mysql2/promise');
require('dotenv').config();

async function testSQLQuery() {
  let connection;
  
  try {
    console.log('🔍 Testing SQL Query');
    console.log('===================\n');

    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log('✅ Database connected');

    // Test the exact query from getTasksAssignedBy
    console.log('\n📝 Test: getTasksAssignedBy query for user 13');
    const userId = 13;
    
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
        t.STATUS,
        t.CREATED_AT,
        t.UPDATED_AT,
        t.REQUIRES_DOCUMENT,
        t.SECTION_ID,
        assignee.NAME as ASSIGNED_TO_NAME,
        s.NAME as SECTION_NAME
      FROM TASK t
      LEFT JOIN user assignee ON t.ASSIGNED_TO = assignee.USER_ID
      LEFT JOIN section s ON t.SECTION_ID = s.SECTION_ID
      WHERE t.ASSIGNED_BY = ?
    `;

    console.log('Query:', query.replace(/\s+/g, ' ').trim());
    console.log('Parameter:', userId);

    try {
      const [tasks] = await connection.execute(query, [userId]);
      console.log(`✅ Query executed successfully`);
      console.log(`   Found ${tasks.length} tasks`);
      
      if (tasks.length > 0) {
        tasks.forEach((task, index) => {
          console.log(`   Task ${index + 1}:`);
          console.log(`     ID: ${task.TASK_ID}`);
          console.log(`     Title: ${task.TITLE}`);
          console.log(`     Assigned To: ${task.ASSIGNED_TO} (${task.ASSIGNED_TO_NAME || 'Unknown'})`);
          console.log(`     Section: ${task.SECTION_NAME || 'Unknown'}`);
        });
      }
    } catch (error) {
      console.log('❌ Query failed:');
      console.log('   Error:', error.message);
      console.log('   Code:', error.code);
      console.log('   SQL State:', error.sqlState);
    }

    // Test if the TASK table has the correct structure
    console.log('\n🔍 Test: Check TASK table structure');
    try {
      const [columns] = await connection.execute(
        "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'TASK' ORDER BY ORDINAL_POSITION",
        [process.env.DB_NAME]
      );
      
      console.log('✅ TASK table columns:');
      columns.forEach(col => {
        console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    } catch (error) {
      console.log('❌ Failed to get table structure:', error.message);
    }

    // Test if the user table has the correct structure
    console.log('\n👥 Test: Check USER table structure');
    try {
      const [columns] = await connection.execute(
        "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user' ORDER BY ORDINAL_POSITION",
        [process.env.DB_NAME]
      );
      
      console.log('✅ USER table columns:');
      columns.forEach(col => {
        console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    } catch (error) {
      console.log('❌ Failed to get user table structure:', error.message);
    }

    // Test if the section table has the correct structure
    console.log('\n🏢 Test: Check SECTION table structure');
    try {
      const [columns] = await connection.execute(
        "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'section' ORDER BY ORDINAL_POSITION",
        [process.env.DB_NAME]
      );
      
      console.log('✅ SECTION table columns:');
      columns.forEach(col => {
        console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    } catch (error) {
      console.log('❌ Failed to get section table structure:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testSQLQuery();







