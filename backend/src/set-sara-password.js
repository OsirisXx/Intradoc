const bcrypt = require('bcryptjs');
const { pool } = require('./config/database');

async function setSaraPassword() {
  try {
    console.log('Setting password for Sara Owens...');
    
    // Set password to 'password123'
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    await pool.query(
      'UPDATE user SET PASSWORD = ? WHERE USER_ID = 19',
      [hashedPassword]
    );
    
    console.log('✅ Password set for Sara Owens');
    console.log('Email: staff.engineering@nia.gov.ph');
    console.log('Password: password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting password:', error);
    process.exit(1);
  }
}

setSaraPassword();








