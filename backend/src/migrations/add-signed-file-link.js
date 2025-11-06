const mysql = require('mysql2/promise');
require('dotenv').config();

async function addSignedFileLink() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log('🔧 Adding SIGNED_FILE_LINK column to DOCUMENT table...');

    // Check if column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'document' 
        AND COLUMN_NAME = 'SIGNED_FILE_LINK'
    `, [process.env.DB_NAME]);

    if (columns.length === 0) {
      // Add the column
      await connection.execute(`
        ALTER TABLE document 
        ADD COLUMN SIGNED_FILE_LINK VARCHAR(500) NULL
      `);
      console.log('✅ Added SIGNED_FILE_LINK column to document table');
    } else {
      console.log('✅ SIGNED_FILE_LINK column already exists');
    }

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
  addSignedFileLink()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addSignedFileLink;

