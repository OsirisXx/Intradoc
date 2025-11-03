const express = require('express');
const router = express.Router();
const documentsController = require('../controllers/documents.controller');
const { authenticate } = require('../middleware/auth');

// All document routes require authentication
router.use(authenticate);

// Document CRUD operations
router.get('/', documentsController.getDocuments);
router.get('/section/:sectionId', documentsController.getDocumentsBySection);
router.post('/upload', documentsController.uploadDocument);
// Allow deletion with guard rules in controller
router.delete('/:documentId', documentsController.deleteDocument);

// Document approval workflow
router.get('/pending-review', documentsController.getPendingReview);
router.post('/:documentId/approve', documentsController.approveDocument);
router.post('/:documentId/reject', documentsController.rejectDocument);
router.post('/:documentId/request-revision', documentsController.requestRevision);
router.post('/:documentId/forward-regional', documentsController.forwardToRegional);
router.get('/:documentId/approval-history', documentsController.getApprovalHistory);
router.get('/progress/:userId', documentsController.getDocumentProgress);

// Forwarded documents for Regional Directors
router.get('/forwarded', documentsController.getForwardedDocuments);
router.post('/:documentId/approve-forwarded', documentsController.approveForwardedDocument);

// Document download
router.get('/download/:documentId', documentsController.downloadDocument);

// Per-viewer document archive for reports
router.post('/:documentId/archive', documentsController.archiveDocumentForViewer);
router.delete('/:documentId/archive', documentsController.unarchiveDocumentForViewer);
router.post('/bulk-archive', documentsController.bulkArchiveDocumentsForViewer);
router.get('/archive/list', documentsController.listArchivedDocumentsForViewer);

// Legacy endpoint (keep for backward compatibility)
router.post('/status', documentsController.updateDocumentStatus);

module.exports = router;
