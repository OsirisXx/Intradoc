const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testRegistration() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log('Connected to database');

    const name = 'Test User';
    const idNumber = 'EMP001';
    const email = 'test@example.com';
    const password = 'test123';
    const organizationalAssignment = 'Planning';

    // Check if email already exists
    const [existing] = await connection.execute(
      'SELECT EMAIL FROM user WHERE EMAIL = ?',
      [email]
    );

    if (existing.length > 0) {
      console.log('Email already exists, deleting...');
      await connection.execute('DELETE FROM user WHERE EMAIL = ?', [email]);
    }

    // Determine section ID
    const determineSectionId = (orgAssignment) => {
      const mapping = {
        'Planning': 1,
        'Design': 1,
        'Construction': 1,
        'BAC': 2,
        'Operations Unit': 2,
        'Equipment': 2,
        'Cashiering': 3,
        'Budget': 3,
        'Accounting': 3,
        'Human Resource': 4,
        'Property': 5,
        'IT': 5,
        'Legal': 5,
        'PAIS': 5
      };
      return mapping[orgAssignment] || 1;
    };

    const sectionId = determineSectionId(organizationalAssignment);
    console.log(`Section ID for ${organizationalAssignment}: ${sectionId}`);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    // Insert user
    const [result] = await connection.execute(
      'INSERT INTO user (NAME, ID_NUMBER, EMAIL, PASSWORD, SECTION_ID, FUNCTIONAL_ROLE, ORGANIZATIONAL_ROLE, STATUS) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, idNumber, email, hashedPassword, sectionId, 'staff', organizationalAssignment, 'pending']
    );

    console.log('User created successfully with ID:', result.insertId);

    // Test login
    const [users] = await connection.execute(
      'SELECT * FROM user WHERE EMAIL = ?',
      [email]
    );

    if (users.length > 0) {
      const user = users[0];
      const isPasswordValid = await bcrypt.compare(password, user.PASSWORD);
      console.log('Login test:', isPasswordValid ? 'SUCCESS' : 'FAILED');
      console.log('User data:', {
        USER_ID: user.USER_ID,
        NAME: user.NAME,
        EMAIL: user.EMAIL,
        FUNCTIONAL_ROLE: user.FUNCTIONAL_ROLE,
        ORGANIZATIONAL_ROLE: user.ORGANIZATIONAL_ROLE,
        STATUS: user.STATUS
      });
    }

    await connection.end();
  } catch (error) {
    console.error('Test error:', error);
  }
}

testRegistration();
