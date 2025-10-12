const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupAdmin() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log('Connected to database');

    // Check if admin user already exists
    const [existing] = await connection.execute(
      'SELECT * FROM user WHERE EMAIL = ?',
      ['admin@nia.gov.ph']
    );

    if (existing.length > 0) {
      console.log('Admin user already exists');
    } else {
      // Insert admin user
      await connection.execute(
        'INSERT INTO user (NAME, ID_NUMBER, EMAIL, PASSWORD, SECTION_ID, ROLE, CREATED_AT) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        ['Admin Bootstrap', 'ADM000', 'admin@nia.gov.ph', 'admin123', 5, 'admin']
      );
      console.log('Admin user created successfully');
    }

    await connection.end();
  } catch (error) {
    console.error('Error setting up admin:', error);
  }
}

setupAdmin();
