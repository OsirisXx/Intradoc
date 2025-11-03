const { pool } = require('../config/database');

/**
 * Migration: Drop document_requirement table
 * 
 * This migration removes the unused document_requirement table from the database.
 * The table was planned but never implemented in the system, and all functionality
 * is handled by the TASK table instead.
 * 
 * Run: node src/migrations/drop-document-requirement-table.js
 */

async function dropDocumentRequirementTable() {
  try {
    console.log('🔄 Starting migration: Drop document_requirement table...');
    
    // Check if table exists
    const [tables] = await pool.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'document_requirement'
    `);
    
    if (tables.length === 0) {
      console.log('ℹ️  Table document_requirement does not exist. Skipping...');
      console.log('✅ Migration completed successfully');
      return;
    }
    
    console.log('📋 Found document_requirement table. Dropping...');
    
    // Drop foreign key constraints first (if they exist)
    // Note: We need to get the constraint names dynamically
    const [constraints] = await pool.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'document_requirement'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `);
    
    for (const constraint of constraints) {
      console.log(`   Removing foreign key constraint: ${constraint.CONSTRAINT_NAME}`);
      await pool.query(`
        ALTER TABLE document_requirement 
        DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}
      `);
    }
    
    // Drop the table
    await pool.query('DROP TABLE IF EXISTS document_requirement');
    
    console.log('✅ Successfully dropped document_requirement table');
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
dropDocumentRequirementTable();

