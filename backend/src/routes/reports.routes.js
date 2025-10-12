const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const { authenticate } = require('../middleware/auth');

// All report routes require authentication
router.use(authenticate);

// Report endpoints
router.get('/section/:sectionId', reportsController.getSectionReport);
router.get('/division/:divisionId', reportsController.getDivisionReport);
router.get('/system-overview', reportsController.getSystemOverview);
router.get('/staff/:userId', reportsController.getStaffReport);

module.exports = router;

