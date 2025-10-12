const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSections() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log('Connected to database');

    // Check sections
    const [sections] = await connection.execute('SELECT * FROM section');
    console.log('Sections:', sections);

    // Check divisions
    const [divisions] = await connection.execute('SELECT * FROM division');
    console.log('Divisions:', divisions);

    await connection.end();
  } catch (error) {
    console.error('Error checking sections:', error);
  }
}

checkSections();
