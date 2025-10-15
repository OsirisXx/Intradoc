const { pool } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Get users by section ID
exports.getUsersBySection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { functionalRole } = req.query;

    let query = `
      SELECT 
        USER_ID,
        NAME,
        EMAIL,
        FUNCTIONAL_ROLE,
        ORGANIZATIONAL_ROLE,
        SECTION_ID,
        STATUS
      FROM user 
      WHERE SECTION_ID = ? AND STATUS = 'active'
    `;

    const params = [sectionId];

    // Filter by functional role if specified (e.g., only staff members)
    if (functionalRole) {
      query += ' AND FUNCTIONAL_ROLE = ?';
      params.push(functionalRole);
    }

    query += ' ORDER BY NAME ASC';

    const [users] = await pool.query(query, params);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users by section error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { functionalRole, sectionId } = req.query;

    let query = `
      SELECT 
        USER_ID,
        NAME,
        EMAIL,
        FUNCTIONAL_ROLE,
        ORGANIZATIONAL_ROLE,
        SECTION_ID,
        STATUS
      FROM user 
      WHERE STATUS = 'active'
    `;

    const params = [];

    // Filter by functional role if specified
    if (functionalRole) {
      query += ' AND FUNCTIONAL_ROLE = ?';
      params.push(functionalRole);
    }

    // Filter by section if specified
    if (sectionId) {
      query += ' AND SECTION_ID = ?';
      params.push(sectionId);
    }

    query += ' ORDER BY FUNCTIONAL_ROLE, SECTION_ID, NAME ASC';

    const [users] = await pool.query(query, params);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};

// Configure multer for profile image uploads
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  }
});

const profileUpload = multer({ 
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed.'));
    }
  }
});

// Get current user profile
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.USER_ID;
    
    const [users] = await pool.query(`
      SELECT 
        u.USER_ID,
        u.NAME,
        u.ID_NUMBER,
        u.EMAIL,
        u.FUNCTIONAL_ROLE,
        u.ORGANIZATIONAL_ROLE,
        u.SECTION_ID,
        u.STATUS,
        u.PROFILE_IMAGE,
        u.CREATED_AT,
        u.APPROVED_AT,
        s.NAME as SECTION_NAME,
        d.NAME as DIVISION_NAME
      FROM user u
      LEFT JOIN section s ON u.SECTION_ID = s.SECTION_ID
      LEFT JOIN division d ON s.DIVISION_ID = d.DIVISION_ID
      WHERE u.USER_ID = ?
    `, [userId]);

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = users[0];
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
  }
};

// Update user profile (name, email)
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.USER_ID;
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are required' });
    }

    // Check if email is already taken by another user
    const [existingUsers] = await pool.query(
      'SELECT USER_ID FROM user WHERE EMAIL = ? AND USER_ID != ?',
      [email, userId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, error: 'Email is already taken' });
    }

    // Update user profile
    await pool.query(
      'UPDATE user SET NAME = ?, EMAIL = ? WHERE USER_ID = ?',
      [name, email, userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
};

// Update user password
exports.updatePassword = async (req, res) => {
  try {
    const userId = req.user.USER_ID;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long' });
    }

    // Get current user's password hash
    const [users] = await pool.query(
      'SELECT PASSWORD FROM user WHERE USER_ID = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].PASSWORD);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE user SET PASSWORD = ? WHERE USER_ID = ?',
      [hashedPassword, userId]
    );

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ success: false, error: 'Failed to update password' });
  }
};

// Upload profile image
exports.uploadProfileImage = [profileUpload.single('profileImage'), async (req, res) => {
  try {
    const userId = req.user.USER_ID;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Delete old profile image if exists
    const [currentUser] = await pool.query(
      'SELECT PROFILE_IMAGE FROM user WHERE USER_ID = ?',
      [userId]
    );

    if (currentUser.length > 0 && currentUser[0].PROFILE_IMAGE) {
      const oldImagePath = path.join(__dirname, '../../uploads', currentUser[0].PROFILE_IMAGE.replace('/api/uploads/', ''));
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Save new profile image path to database
    const imagePath = `/api/uploads/profiles/${file.filename}`;
    await pool.query(
      'UPDATE user SET PROFILE_IMAGE = ? WHERE USER_ID = ?',
      [imagePath, userId]
    );

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: { imagePath }
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
    
    // Clean up uploaded file if database update failed
    if (req.file) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.status(500).json({ success: false, error: 'Failed to upload profile image' });
  }
}];

// Export multer middleware
exports.profileUpload = profileUpload;


