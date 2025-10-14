const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login to get token...');
    
    // Login as Michael chen (section_unit_head) to get a token
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'michael.chen@nia.gov.ph',
      password: 'password123'  // Assuming this is the password
    });
    
    if (response.data.success) {
      console.log('Login successful!');
      console.log('Token:', response.data.token.substring(0, 50) + '...');
      console.log('User:', response.data.user);
      
      // Now test the users API with this token
      const usersResponse = await axios.get('http://localhost:3001/api/users/section/1?functionalRole=staff', {
        headers: {
          'Authorization': `Bearer ${response.data.token}`
        }
      });
      
      console.log('\nStaff in Section 1:');
      usersResponse.data.data.forEach(user => {
        console.log(`  - ${user.NAME} (ID: ${user.USER_ID})`);
      });
      
    } else {
      console.log('Login failed:', response.data.error);
    }
    
    process.exit(0);
  } catch (error) {
    console.log('Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

testLogin();





