const axios = require('axios');

async function testUsersAPI() {
  try {
    console.log('Testing users API...');
    
    // Test without auth first
    const response = await axios.get('http://localhost:3001/api/users/section/1?functionalRole=staff');
    console.log('Response:', response.data);
  } catch (error) {
    console.log('Error:', error.response?.status, error.response?.data || error.message);
  }
}

testUsersAPI();







