const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUserTable() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log('Connected to database');

    // Check user table structure
    const [columns] = await connection.execute('DESCRIBE user');
    console.log('User table columns:');
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check existing users
    const [users] = await connection.execute('SELECT * FROM user LIMIT 3');
    console.log('\nSample users:');
    users.forEach(user => {
      console.log(user);
    });

    await connection.end();
  } catch (error) {
    console.error('Error checking user table:', error);
  }
}

checkUserTable();
