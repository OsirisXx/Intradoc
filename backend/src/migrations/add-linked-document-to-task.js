const mysql = require('mysql2/promise');
require('dotenv').config();

async function addLinkedDocumentToTask() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log('🔧 Adding LINKED_DOCUMENT_ID column to TASK table...');

    // Check if column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'TASK' 
        AND COLUMN_NAME = 'LINKED_DOCUMENT_ID'
    `, [process.env.DB_NAME]);

    if (columns.length === 0) {
      // Add the column
      await connection.execute(`
        ALTER TABLE TASK 
        ADD COLUMN LINKED_DOCUMENT_ID INT(11) NULL
      `);
      console.log('✅ Added LINKED_DOCUMENT_ID column to TASK table');

      // Add foreign key constraint
      await connection.execute(`
        ALTER TABLE TASK 
        ADD FOREIGN KEY (LINKED_DOCUMENT_ID) REFERENCES document(DOCUMENT_ID)
      `);
      console.log('✅ Added foreign key constraint for LINKED_DOCUMENT_ID');
    } else {
      console.log('✅ LINKED_DOCUMENT_ID column already exists');
    }

    // Note: Since FULFILLS_TASK_ID doesn't exist in the current document schema,
    // we can't automatically link existing documents to tasks.
    // This will be handled when new documents are uploaded with task references.
    console.log('ℹ️ No existing relationships to update (FULFILLS_TASK_ID not in current schema)');

    console.log('🎉 Migration completed successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  addLinkedDocumentToTask()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addLinkedDocumentToTask;
