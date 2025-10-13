const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateNotificationTable() {
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

    // Add missing columns to SYSTEM_NOTIFICATION table
    const columnsToAdd = [
      { name: 'TYPE', definition: 'VARCHAR(50) NOT NULL DEFAULT "general"' },
      { name: 'TITLE', definition: 'VARCHAR(255) NOT NULL DEFAULT "Notification"' },
      { name: 'ACTION_URL', definition: 'VARCHAR(500)' },
      { name: 'RELATED_TASK_ID', definition: 'INT(11)' },
      { name: 'RELATED_DOCUMENT_ID', definition: 'INT(11)' }
    ];

    for (const column of columnsToAdd) {
      try {
        await connection.execute(`ALTER TABLE SYSTEM_NOTIFICATION ADD COLUMN ${column.name} ${column.definition}`);
        console.log(`✅ Added column: ${column.name}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`ℹ️  Column ${column.name} already exists`);
        } else {
          console.error(`❌ Error adding column ${column.name}:`, error.message);
        }
      }
    }

    console.log('\n🎉 SYSTEM_NOTIFICATION table update completed');

  } catch (error) {
    console.error('❌ Error updating table:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateNotificationTable();




