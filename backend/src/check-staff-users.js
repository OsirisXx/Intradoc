const { pool } = require('./config/database');

async function checkStaffUsers() {
  try {
    console.log('Checking staff users...');
    
    const [rows] = await pool.query('SELECT USER_ID, NAME, EMAIL, STATUS FROM user WHERE FUNCTIONAL_ROLE = "staff"');
    
    console.log('Staff users:');
    rows.forEach(u => {
      console.log(`  ID: ${u.USER_ID}, Name: ${u.NAME}, Email: ${u.EMAIL}, Status: ${u.STATUS}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStaffUsers();







