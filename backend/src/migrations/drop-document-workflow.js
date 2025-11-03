const { pool } = require('../config/database');

/**
 * Migration: Remove document_workflow table
 * 
 * This migration removes the document_workflow table which was planned
 * but never implemented. The workflow functionality is handled through
 * the document_status table and hardcoded logic.
 * 
 * Run: node src/migrations/drop-document-workflow.js
 */

async function dropDocumentWorkflow() {
  try {
    console.log('🔄 Starting migration: Remove document_workflow...');
    
    // Step 1: Check if document_workflow table exists and get foreign key constraint names
    const [tables] = await pool.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'document_workflow'
    `);
    
    if (tables.length === 0) {
      console.log('ℹ️  Table document_workflow does not exist. Skipping...');
      console.log('✅ Migration completed successfully');
      return;
    }
    
    console.log('📋 Found document_workflow table. Checking foreign key constraints...');
    
    // Get foreign key constraints
    const [constraints] = await pool.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'document_workflow'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `);
    
    // Drop foreign keys if they exist
    if (constraints.length > 0) {
      console.log(`📋 Found ${constraints.length} foreign key constraint(s). Dropping...`);
      
      for (const constraint of constraints) {
        console.log(`   Removing foreign key constraint: ${constraint.CONSTRAINT_NAME}`);
        await pool.query(`
          ALTER TABLE document_workflow 
          DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}
        `);
      }
    } else {
      console.log('ℹ️  No foreign key constraints found on document_workflow');
    }
    
    // Drop the table
    console.log('📋 Dropping document_workflow table...');
    await pool.query('DROP TABLE IF EXISTS document_workflow');
    
    console.log('✅ Successfully dropped document_workflow table');
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Close the connection
    await pool.end();
    process.exit(0);
  }
}

// Run the migration
dropDocumentWorkflow();

