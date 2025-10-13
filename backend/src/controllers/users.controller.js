const { pool } = require('../config/database');

// Get users by section ID
exports.getUsersBySection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { functionalRole } = req.query;

    let query = `
      SELECT 
        USER_ID,
        NAME,
        EMAIL,
        FUNCTIONAL_ROLE,
        ORGANIZATIONAL_ROLE,
        SECTION_ID,
        STATUS
      FROM user 
      WHERE SECTION_ID = ? AND STATUS = 'active'
    `;

    const params = [sectionId];

    // Filter by functional role if specified (e.g., only staff members)
    if (functionalRole) {
      query += ' AND FUNCTIONAL_ROLE = ?';
      params.push(functionalRole);
    }

    query += ' ORDER BY NAME ASC';

    const [users] = await pool.query(query, params);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users by section error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { functionalRole, sectionId } = req.query;

    let query = `
      SELECT 
        USER_ID,
        NAME,
        EMAIL,
        FUNCTIONAL_ROLE,
        ORGANIZATIONAL_ROLE,
        SECTION_ID,
        STATUS
      FROM user 
      WHERE STATUS = 'active'
    `;

    const params = [];

    // Filter by functional role if specified
    if (functionalRole) {
      query += ' AND FUNCTIONAL_ROLE = ?';
      params.push(functionalRole);
    }

    // Filter by section if specified
    if (sectionId) {
      query += ' AND SECTION_ID = ?';
      params.push(sectionId);
    }

    query += ' ORDER BY FUNCTIONAL_ROLE, SECTION_ID, NAME ASC';

    const [users] = await pool.query(query, params);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};




