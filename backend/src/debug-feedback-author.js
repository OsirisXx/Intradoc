const { pool } = require('./config/database');

async function debugFeedbackAuthor() {
  try {
    console.log('🔍 Debugging Feedback Author Issue...\n');

    // 1. Check feedback table structure
    console.log('1. Checking feedback table structure...');
    const [feedbackStructure] = await pool.query('DESCRIBE feedback');
    console.log('Feedback table columns:');
    feedbackStructure.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'}`);
    });
    console.log('');

    // 2. Check user table structure
    console.log('2. Checking user table structure...');
    const [userStructure] = await pool.query('DESCRIBE user');
    console.log('User table columns:');
    userStructure.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'}`);
    });
    console.log('');

    // 3. Check for any feedback entries
    console.log('3. Checking existing feedback entries...');
    const [feedbackEntries] = await pool.query(`
      SELECT 
        f.FEEDBACK_ID,
        f.AUTHOR_ID,
        f.RECIPIENT_ID,
        f.TYPE,
        f.CONTENT,
        f.CREATED_AT,
        f.IS_READ,
        author.NAME as AUTHOR_NAME,
        author.EMAIL as AUTHOR_EMAIL,
        recipient.NAME as RECIPIENT_NAME,
        recipient.EMAIL as RECIPIENT_EMAIL
      FROM feedback f
      LEFT JOIN user author ON f.AUTHOR_ID = author.USER_ID
      LEFT JOIN user recipient ON f.RECIPIENT_ID = recipient.USER_ID
      ORDER BY f.CREATED_AT DESC
      LIMIT 10
    `);

    if (feedbackEntries.length === 0) {
      console.log('❌ No feedback entries found in the database.');
      console.log('   This explains why the feedback page is empty.');
      console.log('   You need to create some feedback first.');
      return;
    }

    console.log(`✅ Found ${feedbackEntries.length} feedback entries:`);
    feedbackEntries.forEach((feedback, index) => {
      console.log(`\n   ${index + 1}. Feedback ID: ${feedback.FEEDBACK_ID}`);
      console.log(`      Type: ${feedback.TYPE}`);
      console.log(`      Content: ${feedback.CONTENT.substring(0, 50)}${feedback.CONTENT.length > 50 ? '...' : ''}`);
      console.log(`      Created: ${feedback.CREATED_AT}`);
      console.log(`      Author ID: ${feedback.AUTHOR_ID}`);
      console.log(`      Author Name: ${feedback.AUTHOR_NAME || 'NULL/Unknown'}`);
      console.log(`      Author Email: ${feedback.AUTHOR_EMAIL || 'NULL/Unknown'}`);
      console.log(`      Recipient ID: ${feedback.RECIPIENT_ID}`);
      console.log(`      Recipient Name: ${feedback.RECIPIENT_NAME || 'NULL/Unknown'}`);
      console.log(`      Is Read: ${feedback.IS_READ ? 'Yes' : 'No'}`);
      
      if (!feedback.AUTHOR_NAME) {
        console.log(`      ⚠️  ISSUE: Author name is NULL! This will show as "Unknown" in the UI.`);
        
        // Check if author exists in user table
        if (feedback.AUTHOR_ID) {
          const [authorCheck] = await pool.query(
            'SELECT USER_ID, NAME, EMAIL, FUNCTIONAL_ROLE FROM user WHERE USER_ID = ?',
            [feedback.AUTHOR_ID]
          );
          
          if (authorCheck.length > 0) {
            console.log(`      🔍 Author exists in user table: ${authorCheck[0].NAME} (${authorCheck[0].EMAIL})`);
          } else {
            console.log(`      ❌ Author ID ${feedback.AUTHOR_ID} not found in user table!`);
          }
        }
      }
    });

    // 4. Test the exact query used by the API
    console.log('\n4. Testing API query...');
    if (feedbackEntries.length > 0) {
      const testRecipientId = feedbackEntries[0].RECIPIENT_ID;
      console.log(`Testing with recipient ID: ${testRecipientId}`);
      
      const [apiResult] = await pool.query(`
        SELECT 
          f.FEEDBACK_ID,
          f.AUTHOR_ID,
          f.RECIPIENT_ID,
          f.RELATED_TASK_ID,
          f.RELATED_DOCUMENT_ID,
          f.TYPE,
          f.CONTENT,
          f.CREATED_AT,
          f.IS_READ,
          author.NAME as AUTHOR_NAME,
          author.FUNCTIONAL_ROLE as AUTHOR_ROLE,
          recipient.NAME as RECIPIENT_NAME,
          t.TITLE as TASK_TITLE,
          d.TITLE as DOCUMENT_TITLE
        FROM feedback f
        LEFT JOIN user author ON f.AUTHOR_ID = author.USER_ID
        LEFT JOIN user recipient ON f.RECIPIENT_ID = recipient.USER_ID
        LEFT JOIN TASK t ON f.RELATED_TASK_ID = t.TASK_ID
        LEFT JOIN document d ON f.RELATED_DOCUMENT_ID = d.DOCUMENT_ID
        WHERE f.RECIPIENT_ID = ?
        ORDER BY f.CREATED_AT DESC
      `, [testRecipientId]);

      console.log(`API query result: ${apiResult.length} entries`);
      if (apiResult.length > 0) {
        const testFeedback = apiResult[0];
        console.log(`   - FEEDBACK_ID: ${testFeedback.FEEDBACK_ID}`);
        console.log(`   - AUTHOR_NAME: ${testFeedback.AUTHOR_NAME || 'NULL'}`);
        console.log(`   - AUTHOR_ROLE: ${testFeedback.AUTHOR_ROLE || 'NULL'}`);
        console.log(`   - RECIPIENT_NAME: ${testFeedback.RECIPIENT_NAME || 'NULL'}`);
      }
    }

    console.log('\n✅ Debug completed!');

  } catch (error) {
    console.error('❌ Error debugging feedback author:', error);
  } finally {
    process.exit(0);
  }
}

debugFeedbackAuthor();
