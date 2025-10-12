const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedback.controller');
const { authenticate } = require('../middleware/auth');

// All feedback routes require authentication
router.use(authenticate);

// Feedback CRUD operations
router.post('/', feedbackController.createFeedback);
router.get('/user/:userId', feedbackController.getFeedbackForUser);
router.get('/document/:documentId', feedbackController.getFeedbackByDocument);
router.get('/task/:taskId', feedbackController.getFeedbackByTask);
router.get('/written-by/:userId', feedbackController.getFeedbackWrittenBy);
router.get('/unread-count/:userId', feedbackController.getUnreadFeedbackCount);

// Feedback actions
router.put('/:feedbackId/read', feedbackController.markFeedbackAsRead);

module.exports = router;
