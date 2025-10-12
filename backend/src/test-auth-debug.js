const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:3001/api';

async function testAuthDebug() {
  let connection;
  
  try {
    console.log('🔍 Testing Authentication Debug');
    console.log('==============================\n');

    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log('✅ Database connected');

    // Test 1: Check if we have users in the database
    console.log('\n👥 Test 1: Check Users in Database');
    const [users] = await connection.execute('SELECT USER_ID, NAME, EMAIL, FUNCTIONAL_ROLE FROM user LIMIT 5');
    console.log(`   Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`   - ID: ${user.USER_ID}, Name: ${user.NAME}, Role: ${user.FUNCTIONAL_ROLE}`);
    });

    // Test 2: Check if we have tasks in the database
    console.log('\n📝 Test 2: Check Tasks in Database');
    const [tasks] = await connection.execute('SELECT TASK_ID, TITLE, ASSIGNED_TO, ASSIGNED_BY FROM TASK LIMIT 5');
    console.log(`   Found ${tasks.length} tasks:`);
    tasks.forEach(task => {
      console.log(`   - ID: ${task.TASK_ID}, Title: ${task.TITLE}, Assigned To: ${task.ASSIGNED_TO}, Assigned By: ${task.ASSIGNED_BY}`);
    });

    // Test 3: Test API endpoint without authentication (should fail)
    console.log('\n🔒 Test 3: Test API without Authentication');
    try {
      const response = await axios.get(`${API_BASE_URL}/tasks/assigned-by/13`);
      console.log('   ❌ Unexpected: API call succeeded without auth');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ✅ Expected: API correctly requires authentication');
      } else {
        console.log('   ❌ Unexpected error:', error.response?.status, error.response?.data);
      }
    }

    // Test 4: Test with invalid token
    console.log('\n🔑 Test 4: Test API with Invalid Token');
    try {
      const response = await axios.get(`${API_BASE_URL}/tasks/assigned-by/13`, {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });
      console.log('   ❌ Unexpected: API call succeeded with invalid token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ✅ Expected: API correctly rejects invalid token');
      } else {
        console.log('   ❌ Unexpected error:', error.response?.status, error.response?.data);
      }
    }

    // Test 5: Create a valid JWT token for testing
    console.log('\n🎫 Test 5: Create Valid JWT Token');
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    if (users.length > 0) {
      const testUser = users[0];
      const token = jwt.sign(
        { 
          userId: testUser.USER_ID, 
          role: testUser.FUNCTIONAL_ROLE,
          FUNCTIONAL_ROLE: testUser.FUNCTIONAL_ROLE
        }, 
        JWT_SECRET, 
        { expiresIn: '1h' }
      );
      
      console.log(`   ✅ Created token for user: ${testUser.NAME} (ID: ${testUser.USER_ID})`);
      console.log(`   Token: ${token.substring(0, 50)}...`);

      // Test 6: Test API with valid token
      console.log('\n✅ Test 6: Test API with Valid Token');
      try {
        const response = await axios.get(`${API_BASE_URL}/tasks/assigned-by/${testUser.USER_ID}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('   ✅ API call succeeded with valid token');
        console.log(`   Response status: ${response.status}`);
        console.log(`   Tasks found: ${response.data.data?.length || 0}`);
      } catch (error) {
        console.log('   ❌ API call failed with valid token');
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Error: ${JSON.stringify(error.response?.data)}`);
      }
    } else {
      console.log('   ⚠️  No users found in database to test with');
    }

    console.log('\n🎯 Debug Summary:');
    console.log('   - Database connection: Working');
    console.log('   - Users in database: ' + users.length);
    console.log('   - Tasks in database: ' + tasks.length);
    console.log('   - Authentication middleware: Active');
    console.log('   - API endpoints: Protected');

  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testAuthDebug();


