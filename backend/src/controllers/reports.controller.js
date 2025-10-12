const { pool } = require('../config/database');

// Get section performance report
exports.getSectionReport = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = '';
    const params = [sectionId];

    if (startDate && endDate) {
      dateFilter = ' AND dr.CREATED_AT BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // Get section info
    const [sectionInfo] = await pool.query(
      'SELECT * FROM section WHERE SECTION_ID = ?',
      [sectionId]
    );

    if (sectionInfo.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Section not found'
      });
    }

    // Get task statistics
    const [taskStats] = await pool.query(
      `SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN STATUS = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN STATUS != 'completed' AND DUE_DATE < CURDATE() THEN 1 ELSE 0 END) as overdue_tasks,
        SUM(CASE WHEN STATUS = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
        SUM(CASE WHEN STATUS = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks
      FROM document_requirement dr
      JOIN user u ON dr.ASSIGNED_TO = u.USER_ID
      WHERE u.SECTION_ID = ?${dateFilter}`,
      params
    );

    // Get staff performance
    const [staffPerformance] = await pool.query(
      `SELECT 
        u.USER_ID,
        u.NAME,
        u.FUNCTIONAL_ROLE,
        COUNT(dr.REQUIREMENT_ID) as tasks_assigned,
        SUM(CASE WHEN dr.STATUS = 'completed' THEN 1 ELSE 0 END) as tasks_completed,
        SUM(CASE WHEN dr.STATUS != 'completed' AND dr.DUE_DATE < CURDATE() THEN 1 ELSE 0 END) as tasks_overdue,
        CASE 
          WHEN COUNT(dr.REQUIREMENT_ID) > 0 
          THEN ROUND((SUM(CASE WHEN dr.STATUS = 'completed' THEN 1 ELSE 0 END) / COUNT(dr.REQUIREMENT_ID)) * 100, 2)
          ELSE 0 
        END as completion_rate
      FROM user u
      LEFT JOIN document_requirement dr ON u.USER_ID = dr.ASSIGNED_TO${dateFilter.replace('dr.', '')}
      WHERE u.SECTION_ID = ?
      GROUP BY u.USER_ID, u.NAME, u.FUNCTIONAL_ROLE
      ORDER BY completion_rate DESC`,
      [sectionId, ...(startDate && endDate ? [startDate, endDate] : [])]
    );

    // Get document statistics
    const [documentStats] = await pool.query(
      `SELECT 
        COUNT(*) as total_documents,
        SUM(CASE WHEN ds.STATUS = 'Approved' THEN 1 ELSE 0 END) as approved_documents,
        SUM(CASE WHEN ds.STATUS = 'Rejected' THEN 1 ELSE 0 END) as rejected_documents,
        SUM(CASE WHEN ds.STATUS IN ('Submitted', 'Under_Division_Review', 'Under_Regional_Review') THEN 1 ELSE 0 END) as pending_documents,
        SUM(CASE WHEN ds.STATUS = 'Revision_Required' THEN 1 ELSE 0 END) as revision_required_documents
      FROM document d
      LEFT JOIN (
        SELECT DOCUMENT_ID, STATUS 
        FROM document_status 
        WHERE STATUS_ID IN (
          SELECT MAX(STATUS_ID) 
          FROM document_status 
          GROUP BY DOCUMENT_ID
        )
      ) ds ON d.DOCUMENT_ID = ds.DOCUMENT_ID
      WHERE d.SECTION_ID = ?${dateFilter.replace('dr.', 'd.')}`,
      params
    );

    res.json({
      success: true,
      data: {
        section: sectionInfo[0],
        taskStats: taskStats[0],
        staffPerformance,
        documentStats: documentStats[0],
        reportPeriod: {
          startDate: startDate || null,
          endDate: endDate || null
        }
      }
    });
  } catch (error) {
    console.error('Get section report error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch section report' });
  }
};

