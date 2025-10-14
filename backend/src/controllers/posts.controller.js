const { pool } = require('../config/database');

// Get all posts with author information
exports.getAllPosts = async (req, res) => {
  try {
    const [posts] = await pool.query(`
      SELECT 
        sp.POST_ID,
        sp.TITLE,
        sp.MESSAGE,
        sp.POSTED_BY,
        sp.SECTION_ID,
        sp.ATTACHMENT_LINK,
        sp.CREATED_AT,
        u.NAME as AUTHOR_NAME,
        u.FUNCTIONAL_ROLE as AUTHOR_ROLE,
        s.NAME as SECTION_NAME,
        sp.ATTACHMENT_FILE_URL,
        sp.ATTACHMENT_EXTERNAL_URL
      FROM stream_post sp
      LEFT JOIN user u ON sp.POSTED_BY = u.USER_ID
      LEFT JOIN section s ON sp.SECTION_ID = s.SECTION_ID
      ORDER BY sp.CREATED_AT DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get posts by section
exports.getPostsBySection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    
    const [posts] = await pool.query(`
      SELECT 
        sp.POST_ID,
        sp.TITLE,
        sp.MESSAGE,
        sp.POSTED_BY,
        sp.SECTION_ID,
        sp.ATTACHMENT_LINK,
        sp.CREATED_AT,
        u.NAME as AUTHOR_NAME,
        u.FUNCTIONAL_ROLE as AUTHOR_ROLE,
        s.NAME as SECTION_NAME
      FROM stream_post sp
      LEFT JOIN user u ON sp.POSTED_BY = u.USER_ID
      LEFT JOIN section s ON sp.SECTION_ID = s.SECTION_ID
      WHERE sp.SECTION_ID = ?
      ORDER BY sp.CREATED_AT DESC
      LIMIT 50
    `, [sectionId]);

    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Get posts by section error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new post
exports.createPost = async (req, res) => {
  try {
    const { title, message, sectionId, attachmentLink, attachmentFileUrl, attachmentExternalUrl } = req.body;
    const postedBy = req.user.userId;

    // Validate required fields
    if (!title || !message || !sectionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, message, sectionId'
      });
    }

    // Insert post
    const [result] = await pool.query(
      `INSERT INTO stream_post (
        TITLE, MESSAGE, POSTED_BY, SECTION_ID, ATTACHMENT_LINK, ATTACHMENT_FILE_URL, ATTACHMENT_EXTERNAL_URL
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, message, postedBy, sectionId, attachmentLink || null, attachmentFileUrl || null, attachmentExternalUrl || null]
    );

    // Get the created post with author info
    const [newPost] = await pool.query(`
      SELECT 
        sp.POST_ID,
        sp.TITLE,
        sp.MESSAGE,
        sp.POSTED_BY,
        sp.SECTION_ID,
        sp.ATTACHMENT_LINK,
        sp.CREATED_AT,
        u.NAME as AUTHOR_NAME,
        u.FUNCTIONAL_ROLE as AUTHOR_ROLE,
        s.NAME as SECTION_NAME,
        sp.ATTACHMENT_FILE_URL,
        sp.ATTACHMENT_EXTERNAL_URL
      FROM stream_post sp
      LEFT JOIN user u ON sp.POSTED_BY = u.USER_ID
      LEFT JOIN section s ON sp.SECTION_ID = s.SECTION_ID
      WHERE sp.POST_ID = ?
    `, [result.insertId]);

    res.json({
      success: true,
      message: 'Post created successfully',
      data: newPost[0]
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Upload attachment for a stream post
exports.uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    // Construct absolute public URL path (served by /api/uploads in server.js)
    const filename = req.file.filename;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}/api/uploads/${filename}`;
    return res.json({ success: true, url });
  } catch (error) {
    console.error('Upload post attachment error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Update post
exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, message, attachmentLink, attachmentFileUrl, attachmentExternalUrl } = req.body;
    const userId = req.user.userId;

    // Check if user owns the post
    const [postCheck] = await pool.query(
      'SELECT POSTED_BY FROM stream_post WHERE POST_ID = ?',
      [postId]
    );

    if (postCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    if (postCheck[0].POSTED_BY !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own posts'
      });
    }

    // Update post
    await pool.query(
      `UPDATE stream_post 
       SET TITLE = ?, MESSAGE = ?, ATTACHMENT_LINK = ?, ATTACHMENT_FILE_URL = ?, ATTACHMENT_EXTERNAL_URL = ?
       WHERE POST_ID = ?`,
      [title, message, attachmentLink || null, attachmentFileUrl || null, attachmentExternalUrl || null, postId]
    );

    res.json({
      success: true,
      message: 'Post updated successfully'
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete post
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    // Check if user owns the post
    const [postCheck] = await pool.query(
      'SELECT POSTED_BY FROM stream_post WHERE POST_ID = ?',
      [postId]
    );

    if (postCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    if (postCheck[0].POSTED_BY !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own posts'
      });
    }

    // Delete post
    await pool.query('DELETE FROM stream_post WHERE POST_ID = ?', [postId]);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
