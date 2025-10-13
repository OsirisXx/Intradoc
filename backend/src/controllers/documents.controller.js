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
      query += ' WHERE d.CREATED_BY = ?';
    } else if (userRole === 'admin') {
      // Admin sees all
    } else {
      // Section heads, managers see their section's documents
      query += ` WHERE d.SECTION_ID IN (
        SELECT SECTION_ID FROM user WHERE USER_ID = ?
      )`;
    }

    const [documents] = await pool.query(query, [userId]);
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
      // Update the task's LINKED_DOCUMENT_ID to create bidirectional link
      await pool.query(
        'UPDATE TASK SET LINKED_DOCUMENT_ID = ?, STATUS = "in_progress", UPDATED_AT = NOW() WHERE TASK_ID = ?',
        [result.insertId, fulfillsTaskId]
      );
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
    const userId = req.user.userId;
    const userRole = req.user.role;

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
        actionUrl: '/regional-director/review'
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

// Get documents by section
exports.getDocumentsBySection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    
    const [documents] = await pool.query(`
      SELECT d.*, 
             dc.NAME as CATEGORY_NAME,
             s.NAME as SECTION_NAME,
             u.NAME as CREATED_BY_NAME,
             u.FUNCTIONAL_ROLE as CREATED_BY_ROLE,
             ds.STATUS as CURRENT_STATUS,
             ds.REMARKS as CURRENT_REMARKS,
             ds.CREATED_AT as STATUS_DATE
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
      ORDER BY d.CREATED_AT DESC
    `, [sectionId]);

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

    // Get document details
    const [documents] = await pool.query('SELECT * FROM document WHERE DOCUMENT_ID = ?', [documentId]);
    
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
    
    // If it's a URL (external link), redirect to it
    if (filePath && (filePath.startsWith('http://') || filePath.startsWith('https://'))) {
      return res.redirect(filePath);
    }
    
    // If it's a local file path, serve the file
    if (filePath && fs.existsSync(filePath)) {
      const fileName = path.basename(filePath);
      const fileExtension = path.extname(fileName).toLowerCase();
      
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
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      
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
