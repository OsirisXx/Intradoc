const { pool } = require('../config/database');

async function up() {
  // Add new nullable columns for file and external link attachments
  await pool.query(`
    ALTER TABLE stream_post
      ADD COLUMN IF NOT EXISTS ATTACHMENT_FILE_URL VARCHAR(512) NULL,
      ADD COLUMN IF NOT EXISTS ATTACHMENT_EXTERNAL_URL VARCHAR(512) NULL;
  `).catch(() => {});

  // Best-effort backfill: if legacy ATTACHMENT_LINK exists, copy it to external URL
  try {
    await pool.query(`
      UPDATE stream_post
      SET ATTACHMENT_EXTERNAL_URL = COALESCE(ATTACHMENT_EXTERNAL_URL, ATTACHMENT_LINK)
      WHERE ATTACHMENT_LINK IS NOT NULL AND ATTACHMENT_EXTERNAL_URL IS NULL;
    `);
  } catch (_) {}
}

async function down() {
  // No destructive down migration by default
}

if (require.main === module) {
  up().then(() => {
    console.log('Migration add-post-attachment-columns executed');
    process.exit(0);
  }).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = { up, down };


