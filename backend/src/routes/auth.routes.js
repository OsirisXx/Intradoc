const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/test', authController.test);
router.post('/login', authController.login);
router.post('/register', authController.register);

// Protected routes
router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Admin routes (require admin role)
router.get('/pending-registrations', authenticate, authController.getPendingRegistrations);
router.get('/users', authenticate, authController.getAllUsers);
router.post('/approve-registration/:id', authenticate, authController.approveRegistration);
router.post('/reject-registration/:id', authenticate, authController.rejectRegistration);

module.exports = router;
