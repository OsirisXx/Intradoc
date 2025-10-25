const express = require('express');
const router = express.Router();
const tasksController = require('../controllers/tasks.controller');
const { authenticate } = require('../middleware/auth');

// All task routes require authentication
router.use(authenticate);

// Task CRUD operations
router.post('/', tasksController.createTask);
router.get('/assigned-to/:userId', tasksController.getTasksAssignedTo);
router.get('/assigned-by/:userId', tasksController.getTasksAssignedBy);
router.put('/:taskId/status', tasksController.updateTaskStatus);
router.put('/:taskId/complete', tasksController.completeTask);
// Submission workflow
router.put('/:taskId/submit', tasksController.submitTask);
router.put('/:taskId/unsubmit', tasksController.unsubmitTask);
router.delete('/:taskId', tasksController.deleteTask);

// Special queries
router.get('/overdue/:userId', tasksController.getOverdueTasks);
router.get('/all-tasks', tasksController.getAllTasksForOversight);

// Document linking
router.post('/:taskId/link-document', tasksController.linkDocumentToTask);
router.get('/:taskId/documents', tasksController.getDocumentsForTask);

// Task document approval workflow
router.get('/:taskId/approval-history/:userId', tasksController.getTaskApprovalHistory);
router.post('/:taskId/approve', tasksController.approveTaskDocuments);
router.post('/:taskId/reject', tasksController.rejectTaskDocuments);
router.post('/:taskId/forward-division', tasksController.forwardTaskToDivisionManager);
router.post('/:taskId/forward-regional', tasksController.forwardTaskToRegional);
router.post('/:taskId/send-back-section-head', tasksController.sendBackToSectionHead);

module.exports = router;
