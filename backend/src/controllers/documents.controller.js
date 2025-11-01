const { pool } = require('../config/database');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Get all documents for a user (based on their section/role)
exports.getDocuments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    let query = `
      SELECT d.*, 
             dc.NAME as CATEGORY_NAME,
             s.NAME as SECTION_NAME,
             creator.NAME as CREATED_BY_NAME,
             ds.STATUS as CURRENT_STATUS
      FROM document d
      LEFT JOIN document_category dc ON d.CATEGORY_ID = dc.CATEGORY_ID
      LEFT JOIN section s ON d.SECTION_ID = s.SECTION_ID
      LEFT JOIN user creator ON d.CREATED_BY = creator.USER_ID
      LEFT JOIN (
        SELECT DOCUMENT_ID, STATUS 
        FROM document_status 
        WHERE STATUS_ID IN (
          SELECT MAX(STATUS_ID) 
          FROM document_status 
          GROUP BY DOCUMENT_ID
        )
      ) ds ON d.DOCUMENT_ID = ds.DOCUMENT_ID
    `;

    // Filter based on role
    if (userRole === 'staff') {
      query += ` WHERE d.CREATED_BY = ? AND d.TITLE NOT LIKE "%(Forwarded)%"
        AND d.DOCUMENT_ID IN (
          SELECT MAX(d2.DOCUMENT_ID)
          FROM document d2
          WHERE d2.CREATED_BY = ?
            AND d2.TITLE NOT LIKE "%(Forwarded)%"
            AND d2.FINGERPRINT_HASH = d.FINGERPRINT_HASH
          GROUP BY d2.FINGERPRINT_HASH
        )`;
    } else if (userRole === 'admin' || userRole === 'regional_director') {
      // Admin and Regional Director see all
    } else {
      // Section heads, managers see their section's documents
      query += ` WHERE d.SECTION_ID IN (
        SELECT SECTION_ID FROM user WHERE USER_ID = ?
      )`;
    }

    const [documents] = await pool.query(query, userRole === 'staff' ? [userId, userId] : [userId]);
    res.json({ success: true, data: documents });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch documents' });
  }
};

