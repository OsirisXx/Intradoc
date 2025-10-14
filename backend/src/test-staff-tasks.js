const { pool } = require('./config/database');

async function testStaffTasks() {
  try {
    console.log('Testing staff tasks...');
    
    // Test Sara Owens (ID: 19)
    console.log('\n=== Sara Owens (ID: 19) Tasks ===');
    const [saraTasks] = await pool.query(`
      SELECT 
        t.TASK_ID,
        t.TITLE,
        t.DESCRIPTION,
        t.ASSIGNED_TO,
        t.ASSIGNED_BY,
        t.DUE_DATE,
        t.PRIORITY,
        t.STATUS,
        assigner.NAME as ASSIGNED_BY_NAME,
        s.NAME as SECTION_NAME
      FROM TASK t
      LEFT JOIN user assigner ON t.ASSIGNED_BY = assigner.USER_ID
      LEFT JOIN section s ON t.SECTION_ID = s.SECTION_ID
      WHERE t.ASSIGNED_TO = 19
      ORDER BY t.DUE_DATE ASC, t.PRIORITY DESC
    `);
    
    console.log('Sara Owens has', saraTasks.length, 'tasks:');
    saraTasks.forEach(task => {
      console.log(`  - ${task.TITLE} (${task.STATUS}, Due: ${task.DUE_DATE})`);
    });
    
    // Test John doe (ID: 18)
    console.log('\n=== John doe (ID: 18) Tasks ===');
    const [johnTasks] = await pool.query(`
      SELECT 
        t.TASK_ID,
        t.TITLE,
        t.DESCRIPTION,
        t.ASSIGNED_TO,
        t.ASSIGNED_BY,
        t.DUE_DATE,
        t.PRIORITY,
        t.STATUS,
        assigner.NAME as ASSIGNED_BY_NAME,
        s.NAME as SECTION_NAME
      FROM TASK t
      LEFT JOIN user assigner ON t.ASSIGNED_BY = assigner.USER_ID
      LEFT JOIN section s ON t.SECTION_ID = s.SECTION_ID
      WHERE t.ASSIGNED_TO = 18
      ORDER BY t.DUE_DATE ASC, t.PRIORITY DESC
    `);
    
    console.log('John doe has', johnTasks.length, 'tasks:');
    johnTasks.forEach(task => {
      console.log(`  - ${task.TITLE} (${task.STATUS}, Due: ${task.DUE_DATE})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error testing staff tasks:', error);
    process.exit(1);
  }
}

testStaffTasks();





