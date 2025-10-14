const axios = require('axios');

async function testSaraLogin() {
  try {
    console.log('Testing Sara Owens login...');
    
    // Try common passwords
    const passwords = ['password123', 'user123', 'staff123', 'sara123', '123456'];
    
    for (const password of passwords) {
      try {
        console.log(`Trying password: ${password}`);
        const response = await axios.post('http://localhost:3001/api/auth/login', {
          email: 'staff.engineering@nia.gov.ph',
          password: password
        });
        
        if (response.data.success) {
          console.log('✅ Login successful!');
          console.log('Token:', response.data.token.substring(0, 50) + '...');
          console.log('User:', response.data.user);
          
          // Test the tasks API with this token
          const tasksResponse = await axios.get('http://localhost:3001/api/tasks/assigned-to/19', {
            headers: {
              'Authorization': `Bearer ${response.data.token}`
            }
          });
          
          console.log('\nSara Owens tasks:');
          console.log(tasksResponse.data);
          
          return;
        }
      } catch (error) {
        console.log(`❌ Failed with password: ${password}`);
      }
    }
    
    console.log('❌ All password attempts failed');
    
  } catch (error) {
    console.log('Error:', error.response?.data || error.message);
  }
}

testSaraLogin();