// Upload new document
exports.uploadDocument = [upload.single('file'), async (req, res) => {
  try {
    const { title, description, category, tags, uploadedBy, sectionId, fulfillsTaskId, documentUrl } = req.body;
    const file = req.file;

    // Check if either file or URL is provided
    if (!file && !documentUrl) {
      return res.status(400).json({ success: false, error: 'Either a file or document URL must be provided' });
    }

    let fileLink, hash;

    if (file) {
      // File upload - generate hash from file content
      const fileBuffer = fs.readFileSync(file.path);
      hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      fileLink = file.path;
    } else {
      // URL upload - generate hash from URL string
      hash = crypto.createHash('sha256').update(documentUrl).digest('hex');
      fileLink = documentUrl;
    }

    // If no category is provided, use a default category ID (1)
    const categoryId = category && category !== '' ? category : 1;

    // Insert document
    const [result] = await pool.query(
      `INSERT INTO document (
        TITLE, DESCRIPTION, FILE_LINK, FINGERPRINT_HASH, 
        CATEGORY_ID, SECTION_ID, CREATED_BY, ASSIGNED_TO,
        TAGS, FREQUENCY
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, fileLink, hash, categoryId, sectionId, uploadedBy, null, tags || null, 'One-time']
    );

    // Create initial status
    await pool.query(
      'INSERT INTO document_status (DOCUMENT_ID, STATUS, REMARKS) VALUES (?, ?, ?)',
      [result.insertId, 'Submitted', 'Document uploaded']
    );

    // Update task status if linked to task
    if (fulfillsTaskId) {
      // Link this document to the task as an attachment (store taskId in ASSIGNED_TO)
      await pool.query('UPDATE document SET ASSIGNED_TO = ? WHERE DOCUMENT_ID = ?', [fulfillsTaskId, result.insertId]);
      // Keep task in in_progress on first upload; don't overwrite submitted/completed
      await pool.query('UPDATE TASK SET STATUS = CASE WHEN STATUS IN ("pending") THEN "in_progress" ELSE STATUS END, UPDATED_AT = NOW() WHERE TASK_ID = ?', [fulfillsTaskId]);
      console.log(`Document ${result.insertId} linked to task ID: ${fulfillsTaskId}`);
    }

    // Notify section heads for review
    await notifySectionHeadsForReview(sectionId, result.insertId, title);

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: { DOCUMENT_ID: result.insertId }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}];

// Export multer upload middleware for use in routes
exports.upload = upload;

// Delete a document with task lock rules
exports.deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.userId;

    const [docs] = await pool.query('SELECT * FROM document WHERE DOCUMENT_ID = ?', [documentId]);
    if (docs.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    const doc = docs[0];

    // Only creator can delete
    if (doc.CREATED_BY !== userId) {
      return res.status(403).json({ success: false, error: 'You can only delete your own document' });
    }

    // If linked to a task via ASSIGNED_TO, ensure task is not submitted
    if (doc.ASSIGNED_TO) {
      const [tasks] = await pool.query('SELECT STATUS FROM TASK WHERE TASK_ID = ?', [doc.ASSIGNED_TO]);
      if (tasks.length > 0 && tasks[0].STATUS === 'submitted') {
        return res.status(400).json({ success: false, error: 'Cannot delete attachment while task is submitted. Unsubmit first.' });
      }
    }

    // Remove file from disk if local
    if (doc.FILE_LINK && !(doc.FILE_LINK.startsWith('http://') || doc.FILE_LINK.startsWith('https://'))) {
      try {
        if (fs.existsSync(doc.FILE_LINK)) {
          fs.unlinkSync(doc.FILE_LINK);
        }
      } catch (e) {
        console.warn('Failed to remove file from disk:', e.message);
      }
    }

    await pool.query('DELETE FROM document WHERE DOCUMENT_ID = ?', [documentId]);
    await pool.query('DELETE FROM document_status WHERE DOCUMENT_ID = ?', [documentId]);

    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete document' });
  }
};

// Get documents pending review (role-based)
exports.getPendingReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    let query = `
      SELECT d.*, 
             dc.NAME as CATEGORY_NAME,
             s.NAME as SECTION_NAME,
             creator.NAME as CREATED_BY_NAME,
             ds.STATUS as CURRENT_STATUS,
             ds.REMARKS as CURRENT_REMARKS,
             ds.CREATED_AT as STATUS_DATE
      FROM document d
      LEFT JOIN document_category dc ON d.CATEGORY_ID = dc.CATEGORY_ID
      LEFT JOIN section s ON d.SECTION_ID = s.SECTION_ID
      LEFT JOIN user creator ON d.CREATED_BY = creator.USER_ID
      LEFT JOIN (
        SELECT DOCUMENT_ID, STATUS, REMARKS, CREATED_AT
        FROM document_status 
        WHERE STATUS_ID IN (
          SELECT MAX(STATUS_ID) 
          FROM document_status 
          GROUP BY DOCUMENT_ID
        )
      ) ds ON d.DOCUMENT_ID = ds.DOCUMENT_ID
      WHERE ds.STATUS = ?
    `;

    let statusToReview;
    let params = [];

    switch (userRole) {
      case 'section_unit_head':
        statusToReview = 'Submitted';
        // Get documents from user's section
        query += ` AND d.SECTION_ID IN (SELECT SECTION_ID FROM user WHERE USER_ID = ?)`;
        params = [statusToReview, userId];
        break;
      case 'division_manager':
        statusToReview = 'Under_Division_Review';
        // Get documents from user's division
        query += ` AND d.SECTION_ID IN (
          SELECT s.SECTION_ID FROM section s
          JOIN user u ON s.DIVISION_ID = (
            SELECT s2.DIVISION_ID FROM section s2
            JOIN user u2 ON s2.SECTION_ID = u2.SECTION_ID
            WHERE u2.USER_ID = ?
          )
        )`;
        params = [statusToReview, userId];
        break;
      case 'regional_director':
        statusToReview = 'Under_Regional_Review';
        params = [statusToReview];
        break;
      case 'admin':
        // Admin can see all pending documents
        query = query.replace('WHERE ds.STATUS = ?', 'WHERE ds.STATUS IN ("Submitted", "Under_Division_Review", "Under_Regional_Review")');
        params = [];
        break;
      default:
        return res.status(403).json({ success: false, error: 'Unauthorized to review documents' });
    }

    query += ' ORDER BY ds.CREATED_AT ASC';

    const [documents] = await pool.query(query, params);
    res.json({ success: true, data: documents });
  } catch (error) {
    console.error('Get pending review error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending documents' });
  }
};

// Approve document
exports.approveDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { remarks } = req.body;
    const userId = req.user.USER_ID || req.user.userId;
    const userRole = req.user.FUNCTIONAL_ROLE || req.user.role;

    // Get document details
    const [documents] = await pool.query('SELECT * FROM document WHERE DOCUMENT_ID = ?', [documentId]);
    if (documents.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const document = documents[0];

    // Determine next status based on role
    let newStatus;
    let nextApproverRole;

    switch (userRole) {
      case 'section_unit_head':
        newStatus = 'Under_Division_Review';
        nextApproverRole = 'division_manager';
        break;
      case 'division_manager':
        newStatus = 'Under_Regional_Review';
        nextApproverRole = 'regional_director';
        break;
      case 'regional_director':
        newStatus = 'Approved';
        nextApproverRole = null; // Final approval
        break;
      default:
        return res.status(403).json({ success: false, error: 'Unauthorized to approve documents' });
    }

    // Insert new status
    await pool.query(
      'INSERT INTO document_status (DOCUMENT_ID, STATUS, REMARKS, CREATED_AT) VALUES (?, ?, ?, NOW())',
      [documentId, newStatus, remarks || 'Approved']
    );

    // Create approval record
    await pool.query(
      'INSERT INTO document_approval (DOCUMENT_ID, USER_ID, ROLE, STATUS, REMARKS, DATE_APPROVED) VALUES (?, ?, ?, 1, ?, NOW())',
      [documentId, userId, userRole, remarks || 'Approved']
    );

    // If final approval, archive document
    if (newStatus === 'Approved') {
      await pool.query(
        'INSERT INTO archive (DOCUMENT_ID, ARCHIVED_BY, DATE_ARCHIVED) VALUES (?, ?, NOW())',
        [documentId, userId]
      );
    }

    // Send notifications
    await notifyDocumentApproval(document, newStatus, remarks, userId, userRole);

    res.json({
      success: true,
      message: `Document ${newStatus === 'Approved' ? 'approved and archived' : 'approved and forwarded'}`
    });
  } catch (error) {
    console.error('Approve document error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve document' });
  }
};

// Reject document
exports.rejectDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { remarks } = req.body;
    const userId = req.user.userId;

    if (!remarks) {
      return res.status(400).json({ success: false, error: 'Rejection remarks are required' });
    }

    // Get document details
    const [documents] = await pool.query('SELECT * FROM document WHERE DOCUMENT_ID = ?', [documentId]);
    if (documents.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const document = documents[0];

    // Insert rejection status
    await pool.query(
      'INSERT INTO document_status (DOCUMENT_ID, STATUS, REMARKS, CREATED_AT) VALUES (?, "Rejected", ?, NOW())',
      [documentId, remarks]
    );

    // Create rejection record
    await pool.query(
      'INSERT INTO document_approval (DOCUMENT_ID, USER_ID, ROLE, STATUS, REMARKS, DATE_APPROVED) VALUES (?, ?, ?, 0, ?, NOW())',
      [documentId, userId, req.user.role, remarks]
    );

    // Notify document creator
    await createNotification({
      userId: document.CREATED_BY,
      type: 'document_rejected',
      title: 'Document Rejected',
      message: `Your document "${document.TITLE}" has been rejected. Reason: ${remarks}`,
      actionUrl: '/staff/work'
    });

    res.json({ success: true, message: 'Document rejected successfully' });
  } catch (error) {
    console.error('Reject document error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject document' });
  }
};

// Request revision
exports.requestRevision = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { remarks } = req.body;
    const userId = req.user.userId;

    if (!remarks) {
      return res.status(400).json({ success: false, error: 'Revision instructions are required' });
    }

    // Get document details
    const [documents] = await pool.query('SELECT * FROM document WHERE DOCUMENT_ID = ?', [documentId]);
    if (documents.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const document = documents[0];

    // Insert revision request status
    await pool.query(
      'INSERT INTO document_status (DOCUMENT_ID, STATUS, REMARKS, CREATED_AT) VALUES (?, "Revision_Required", ?, NOW())',
      [documentId, remarks]
    );

    // Create revision record
    await pool.query(
      'INSERT INTO document_approval (DOCUMENT_ID, USER_ID, ROLE, STATUS, REMARKS, DATE_APPROVED) VALUES (?, ?, ?, 0, ?, NOW())',
      [documentId, userId, req.user.role, remarks]
    );

    // Notify document creator
    await createNotification({
      userId: document.CREATED_BY,
      type: 'revision_required',
      title: 'Document Revision Required',
      message: `Your document "${document.TITLE}" requires revision. Instructions: ${remarks}`,
      actionUrl: '/staff/work'
    });

    res.json({ success: true, message: 'Revision requested successfully' });
  } catch (error) {
    console.error('Request revision error:', error);
    res.status(500).json({ success: false, error: 'Failed to request revision' });
  }
};

// Forward to Regional Director (Division Manager only)
exports.forwardToRegional = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { remarks } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole !== 'division_manager') {
      return res.status(403).json({ success: false, error: 'Only Division Managers can forward to Regional Director' });
    }

    // Get document details
    const [documents] = await pool.query('SELECT * FROM document WHERE DOCUMENT_ID = ?', [documentId]);
    if (documents.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const document = documents[0];

    // Update document forwarding status
    await pool.query(
      'UPDATE document SET FORWARDED_TO_REGIONAL = 1, FORWARDED_BY = ?, FORWARDED_AT = NOW() WHERE DOCUMENT_ID = ?',
      [userId, documentId]
    );

    // Insert forwarding status
    await pool.query(
      'INSERT INTO document_status (DOCUMENT_ID, STATUS, REMARKS, CREATED_AT) VALUES (?, "Under_Regional_Review", ?, NOW())',
      [documentId, remarks || 'Forwarded to Regional Director']
    );

    // Create forwarding record
    await pool.query(
      'INSERT INTO document_approval (DOCUMENT_ID, USER_ID, ROLE, STATUS, REMARKS, DATE_APPROVED) VALUES (?, ?, ?, 1, ?, NOW())',
      [documentId, userId, userRole, remarks || 'Forwarded to Regional Director']
    );

    // Notify Regional Directors
    await notifyRegionalDirectors(document, remarks);

    res.json({ success: true, message: 'Document forwarded to Regional Director' });
  } catch (error) {
    console.error('Forward to regional error:', error);
    res.status(500).json({ success: false, error: 'Failed to forward document' });
  }
};

// Get approval history for a document
exports.getApprovalHistory = async (req, res) => {
  try {
    const { documentId } = req.params;

    const [history] = await pool.query(
      `SELECT 
        da.APPROVAL_ID,
        da.DATE_APPROVED,
        da.REMARKS,
        da.STATUS as APPROVAL_STATUS,
        u.NAME as APPROVER_NAME,
        u.FUNCTIONAL_ROLE as APPROVER_ROLE,
        ds.STATUS as DOCUMENT_STATUS,
        ds.CREATED_AT as STATUS_DATE
      FROM document_approval da
      LEFT JOIN user u ON da.USER_ID = u.USER_ID
      LEFT JOIN document_status ds ON da.DOCUMENT_ID = ds.DOCUMENT_ID
      WHERE da.DOCUMENT_ID = ?
      ORDER BY da.DATE_APPROVED ASC`,
      [documentId]
    );

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Get approval history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch approval history' });
  }
};

// Legacy updateDocumentStatus method (keep for backward compatibility)
exports.updateDocumentStatus = async (req, res) => {
  try {
    const { documentId, action, remarks } = req.body;
    const userId = req.user.userId;

    switch (action) {
      case 'approve':
        req.params.documentId = documentId;
        req.body.remarks = remarks;
        return exports.approveDocument(req, res);
      case 'reject':
        req.params.documentId = documentId;
        req.body.remarks = remarks;
        return exports.rejectDocument(req, res);
      case 'request_revision':
        req.params.documentId = documentId;
        req.body.remarks = remarks;
        return exports.requestRevision(req, res);
      default:
        return res.status(400).json({ success: false, error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Update document status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update document status' });
  }
};

// Get document progress for a specific user
exports.getDocumentProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user role
    const [users] = await pool.query('SELECT FUNCTIONAL_ROLE FROM user WHERE USER_ID = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const userRole = users[0].FUNCTIONAL_ROLE;
    const isRegionalDirector = userRole === 'regional_director';
    const isDivisionManager = userRole === 'division_manager';
    const isAdmin = userRole === 'admin';
    const canSeeAllDocuments = isRegionalDirector || isDivisionManager || isAdmin;
    
    // Build WHERE clause based on role
    const whereClause = canSeeAllDocuments 
      ? 'WHERE 1=1' // Regional Director, Division Manager, and Admin see all documents
      : 'WHERE d.CREATED_BY = ?';
    
    const queryParams = canSeeAllDocuments ? [] : [userId, userId];
    
    const subqueryWhere = canSeeAllDocuments
      ? 'WHERE 1=1'
      : 'WHERE d2.CREATED_BY = ?';
    
    const [documents] = await pool.query(
      `SELECT 
        d.DOCUMENT_ID,
        d.TITLE,
        d.SECTION_ID,
        d.FINGERPRINT_HASH,
        s.NAME as SECTION_NAME,
        ds.STATUS as CURRENT_STATUS,
        ds.CREATED_AT as LAST_UPDATED,
        u.NAME as CREATED_BY_NAME
      FROM document d
      LEFT JOIN section s ON d.SECTION_ID = s.SECTION_ID
      LEFT JOIN user u ON d.CREATED_BY = u.USER_ID
      LEFT JOIN (
        SELECT DOCUMENT_ID, STATUS, CREATED_AT
        FROM document_status
        WHERE STATUS_ID IN (
          SELECT MAX(STATUS_ID)
          FROM document_status
          GROUP BY DOCUMENT_ID
        )
      ) ds ON d.DOCUMENT_ID = ds.DOCUMENT_ID
      ${whereClause}
        AND d.DOCUMENT_ID IN (
          SELECT MAX(d2.DOCUMENT_ID)
          FROM document d2
          ${subqueryWhere}
            AND d2.FINGERPRINT_HASH = d.FINGERPRINT_HASH
          GROUP BY d2.FINGERPRINT_HASH
        )
      ORDER BY ds.CREATED_AT DESC`,
      queryParams
    );

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Get document progress error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch document progress' });
  }
};

// Helper functions
async function notifySectionHeadsForReview(sectionId, documentId, documentTitle) {
  try {
    const [sectionHeads] = await pool.query(
      'SELECT USER_ID FROM user WHERE SECTION_ID = ? AND FUNCTIONAL_ROLE = "section_unit_head"',
      [sectionId]
    );

    for (const head of sectionHeads) {
      await createNotification({
        userId: head.USER_ID,
        type: 'document_submitted',
        title: 'New Document for Review',
        message: `A new document "${documentTitle}" has been submitted for review`,
        actionUrl: '/section-unit-head/review'
      });
    }
  } catch (error) {
    console.error('Notify section heads error:', error);
  }
}

async function notifyDocumentApproval(document, newStatus, remarks, approverId, approverRole) {
  try {
    // Notify document creator
    let message;
    switch (newStatus) {
      case 'Under_Division_Review':
        message = `Your document "${document.TITLE}" has been approved by Section Head and forwarded to Division Manager`;
        break;
      case 'Under_Regional_Review':
        message = `Your document "${document.TITLE}" has been approved by Division Manager and forwarded to Regional Director`;
        break;
      case 'Approved':
        message = `Your document "${document.TITLE}" has been fully approved and archived`;
        break;
    }

    if (remarks) {
      message += `. Remarks: ${remarks}`;
    }

    await createNotification({
      userId: document.CREATED_BY,
      type: 'document_approved',
      title: 'Document Approved',
      message: message,
      actionUrl: '/staff/work'
    });

    // Notify next approver if not final approval
    if (newStatus !== 'Approved') {
      const nextApprovers = await getNextApprovers(newStatus);
      for (const approver of nextApprovers) {
        await createNotification({
          userId: approver.USER_ID,
          type: 'document_requires_review',
          title: 'Document Requires Review',
          message: `Document "${document.TITLE}" requires your review`,
          actionUrl: getApproverReviewUrl(approver.FUNCTIONAL_ROLE)
        });
      }
    }
  } catch (error) {
    console.error('Notify document approval error:', error);
  }
}

async function notifyRegionalDirectors(document, remarks) {
  try {
    const [regionalDirectors] = await pool.query(
      'SELECT USER_ID FROM user WHERE FUNCTIONAL_ROLE = "regional_director"'
    );

    for (const director of regionalDirectors) {
      await createNotification({
        userId: director.USER_ID,
        type: 'document_forwarded',
        title: 'Document Forwarded for Review',
        message: `Document "${document.TITLE}" has been forwarded for final review`,
        actionUrl: `/regional-director/reports?documentId=${document.DOCUMENT_ID}`
      });
    }
  } catch (error) {
    console.error('Notify regional directors error:', error);
  }
}

async function getNextApprovers(status) {
  switch (status) {
    case 'Under_Division_Review':
      return await pool.query('SELECT USER_ID, FUNCTIONAL_ROLE FROM user WHERE FUNCTIONAL_ROLE = "division_manager"');
    case 'Under_Regional_Review':
      return await pool.query('SELECT USER_ID, FUNCTIONAL_ROLE FROM user WHERE FUNCTIONAL_ROLE = "regional_director"');
    default:
      return [];
  }
}

function getApproverReviewUrl(role) {
  switch (role) {
    case 'division_manager':
      return '/division-manager/review';
    case 'regional_director':
      return '/regional-director/review';
    default:
      return '/';
  }
}

async function createNotification({ userId, type, title, message, actionUrl }) {
  try {
    await pool.query(
      `INSERT INTO SYSTEM_NOTIFICATION (USER_ID, TYPE, TITLE, MESSAGE, ACTION_URL, IS_READ, CREATED_AT)
       VALUES (?, ?, ?, ?, ?, 0, NOW())`,
      [userId, type, title, message, actionUrl || null]
    );
  } catch (error) {
    console.error('Create notification error:', error);
  }
}

// Approve forwarded document (Regional Director only)
exports.approveForwardedDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { remarks } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole !== 'regional_director') {
      return res.status(403).json({ success: false, error: 'Only Regional Directors can approve forwarded documents' });
    }

    // Get document details and verify it's forwarded
    const [documents] = await pool.query('SELECT * FROM document WHERE DOCUMENT_ID = ? AND FORWARDED_TO_REGIONAL = 1', [documentId]);
    if (documents.length === 0) {
      return res.status(404).json({ success: false, error: 'Forwarded document not found' });
    }

    const document = documents[0];

    // Check if already approved
    const [existingApproval] = await pool.query(
      'SELECT * FROM document_approval WHERE DOCUMENT_ID = ? AND ROLE = "regional_director" AND STATUS = 1',
      [documentId]
    );

    if (existingApproval.length > 0) {
      return res.status(400).json({ success: false, error: 'Document has already been approved' });
    }

    // Update document status to Approved_Forwarded
    await pool.query(
      'INSERT INTO document_status (DOCUMENT_ID, STATUS, REMARKS, CREATED_AT) VALUES (?, "Approved_Forwarded", ?, NOW())',
      [documentId, remarks || 'Approved by Regional Director']
    );

    // Create approval record
    await pool.query(
      'INSERT INTO document_approval (DOCUMENT_ID, USER_ID, ROLE, STATUS, REMARKS, DATE_APPROVED) VALUES (?, ?, "regional_director", 1, ?, NOW())',
      [documentId, userId, remarks || 'Approved by Regional Director']
    );

    // Archive the document
    await pool.query(
      'INSERT INTO archive (DOCUMENT_ID, ARCHIVED_BY, DATE_ARCHIVED) VALUES (?, ?, NOW())',
      [documentId, userId]
    );

    // Send notifications
    await createNotification({
      userId: document.CREATED_BY,
      type: 'document_approved_forwarded',
      title: 'Forwarded Document Approved',
      message: `Your forwarded document "${document.TITLE}" has been approved by the Regional Director`,
      actionUrl: '/staff/work'
    });

    // Notify the forwarder (Division Manager)
    if (document.FORWARDED_BY) {
      await createNotification({
        userId: document.FORWARDED_BY,
        type: 'forwarded_document_approved',
        title: 'Forwarded Document Approved',
        message: `The document "${document.TITLE}" you forwarded has been approved by the Regional Director`,
        actionUrl: '/division-manager/reports'
      });
    }

    res.json({
      success: true,
      message: 'Forwarded document approved and archived successfully'
    });
  } catch (error) {
    console.error('Approve forwarded document error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve forwarded document' });
  }
};

// Get forwarded documents for Regional Directors
exports.getForwardedDocuments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole !== 'regional_director') {
      return res.status(403).json({ success: false, error: 'Only Regional Directors can access forwarded documents' });
    }

    const [forwardedDocuments] = await pool.query(`
      SELECT d.*, 
             dc.NAME as CATEGORY_NAME,
             s.NAME as SECTION_NAME,
             creator.NAME as CREATED_BY_NAME,
             creator.FUNCTIONAL_ROLE as CREATED_BY_ROLE,
             forwarder.NAME as FORWARDED_BY_NAME,
             forwarder.FUNCTIONAL_ROLE as FORWARDED_BY_ROLE,
             ds.STATUS as CURRENT_STATUS,
             ds.REMARKS as CURRENT_REMARKS,
             ds.CREATED_AT as STATUS_DATE,
             d.FORWARDED_AT,
             d.FORWARDED_BY,
             approval.DATE_APPROVED as APPROVAL_DATE,
             approval.REMARKS as APPROVAL_REMARKS
      FROM document d
      LEFT JOIN document_category dc ON d.CATEGORY_ID = dc.CATEGORY_ID
      LEFT JOIN section s ON d.SECTION_ID = s.SECTION_ID
      LEFT JOIN user creator ON d.CREATED_BY = creator.USER_ID
      LEFT JOIN user forwarder ON d.FORWARDED_BY = forwarder.USER_ID
      LEFT JOIN (
        SELECT DOCUMENT_ID, STATUS, REMARKS, CREATED_AT
        FROM document_status 
        WHERE STATUS_ID IN (
          SELECT MAX(STATUS_ID) 
          FROM document_status 
          GROUP BY DOCUMENT_ID
        )
      ) ds ON d.DOCUMENT_ID = ds.DOCUMENT_ID
      LEFT JOIN (
        SELECT DOCUMENT_ID, DATE_APPROVED, REMARKS
        FROM document_approval 
        WHERE STATUS = 1 AND ROLE = 'regional_director'
        AND DOCUMENT_ID IN (
          SELECT DOCUMENT_ID FROM document WHERE FORWARDED_TO_REGIONAL = 1
        )
      ) approval ON d.DOCUMENT_ID = approval.DOCUMENT_ID
      WHERE d.FORWARDED_TO_REGIONAL = 1
      ORDER BY d.FORWARDED_AT DESC
    `);

    res.json({
      success: true,
      data: forwardedDocuments
    });
  } catch (error) {
    console.error('Get forwarded documents error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch forwarded documents' });
  }
};

// Get documents by section (including forwarded documents for Division Managers)
exports.getDocumentsBySection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    let documents = [];
    
    // Get regular section documents (deduplicated by fingerprint hash)
    const [sectionDocuments] = await pool.query(`
      SELECT d.*, 
             dc.NAME as CATEGORY_NAME,
             s.NAME as SECTION_NAME,
             u.NAME as CREATED_BY_NAME,
             u.FUNCTIONAL_ROLE as CREATED_BY_ROLE,
             ds.STATUS as CURRENT_STATUS,
             ds.REMARKS as CURRENT_REMARKS,
             ds.CREATED_AT as STATUS_DATE,
             'regular' as DOCUMENT_TYPE
      FROM document d
      LEFT JOIN document_category dc ON d.CATEGORY_ID = dc.CATEGORY_ID
      LEFT JOIN section s ON d.SECTION_ID = s.SECTION_ID
      LEFT JOIN user u ON d.CREATED_BY = u.USER_ID
      LEFT JOIN (
        SELECT DOCUMENT_ID, STATUS, REMARKS, CREATED_AT
        FROM document_status 
        WHERE STATUS_ID IN (
          SELECT MAX(STATUS_ID) 
          FROM document_status 
          GROUP BY DOCUMENT_ID
        )
      ) ds ON d.DOCUMENT_ID = ds.DOCUMENT_ID
      WHERE d.SECTION_ID = ?
        AND d.DOCUMENT_ID IN (
          SELECT MAX(d2.DOCUMENT_ID)
          FROM document d2
          WHERE d2.SECTION_ID = ?
            AND d2.FINGERPRINT_HASH = d.FINGERPRINT_HASH
          GROUP BY d2.FINGERPRINT_HASH
        )
      ORDER BY d.CREATED_AT DESC
    `, [sectionId, sectionId]);
    
    documents = sectionDocuments;
    
    // If user is Division Manager, also get forwarded documents
    if (userRole === 'division_manager') {
      const [forwardedDocuments] = await pool.query(`
        SELECT d.*, 
               dc.NAME as CATEGORY_NAME,
               s.NAME as SECTION_NAME,
               u.NAME as CREATED_BY_NAME,
               u.FUNCTIONAL_ROLE as CREATED_BY_ROLE,
               ds.STATUS as CURRENT_STATUS,
               ds.REMARKS as CURRENT_REMARKS,
               ds.CREATED_AT as STATUS_DATE,
               'forwarded' as DOCUMENT_TYPE,
               da.USER_ID as FORWARDED_BY_USER_ID,
               fu.NAME as FORWARDED_BY_NAME,
               da.ROLE as FORWARDED_BY_ROLE,
               da.REMARKS as FORWARDED_REMARKS
        FROM document d
        LEFT JOIN document_category dc ON d.CATEGORY_ID = dc.CATEGORY_ID
        LEFT JOIN section s ON d.SECTION_ID = s.SECTION_ID
        LEFT JOIN user u ON d.CREATED_BY = u.USER_ID
        LEFT JOIN (
          SELECT DOCUMENT_ID, STATUS, REMARKS, CREATED_AT
          FROM document_status 
          WHERE STATUS_ID IN (
            SELECT MAX(STATUS_ID) 
            FROM document_status 
            GROUP BY DOCUMENT_ID
          )
        ) ds ON d.DOCUMENT_ID = ds.DOCUMENT_ID
        LEFT JOIN (
          SELECT DOCUMENT_ID, USER_ID, ROLE, REMARKS
          FROM document_approval 
          WHERE STATUS = 1 AND (REMARKS LIKE 'Forwarded by%' OR REMARKS LIKE '%forwarded%')
        ) da ON d.DOCUMENT_ID = da.DOCUMENT_ID
        LEFT JOIN user fu ON da.USER_ID = fu.USER_ID
        WHERE d.ASSIGNED_TO = -? 
          AND s.DIVISION_ID = (
            SELECT s2.DIVISION_ID 
            FROM section s2 
            JOIN user u2 ON s2.SECTION_ID = u2.SECTION_ID 
            WHERE u2.USER_ID = ? AND u2.FUNCTIONAL_ROLE = 'division_manager'
          )
          AND d.DOCUMENT_ID IN (
            SELECT MAX(d2.DOCUMENT_ID)
            FROM document d2
            LEFT JOIN section s2 ON d2.SECTION_ID = s2.SECTION_ID
            WHERE d2.ASSIGNED_TO = -?
              AND s2.DIVISION_ID = (
                SELECT s3.DIVISION_ID 
                FROM section s3 
                JOIN user u3 ON s3.SECTION_ID = u3.SECTION_ID 
                WHERE u3.USER_ID = ? AND u3.FUNCTIONAL_ROLE = 'division_manager'
              )
              AND d2.FINGERPRINT_HASH = d.FINGERPRINT_HASH
            GROUP BY d2.FINGERPRINT_HASH
          )
        ORDER BY d.CREATED_AT DESC
      `, [userId, userId, userId, userId]);
      
      documents = [...documents, ...forwardedDocuments];
      
      // Debug: Log forwarded documents to see what data we're getting
      console.log('Forwarded documents count:', forwardedDocuments.length);
      console.log('Forwarded documents data:', JSON.stringify(forwardedDocuments, null, 2));
      
      // Debug: Check approval records for forwarded documents
      if (forwardedDocuments.length > 0) {
        const docIds = forwardedDocuments.map(doc => doc.DOCUMENT_ID);
        const [approvalRecords] = await pool.query(
          'SELECT * FROM document_approval WHERE DOCUMENT_ID IN (?)',
          [docIds]
        );
        console.log('Approval records for forwarded documents:', JSON.stringify(approvalRecords, null, 2));
      }
      
      // Final deduplication: if both regular and forwarded documents exist with same fingerprint hash,
      // keep only the most recent one (highest DOCUMENT_ID)
      const deduplicatedDocuments = [];
      const fingerprintMap = new Map();
      
      documents.forEach(doc => {
        const existing = fingerprintMap.get(doc.FINGERPRINT_HASH);
        if (!existing) {
          fingerprintMap.set(doc.FINGERPRINT_HASH, doc);
        } else {
          // Prioritize forwarded documents over regular documents
          if (doc.DOCUMENT_TYPE === 'forwarded' && existing.DOCUMENT_TYPE !== 'forwarded') {
            fingerprintMap.set(doc.FINGERPRINT_HASH, doc);
          } else if (doc.DOCUMENT_TYPE === existing.DOCUMENT_TYPE && doc.DOCUMENT_ID > existing.DOCUMENT_ID) {
            fingerprintMap.set(doc.FINGERPRINT_HASH, doc);
          }
        }
      });
      
      documents = Array.from(fingerprintMap.values());
      
      // Debug: Log final documents after deduplication
      console.log('Final documents after deduplication:', documents.length);
      const finalForwarded = documents.filter(doc => doc.DOCUMENT_TYPE === 'forwarded');
      console.log('Final forwarded documents:', finalForwarded.length);
      console.log('Final forwarded documents data:', JSON.stringify(finalForwarded, null, 2));
    }

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Get documents by section error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// Download document
exports.downloadDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Get document details with creator information
    const [documents] = await pool.query(`
      SELECT d.*, u.NAME as CREATOR_NAME 
      FROM document d
      LEFT JOIN user u ON d.CREATED_BY = u.USER_ID
      WHERE d.DOCUMENT_ID = ?
    `, [documentId]);
    
    if (documents.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const document = documents[0];

    // Check if user has permission to view this document
    let hasPermission = false;
    
    if (userRole === 'admin') {
      hasPermission = true; // Admin can view all documents
    } else if (userRole === 'staff' && document.CREATED_BY === userId) {
      hasPermission = true; // Staff can view their own documents
    } else if (userRole === 'section_unit_head' || userRole === 'division_manager' || userRole === 'regional_director') {
      // Check if user's section has access to this document
      const [userSections] = await pool.query(
        'SELECT SECTION_ID FROM user WHERE USER_ID = ?', 
        [userId]
      );
      
      if (userSections.length > 0) {
        const userSectionId = userSections[0].SECTION_ID;
        
        // For division managers and regional directors, check division/region access
        if (userRole === 'division_manager') {
          const [divisionAccess] = await pool.query(`
            SELECT 1 FROM section s1
            JOIN section s2 ON s1.DIVISION_ID = s2.DIVISION_ID
            WHERE s1.SECTION_ID = ? AND s2.SECTION_ID = ?
          `, [userSectionId, document.SECTION_ID]);
          
          if (divisionAccess.length > 0) {
            hasPermission = true;
          }
        } else if (userRole === 'regional_director') {
          // Regional directors can view all documents
          hasPermission = true;
        } else {
          // Section unit heads can view documents from their section
          hasPermission = document.SECTION_ID === userSectionId;
        }
      }
    }

    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'You do not have permission to view this document' });
    }

    // Check if file exists
    const filePath = document.FILE_LINK;
    
    // If it's a URL (external link), return comprehensive metadata
    if (filePath && (filePath.startsWith('http://') || filePath.startsWith('https://'))) {
      const urlObj = new URL(filePath);
      
      // Get task information if this document is linked to a task
      let taskInfo = null;
      const [tasks] = await pool.query(
        `SELECT t.TASK_ID, t.TITLE, t.DUE_DATE, t.PRIORITY, t.STATUS, u.NAME as ASSIGNED_BY_NAME
         FROM TASK t
         LEFT JOIN user u ON t.ASSIGNED_BY = u.USER_ID
         WHERE t.LINKED_DOCUMENT_ID = ?`,
        [documentId]
      );
      if (tasks.length > 0) {
        taskInfo = tasks[0];
      }

      // Get creator information
      const createdBy = document.CREATOR_NAME || 'Unknown';

      res.setHeader('Content-Type', 'application/json');
      res.json({
        success: true,
        isUrl: true,
        url: filePath,
        filename: document.TITLE || 'document',
        contentType: 'url',
        metadata: {
          documentId: document.DOCUMENT_ID,
          title: document.TITLE,
          description: document.DESCRIPTION,
          submissionType: 'url',
          status: 'Submitted', // You might want to get this from document_status table
          createdBy: createdBy,
          createdAt: document.CREATED_AT,
          sha256Hash: document.FINGERPRINT_HASH,
          taskContext: taskInfo,
          urlInfo: {
            url: filePath,
            domain: urlObj.hostname,
            title: document.TITLE,
            description: document.DESCRIPTION
          }
        }
      });
      return;
    }
    
    // If it's a local file path, serve the file with metadata
    if (filePath && fs.existsSync(filePath)) {
      const fileName = path.basename(filePath);
      const fileExtension = path.extname(fileName).toLowerCase();
      const fileStats = fs.statSync(filePath);
      
      // Set appropriate content type based on file extension
      let contentType = 'application/octet-stream';
      switch (fileExtension) {
        case '.pdf':
          contentType = 'application/pdf';
          break;
        case '.doc':
          contentType = 'application/msword';
          break;
        case '.docx':
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case '.xls':
          contentType = 'application/vnd.ms-excel';
          break;
        case '.xlsx':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case '.ppt':
          contentType = 'application/vnd.ms-powerpoint';
          break;
        case '.pptx':
          contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          break;
        case '.txt':
          contentType = 'text/plain';
          break;
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.gif':
          contentType = 'image/gif';
          break;
      }

      // Get task information if this document is linked to a task
      let taskInfo = null;
      const [tasks] = await pool.query(
        `SELECT t.TASK_ID, t.TITLE, t.DUE_DATE, t.PRIORITY, t.STATUS, u.NAME as ASSIGNED_BY_NAME
         FROM TASK t
         LEFT JOIN user u ON t.ASSIGNED_BY = u.USER_ID
         WHERE t.LINKED_DOCUMENT_ID = ?`,
        [documentId]
      );
      if (tasks.length > 0) {
        taskInfo = tasks[0];
      }

      // Get creator information
      const createdBy = document.CREATOR_NAME || 'Unknown';

      const metadata = {
        documentId: document.DOCUMENT_ID,
        title: document.TITLE,
        description: document.DESCRIPTION,
        submissionType: 'file',
        status: 'Submitted',
        createdBy: createdBy,
        createdAt: document.CREATED_AT,
        sha256Hash: document.FINGERPRINT_HASH,
        taskContext: taskInfo,
        fileInfo: {
          name: fileName,
          size: fileStats.size,
          type: contentType,
          lastModified: fileStats.mtime.toISOString()
        }
      };
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      res.setHeader('X-Document-Metadata', JSON.stringify(metadata));
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } else {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ success: false, error: 'Failed to download document' });
  }
};
