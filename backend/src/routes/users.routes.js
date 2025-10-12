const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getUsersBySection, getAllUsers } = require('../controllers/users.controller');

// Get users by section (with optional functional role filter)
router.get('/section/:sectionId', authenticate, getUsersBySection);

// Get all users (admin only)
router.get('/', authenticate, getAllUsers);

module.exports = router;