// Get division performance report
exports.getDivisionReport = async (req, res) => {
  try {
    const { divisionId } = req.params;
    const { startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = '';
    const params = [divisionId];

    if (startDate && endDate) {
      dateFilter = ' AND dr.CREATED_AT BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // Get division info
    const [divisionInfo] = await pool.query(
      'SELECT * FROM division WHERE DIVISION_ID = ?',
      [divisionId]
    );

    if (divisionInfo.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Division not found'
      });
    }

    // Get division-wide task statistics
    const [taskStats] = await pool.query(
      `SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN STATUS = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN STATUS != 'completed' AND DUE_DATE < CURDATE() THEN 1 ELSE 0 END) as overdue_tasks,
        SUM(CASE WHEN STATUS = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
        SUM(CASE WHEN STATUS = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks
      FROM document_requirement dr
      JOIN user u ON dr.ASSIGNED_TO = u.USER_ID
      JOIN section s ON u.SECTION_ID = s.SECTION_ID
      WHERE s.DIVISION_ID = ?${dateFilter}`,
      params
    );

    // Get section performance within division
    const [sectionPerformance] = await pool.query(
      `SELECT 
        s.SECTION_ID,
        s.NAME as SECTION_NAME,
        COUNT(dr.REQUIREMENT_ID) as total_tasks,
        SUM(CASE WHEN dr.STATUS = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN dr.STATUS != 'completed' AND dr.DUE_DATE < CURDATE() THEN 1 ELSE 0 END) as overdue_tasks,
        CASE 
          WHEN COUNT(dr.REQUIREMENT_ID) > 0 
          THEN ROUND((SUM(CASE WHEN dr.STATUS = 'completed' THEN 1 ELSE 0 END) / COUNT(dr.REQUIREMENT_ID)) * 100, 2)
          ELSE 0 
        END as completion_rate
      FROM section s
      LEFT JOIN user u ON s.SECTION_ID = u.SECTION_ID
      LEFT JOIN document_requirement dr ON u.USER_ID = dr.ASSIGNED_TO${dateFilter}
      WHERE s.DIVISION_ID = ?
      GROUP BY s.SECTION_ID, s.NAME
      ORDER BY completion_rate DESC`,
      [divisionId, ...(startDate && endDate ? [startDate, endDate] : [])]
    );

    // Get document statistics for division
    const [documentStats] = await pool.query(
      `SELECT 
        COUNT(*) as total_documents,
        SUM(CASE WHEN ds.STATUS = 'Approved' THEN 1 ELSE 0 END) as approved_documents,
        SUM(CASE WHEN ds.STATUS = 'Rejected' THEN 1 ELSE 0 END) as rejected_documents,
        SUM(CASE WHEN ds.STATUS IN ('Submitted', 'Under_Division_Review', 'Under_Regional_Review') THEN 1 ELSE 0 END) as pending_documents,
        SUM(CASE WHEN ds.STATUS = 'Revision_Required' THEN 1 ELSE 0 END) as revision_required_documents
      FROM document d
      JOIN section s ON d.SECTION_ID = s.SECTION_ID
      LEFT JOIN (
        SELECT DOCUMENT_ID, STATUS 
        FROM document_status 
        WHERE STATUS_ID IN (
          SELECT MAX(STATUS_ID) 
          FROM document_status 
          GROUP BY DOCUMENT_ID
        )
      ) ds ON d.DOCUMENT_ID = ds.DOCUMENT_ID
      WHERE s.DIVISION_ID = ?${dateFilter.replace('dr.', 'd.')}`,
      params
    );

    res.json({
      success: true,
      data: {
        division: divisionInfo[0],
        taskStats: taskStats[0],
        sectionPerformance,
        documentStats: documentStats[0],
        reportPeriod: {
          startDate: startDate || null,
          endDate: endDate || null
        }
      }
    });
  } catch (error) {
    console.error('Get division report error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch division report' });
  }
};

