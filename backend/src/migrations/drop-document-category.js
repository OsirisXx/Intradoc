const { pool } = require('../config/database');

/**
 * Migration: Remove document_category from system
 * 
 * This migration removes the document_category table and its foreign key
 * from the document table. The category functionality was not being actively
 * used in the UI - no category selection was exposed to users.
 * 
 * Run: node src/migrations/drop-document-category.js
 */

async function dropDocumentCategory() {
  try {
    console.log('🔄 Starting migration: Remove document_category...');
    
    // Step 1: Check if document table exists and get foreign key constraint name
    const [constraints] = await pool.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'document'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      AND CONSTRAINT_NAME LIKE '%category%'
    `);
    
    if (constraints.length > 0) {
      console.log('📋 Found foreign key constraints on CATEGORY_ID. Dropping...');
      
      for (const constraint of constraints) {
        console.log(`   Removing foreign key constraint: ${constraint.CONSTRAINT_NAME}`);
        await pool.query(`
          ALTER TABLE document 
          DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}
        `);
      }
    } else {
      console.log('ℹ️  No foreign key constraints found on CATEGORY_ID');
    }
    
    // Step 2: Drop CATEGORY_ID column from document table
    console.log('📋 Dropping CATEGORY_ID column from document table...');
    await pool.query('ALTER TABLE document DROP COLUMN IF EXISTS CATEGORY_ID');
    console.log('✅ Successfully dropped CATEGORY_ID column');
    
    // Step 3: Check if document_category table exists
    const [tables] = await pool.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'document_category'
    `);
    
    if (tables.length === 0) {
      console.log('ℹ️  Table document_category does not exist. Skipping...');
    } else {
      console.log('📋 Dropping document_category table...');
      
      // Drop any remaining foreign key constraints on document_category
      const [categoryConstraints] = await pool.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'document_category'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      `);
      
      for (const constraint of categoryConstraints) {
        console.log(`   Removing foreign key constraint: ${constraint.CONSTRAINT_NAME}`);
        await pool.query(`
          ALTER TABLE document_category 
          DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}
        `);
      }
      
      // Drop the table
      await pool.query('DROP TABLE IF EXISTS document_category');
      console.log('✅ Successfully dropped document_category table');
    }
    
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
dropDocumentCategory();

