const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabaseInsert() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log('Connected to database');

    // Test insert
    const [result] = await connection.execute(
      'INSERT INTO user (NAME, ID_NUMBER, EMAIL, PASSWORD, SECTION_ID, FUNCTIONAL_ROLE) VALUES (?, ?, ?, ?, ?, ?)',
      ['Test User', 'TEST001', 'test@example.com', 'hashedpassword123', 1, 'staff']
    );

    console.log('Insert successful, ID:', result.insertId);

    // Clean up - delete the test user
    await connection.execute('DELETE FROM user WHERE USER_ID = ?', [result.insertId]);
    console.log('Test user deleted');

    await connection.end();
  } catch (error) {
    console.error('Database test error:', error);
  }
}

testDatabaseInsert();