// Get system overview report
exports.getSystemOverview = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = ' AND dr.CREATED_AT BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // Get system-wide task statistics
    const [taskStats] = await pool.query(
      `SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN STATUS = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN STATUS != 'completed' AND DUE_DATE < CURDATE() THEN 1 ELSE 0 END) as overdue_tasks,
        SUM(CASE WHEN STATUS = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
        SUM(CASE WHEN STATUS = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND((SUM(CASE WHEN STATUS = 'completed' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2)
          ELSE 0 
        END as overall_completion_rate
      FROM document_requirement dr
      WHERE 1=1${dateFilter}`,
      params
    );

    // Get division performance summary
    const [divisionSummary] = await pool.query(
      `SELECT 
        d.DIVISION_ID,
        d.NAME as DIVISION_NAME,
        COUNT(dr.REQUIREMENT_ID) as total_tasks,
        SUM(CASE WHEN dr.STATUS = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN dr.STATUS != 'completed' AND dr.DUE_DATE < CURDATE() THEN 1 ELSE 0 END) as overdue_tasks,
        CASE 
          WHEN COUNT(dr.REQUIREMENT_ID) > 0 
          THEN ROUND((SUM(CASE WHEN dr.STATUS = 'completed' THEN 1 ELSE 0 END) / COUNT(dr.REQUIREMENT_ID)) * 100, 2)
          ELSE 0 
        END as completion_rate
      FROM division d
      LEFT JOIN section s ON d.DIVISION_ID = s.DIVISION_ID
      LEFT JOIN user u ON s.SECTION_ID = u.SECTION_ID
      LEFT JOIN document_requirement dr ON u.USER_ID = dr.ASSIGNED_TO${dateFilter}
      GROUP BY d.DIVISION_ID, d.NAME
      ORDER BY completion_rate DESC`,
      [divisionId, ...(startDate && endDate ? [startDate, endDate] : [])]
    );

    // Get document statistics
    const [documentStats] = await pool.query(
      `SELECT 
        COUNT(*) as total_documents,
        SUM(CASE WHEN ds.STATUS = 'Approved' THEN 1 ELSE 0 END) as approved_documents,
        SUM(CASE WHEN ds.STATUS = 'Rejected' THEN 1 ELSE 0 END) as rejected_documents,
        SUM(CASE WHEN ds.STATUS IN ('Submitted', 'Under_Division_Review', 'Under_Regional_Review') THEN 1 ELSE 0 END) as pending_documents,
        SUM(CASE WHEN ds.STATUS = 'Revision_Required' THEN 1 ELSE 0 END) as revision_required_documents,
        CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND((SUM(CASE WHEN ds.STATUS = 'Approved' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2)
          ELSE 0 
        END as approval_rate
      FROM document d
      LEFT JOIN (
        SELECT DOCUMENT_ID, STATUS 
        FROM document_status 
        WHERE STATUS_ID IN (
          SELECT MAX(STATUS_ID) 
          FROM document_status 
          GROUP BY DOCUMENT_ID
        )
      ) ds ON d.DOCUMENT_ID = ds.DOCUMENT_ID
      WHERE 1=1${dateFilter.replace('dr.', 'd.')}`,
      params
    );

    // Get user statistics
    const [userStats] = await pool.query(
      `SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN FUNCTIONAL_ROLE = 'staff' THEN 1 ELSE 0 END) as staff_count,
        SUM(CASE WHEN FUNCTIONAL_ROLE = 'section_unit_head' THEN 1 ELSE 0 END) as section_heads_count,
        SUM(CASE WHEN FUNCTIONAL_ROLE = 'division_manager' THEN 1 ELSE 0 END) as division_managers_count,
        SUM(CASE WHEN FUNCTIONAL_ROLE = 'regional_director' THEN 1 ELSE 0 END) as regional_directors_count,
        SUM(CASE WHEN STATUS = 'active' THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN STATUS = 'pending' THEN 1 ELSE 0 END) as pending_users
      FROM user`
    );

    res.json({
      success: true,
      data: {
        taskStats: taskStats[0],
        divisionSummary,
        documentStats: documentStats[0],
        userStats: userStats[0],
        reportPeriod: {
          startDate: startDate || null,
          endDate: endDate || null
        }
      }
    });
  } catch (error) {
    console.error('Get system overview error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch system overview' });
  }
};

