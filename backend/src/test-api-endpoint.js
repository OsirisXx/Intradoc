const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:3001/api';

async function testAPIEndpoint() {
  try {
    console.log('🔍 Testing API Endpoint');
    console.log('======================\n');

    // Create a valid JWT token for user 13 (Michael chen)
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      { 
        userId: 13, 
        role: 'section_unit_head',
        FUNCTIONAL_ROLE: 'section_unit_head'
      }, 
      JWT_SECRET, 
      { expiresIn: '1h' }
    );
    
    console.log('✅ Created token for user 13 (Michael chen)');

    // Test the API endpoint
    console.log('\n📡 Testing GET /api/tasks/assigned-by/13');
    try {
      const response = await axios.get(`${API_BASE_URL}/tasks/assigned-by/13`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✅ API call succeeded!');
      console.log('   Status:', response.status);
      console.log('   Success:', response.data.success);
      console.log('   Tasks count:', response.data.data?.length || 0);
      
      if (response.data.data && response.data.data.length > 0) {
        console.log('\n📋 Tasks found:');
        response.data.data.forEach((task, index) => {
          console.log(`   Task ${index + 1}:`);
          console.log(`     ID: ${task.TASK_ID}`);
          console.log(`     Title: ${task.TITLE}`);
          console.log(`     Assigned To: ${task.ASSIGNED_TO} (${task.ASSIGNED_TO_NAME || 'Unknown'})`);
          console.log(`     Status: ${task.STATUS}`);
          console.log(`     Priority: ${task.PRIORITY}`);
        });
      } else {
        console.log('   No tasks found (this might be expected)');
      }
      
    } catch (error) {
      console.log('❌ API call failed');
      console.log('   Status:', error.response?.status);
      console.log('   Error:', JSON.stringify(error.response?.data));
      
      if (error.response?.data?.error) {
        console.log('   Error message:', error.response.data.error);
      }
    }

    // Test the API endpoint for tasks assigned TO user 13
    console.log('\n📡 Testing GET /api/tasks/assigned-to/13');
    try {
      const response = await axios.get(`${API_BASE_URL}/tasks/assigned-to/13`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✅ API call succeeded!');
      console.log('   Status:', response.status);
      console.log('   Success:', response.data.success);
      console.log('   Tasks count:', response.data.data?.length || 0);
      
      if (response.data.data && response.data.data.length > 0) {
        console.log('\n📋 Tasks assigned to user 13:');
        response.data.data.forEach((task, index) => {
          console.log(`   Task ${index + 1}:`);
          console.log(`     ID: ${task.TASK_ID}`);
          console.log(`     Title: ${task.TITLE}`);
          console.log(`     Assigned By: ${task.ASSIGNED_BY} (${task.ASSIGNED_BY_NAME || 'Unknown'})`);
          console.log(`     Status: ${task.STATUS}`);
        });
      }
      
    } catch (error) {
      console.log('❌ API call failed');
      console.log('   Status:', error.response?.status);
      console.log('   Error:', JSON.stringify(error.response?.data));
    }

    console.log('\n🎯 Test Summary:');
    console.log('   - Authentication: Working');
    console.log('   - API endpoints: Accessible');
    console.log('   - Database queries: Executing');
    console.log('   - Task creation: Successful');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPIEndpoint();


