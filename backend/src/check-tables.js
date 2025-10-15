const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
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

    // Check if SYSTEM_NOTIFICATION table exists
    const [tables] = await connection.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'SYSTEM_NOTIFICATION'",
      [process.env.DB_NAME]
    );

    if (tables.length === 0) {
      console.log('❌ SYSTEM_NOTIFICATION table does not exist');
      console.log('📋 Creating SYSTEM_NOTIFICATION table...');
      
      await connection.execute(`
        CREATE TABLE SYSTEM_NOTIFICATION (
          NOTIFICATION_ID INT(11) NOT NULL AUTO_INCREMENT,
          USER_ID INT(11) NOT NULL,
          TYPE VARCHAR(50) NOT NULL,
          TITLE VARCHAR(255) NOT NULL,
          MESSAGE TEXT NOT NULL,
          ACTION_URL VARCHAR(500),
          RELATED_TASK_ID INT(11),
          RELATED_DOCUMENT_ID INT(11),
          IS_READ BOOLEAN NOT NULL DEFAULT FALSE,
          CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (NOTIFICATION_ID),
          FOREIGN KEY (USER_ID) REFERENCES user(USER_ID),
          FOREIGN KEY (RELATED_TASK_ID) REFERENCES TASK(TASK_ID),
          FOREIGN KEY (RELATED_DOCUMENT_ID) REFERENCES DOCUMENT(DOCUMENT_ID)
        )
      `);
      console.log('✅ SYSTEM_NOTIFICATION table created');
    } else {
      console.log('✅ SYSTEM_NOTIFICATION table exists');
      
      // Check table structure
      const [columns] = await connection.execute(
        "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'SYSTEM_NOTIFICATION'",
        [process.env.DB_NAME]
      );
      
      console.log('\n📋 SYSTEM_NOTIFICATION table structure:');
      columns.forEach(col => {
        console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    }

    // Check TASK table
    const [taskTables] = await connection.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'TASK'",
      [process.env.DB_NAME]
    );

    if (taskTables.length > 0) {
      console.log('\n✅ TASK table exists');
      const [taskColumns] = await connection.execute(
        "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'TASK'",
        [process.env.DB_NAME]
      );
      
      console.log('\n📋 TASK table structure:');
      taskColumns.forEach(col => {
        console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTables();