// Get individual staff performance report
exports.getStaffReport = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = '';
    const params = [userId];

    if (startDate && endDate) {
      dateFilter = ' AND dr.CREATED_AT BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // Get staff info
    const [staffInfo] = await pool.query(
      `SELECT 
        u.*,
        s.NAME as SECTION_NAME,
        d.NAME as DIVISION_NAME
      FROM user u
      LEFT JOIN section s ON u.SECTION_ID = s.SECTION_ID
      LEFT JOIN division d ON s.DIVISION_ID = d.DIVISION_ID
      WHERE u.USER_ID = ?`,
      [userId]
    );

    if (staffInfo.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    // Get task performance
    const [taskPerformance] = await pool.query(
      `SELECT 
        COUNT(*) as total_tasks_assigned,
        SUM(CASE WHEN STATUS = 'completed' THEN 1 ELSE 0 END) as tasks_completed,
        SUM(CASE WHEN STATUS != 'completed' AND DUE_DATE < CURDATE() THEN 1 ELSE 0 END) as tasks_overdue,
        SUM(CASE WHEN STATUS = 'pending' THEN 1 ELSE 0 END) as tasks_pending,
        SUM(CASE WHEN STATUS = 'in_progress' THEN 1 ELSE 0 END) as tasks_in_progress,
        CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND((SUM(CASE WHEN STATUS = 'completed' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2)
          ELSE 0 
        END as completion_rate,
        AVG(CASE WHEN STATUS = 'completed' AND COMPLETED_AT IS NOT NULL 
          THEN DATEDIFF(COMPLETED_AT, CREATED_AT) 
          ELSE NULL 
        END) as avg_completion_time_days
      FROM document_requirement dr
      WHERE dr.ASSIGNED_TO = ?${dateFilter}`,
      params
    );

    // Get document performance
    const [documentPerformance] = await pool.query(
      `SELECT 
        COUNT(*) as total_documents_uploaded,
        SUM(CASE WHEN ds.STATUS = 'Approved' THEN 1 ELSE 0 END) as documents_approved,
        SUM(CASE WHEN ds.STATUS = 'Rejected' THEN 1 ELSE 0 END) as documents_rejected,
        SUM(CASE WHEN ds.STATUS IN ('Submitted', 'Under_Division_Review', 'Under_Regional_Review') THEN 1 ELSE 0 END) as documents_pending,
        SUM(CASE WHEN ds.STATUS = 'Revision_Required' THEN 1 ELSE 0 END) as documents_revision_required,
        CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND((SUM(CASE WHEN ds.STATUS = 'Approved' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2)
          ELSE 0 
        END as document_approval_rate
      FROM document d
      LEFT JOIN (
        SELECT DOCUMENT_ID, STATUS 
        FROM document_status 
        WHERE STATUS_ID IN (
          SELECT MAX(STATUS_ID) 
          FROM document_status 
          GROUP BY DOCUMENT_ID
        )
      ) ds ON d.DOCUMENT_ID = ds.DOCUMENT_ID
      WHERE d.CREATED_BY = ?${dateFilter.replace('dr.', 'd.')}`,
      params
    );

    // Get recent activity
    const [recentActivity] = await pool.query(
      `(SELECT 'task_completed' as activity_type, TITLE as title, COMPLETED_AT as activity_date
       FROM document_requirement 
       WHERE ASSIGNED_TO = ? AND STATUS = 'completed' AND COMPLETED_AT IS NOT NULL)
       UNION ALL
       (SELECT 'document_uploaded' as activity_type, TITLE as title, CREATED_AT as activity_date
        FROM document 
        WHERE CREATED_BY = ?)
       ORDER BY activity_date DESC
       LIMIT 10`,
      [userId, userId]
    );

    // Get feedback received
    const [feedbackReceived] = await pool.query(
      `SELECT 
        f.TYPE,
        f.CONTENT,
        f.CREATED_AT,
        author.NAME as AUTHOR_NAME
      FROM feedback f
      LEFT JOIN user author ON f.AUTHOR_ID = author.USER_ID
      WHERE f.RECIPIENT_ID = ?
      ORDER BY f.CREATED_AT DESC
      LIMIT 5`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        staff: staffInfo[0],
        taskPerformance: taskPerformance[0],
        documentPerformance: documentPerformance[0],
        recentActivity,
        feedbackReceived,
        reportPeriod: {
          startDate: startDate || null,
          endDate: endDate || null
        }
      }
    });
  } catch (error) {
    console.error('Get staff report error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch staff report' });
  }
};

