const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { 
  getUsersBySection, 
  getAllUsers, 
  getCurrentUser, 
  updateProfile, 
  updatePassword, 
  uploadProfileImage,
  getDivisionManagers,
  updateUserRole,
  deleteUser
} = require('../controllers/users.controller');

// Get users by section (with optional functional role filter)
router.get('/section/:sectionId', authenticate, getUsersBySection);

// Get Division Managers by division ID
router.get('/division-managers/:divisionId', authenticate, getDivisionManagers);

// Get all users (admin only)
router.get('/', authenticate, getAllUsers);

// Update user role (admin only)
router.put('/:userId/role', authenticate, updateUserRole);

// Delete user (admin only)
router.delete('/:userId', authenticate, deleteUser);

// Profile management routes
router.get('/profile', authenticate, getCurrentUser);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, updatePassword);
router.post('/profile-image', authenticate, uploadProfileImage);

module.exports = router;
