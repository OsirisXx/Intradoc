const { pool } = require('./config/database');

async function testFeedbackFlow() {
  try {
    console.log('🧪 Testing Feedback Flow...\n');

    // 1. Check if there are any completed tasks
    console.log('1. Checking for completed tasks...');
    const [completedTasks] = await pool.query(
      'SELECT t.*, u1.NAME as ASSIGNED_TO_NAME, u2.NAME as ASSIGNED_BY_NAME FROM TASK t LEFT JOIN user u1 ON t.ASSIGNED_TO = u1.USER_ID LEFT JOIN user u2 ON t.ASSIGNED_BY = u2.USER_ID WHERE t.STATUS = "completed" LIMIT 5'
    );
    
    if (completedTasks.length === 0) {
      console.log('❌ No completed tasks found. You need to complete some tasks first.');
      console.log('   To test:');
      console.log('   1. Login as staff user');
      console.log('   2. Go to tasks page');
      console.log('   3. Complete a task');
      console.log('   4. Then login as section unit head to provide feedback\n');
      
      // Check for any tasks that can be completed
      const [allTasks] = await pool.query(
        'SELECT t.*, u1.NAME as ASSIGNED_TO_NAME, u2.NAME as ASSIGNED_BY_NAME FROM TASK t LEFT JOIN user u1 ON t.ASSIGNED_TO = u1.USER_ID LEFT JOIN user u2 ON t.ASSIGNED_BY = u2.USER_ID WHERE t.STATUS IN ("pending", "in_progress") LIMIT 5'
      );
      
      if (allTasks.length > 0) {
        console.log('📋 Available tasks to complete:');
        allTasks.forEach(task => {
          console.log(`   - ID: ${task.TASK_ID}, Title: ${task.TITLE}, Status: ${task.STATUS}, Assigned to: ${task.ASSIGNED_TO_NAME}`);
        });
      }
      return;
    }

    console.log(`✅ Found ${completedTasks.length} completed tasks:`);
    completedTasks.forEach(task => {
      console.log(`   - ID: ${task.TASK_ID}, Title: "${task.TITLE}", Assigned to: ${task.ASSIGNED_TO_NAME}`);
    });
    console.log('');

    // 2. Check existing feedback
    console.log('2. Checking existing feedback...');
    const [existingFeedback] = await pool.query(
      'SELECT f.*, u1.NAME as AUTHOR_NAME, u2.NAME as RECIPIENT_NAME FROM feedback f LEFT JOIN user u1 ON f.AUTHOR_ID = u1.USER_ID LEFT JOIN user u2 ON f.RECIPIENT_ID = u2.USER_ID ORDER BY f.CREATED_AT DESC LIMIT 5'
    );
    
    if (existingFeedback.length === 0) {
      console.log('❌ No feedback found. This explains why staff feedback page is empty.');
      console.log('   To create feedback:');
      console.log('   1. Login as section unit head');
      console.log('   2. Go to task assignment page');
      console.log('   3. Find completed tasks and click "Feedback" button');
      console.log('   4. Fill out the feedback form\n');
    } else {
      console.log(`✅ Found ${existingFeedback.length} feedback entries:`);
      existingFeedback.forEach(feedback => {
        console.log(`   - ID: ${feedback.FEEDBACK_ID}, Type: ${feedback.TYPE}, From: ${feedback.AUTHOR_NAME}, To: ${feedback.RECIPIENT_NAME}, Read: ${feedback.IS_READ ? 'Yes' : 'No'}`);
      });
      console.log('');
    }

    // 3. Check user roles for testing
    console.log('3. Checking available users for testing...');
    const [users] = await pool.query(
      'SELECT USER_ID, NAME, EMAIL, FUNCTIONAL_ROLE FROM user WHERE FUNCTIONAL_ROLE IN ("staff", "section_unit_head") ORDER BY FUNCTIONAL_ROLE, NAME LIMIT 10'
    );
    
    console.log('Available test users:');
    const staffUsers = users.filter(u => u.FUNCTIONAL_ROLE === 'staff');
    const sectionHeads = users.filter(u => u.FUNCTIONAL_ROLE === 'section_unit_head');
    
    if (staffUsers.length > 0) {
      console.log('   Staff users:');
      staffUsers.forEach(user => {
        console.log(`   - ${user.NAME} (${user.EMAIL})`);
      });
    }
    
    if (sectionHeads.length > 0) {
      console.log('   Section Unit Heads:');
      sectionHeads.forEach(user => {
        console.log(`   - ${user.NAME} (${user.EMAIL})`);
      });
    }
    console.log('');

    // 4. Test feedback creation (simulate)
    console.log('4. Testing feedback creation process...');
    if (completedTasks.length > 0 && sectionHeads.length > 0 && staffUsers.length > 0) {
      const testTask = completedTasks[0];
      const testSectionHead = sectionHeads[0];
      const testStaff = staffUsers[0];
      
      console.log('   Test scenario:');
      console.log(`   - Task: "${testTask.TITLE}" (ID: ${testTask.TASK_ID})`);
      console.log(`   - Section Head: ${testSectionHead.NAME} (ID: ${testSectionHead.USER_ID})`);
      console.log(`   - Staff Member: ${testStaff.NAME} (ID: ${testStaff.USER_ID})`);
      console.log('');
      
      console.log('   To create test feedback:');
      console.log(`   1. Login as ${testSectionHead.EMAIL}`);
      console.log(`   2. Go to http://localhost:5173/section-unit-head/task-assignment`);
      console.log(`   3. Find task "${testTask.TITLE}" (should show "Feedback" button)`);
      console.log(`   4. Click "Feedback" button and fill out the form`);
      console.log(`   5. Login as ${testStaff.EMAIL}`);
      console.log(`   6. Go to http://localhost:5173/staff/feedback`);
      console.log(`   7. You should see the feedback you just created`);
      console.log('');
    }

    console.log('✅ Feedback flow test completed!');

  } catch (error) {
    console.error('❌ Error testing feedback flow:', error);
  } finally {
    process.exit(0);
  }
}

testFeedbackFlow();
