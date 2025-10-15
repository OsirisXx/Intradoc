const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { 
  getUsersBySection, 
  getAllUsers, 
  getCurrentUser, 
  updateProfile, 
  updatePassword, 
  uploadProfileImage 
} = require('../controllers/users.controller');

// Get users by section (with optional functional role filter)
router.get('/section/:sectionId', authenticate, getUsersBySection);

// Get all users (admin only)
router.get('/', authenticate, getAllUsers);

// Profile management routes
router.get('/profile', authenticate, getCurrentUser);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, updatePassword);
router.post('/profile-image', authenticate, uploadProfileImage);

module.exports = router;
