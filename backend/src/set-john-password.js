const bcrypt = require('bcryptjs');
const { pool } = require('./config/database');

async function setJohnPassword() {
  try {
    console.log('Setting password for John doe...');
    
    // Set password to 'password123'
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    await pool.query(
      'UPDATE user SET PASSWORD = ? WHERE USER_ID = 18',
      [hashedPassword]
    );
    
    console.log('✅ Password set for John doe');
    console.log('Email: staff.operations@nia.gov.ph');
    console.log('Password: password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting password:', error);
    process.exit(1);
  }
}

setJohnPassword();


