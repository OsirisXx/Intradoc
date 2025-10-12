const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function fixAdminPassword() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log('Connected to database');

    // Hash the admin password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    console.log('Password hashed:', hashedPassword);

    // Update admin password
    const [result] = await connection.execute(
      'UPDATE user SET PASSWORD = ? WHERE EMAIL = ?',
      [hashedPassword, 'admin@nia.gov.ph']
    );

    console.log('Admin password updated, affected rows:', result.affectedRows);

    // Verify the update
    const [users] = await connection.execute(
      'SELECT EMAIL, PASSWORD FROM user WHERE EMAIL = ?',
      ['admin@nia.gov.ph']
    );

    if (users.length > 0) {
      const user = users[0];
      const isPasswordValid = await bcrypt.compare('admin123', user.PASSWORD);
      console.log('Password verification:', isPasswordValid ? 'SUCCESS' : 'FAILED');
    }

    await connection.end();
  } catch (error) {
    console.error('Error fixing admin password:', error);
  }
}

fixAdminPassword();
