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
router.delete('/:taskId', tasksController.deleteTask);

// Special queries
router.get('/overdue/:userId', tasksController.getOverdueTasks);

// Document linking
router.post('/:taskId/link-document', tasksController.linkDocumentToTask);
router.get('/:taskId/documents', tasksController.getDocumentsForTask);

module.exports = router;
