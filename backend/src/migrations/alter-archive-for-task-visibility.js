const mysql = require('mysql2/promise');
require('dotenv').config();

async function alterArchiveForTaskVisibility() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    // Ensure columns exist: TASK_ID (nullable), VIEWER_USER_ID (not null), CONTEXT (enum)
    const [cols] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'archive'`,
      [process.env.DB_NAME]
    );
    const has = (name) => cols.some(c => c.COLUMN_NAME === name);

    if (!has('TASK_ID')) {
      await connection.execute(`ALTER TABLE archive ADD COLUMN TASK_ID BIGINT NULL AFTER DOCUMENT_ID`);
    }
    if (!has('VIEWER_USER_ID')) {
      await connection.execute(`ALTER TABLE archive ADD COLUMN VIEWER_USER_ID BIGINT NOT NULL AFTER TASK_ID`);
    }
    if (!has('CONTEXT')) {
      await connection.execute(`ALTER TABLE archive ADD COLUMN CONTEXT ENUM('assigned_by','assigned_to') NOT NULL AFTER VIEWER_USER_ID`);
    }

    // Add indexes/unique keys if not present
    const [indexes] = await connection.execute(
      `SHOW INDEX FROM archive`
    );
    const hasIndex = (name) => indexes.some(i => i.Key_name === name);

    if (!hasIndex('uniq_task_viewer_context')) {
      try {
        await connection.execute(`ALTER TABLE archive ADD UNIQUE KEY uniq_task_viewer_context (TASK_ID, VIEWER_USER_ID, CONTEXT)`);
      } catch (_) {}
    }
    if (!hasIndex('idx_viewer_context_date')) {
      try {
        await connection.execute(`ALTER TABLE archive ADD KEY idx_viewer_context_date (VIEWER_USER_ID, CONTEXT, DATE_ARCHIVED)`);
      } catch (_) {}
    }
    if (!hasIndex('idx_task')) {
      try {
        await connection.execute(`ALTER TABLE archive ADD KEY idx_task (TASK_ID)`);
      } catch (_) {}
    }
    if (!hasIndex('idx_document')) {
      try {
        await connection.execute(`ALTER TABLE archive ADD KEY idx_document (DOCUMENT_ID)`);
      } catch (_) {}
    }

    console.log('✅ archive table altered for task visibility');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  alterArchiveForTaskVisibility()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = alterArchiveForTaskVisibility;







