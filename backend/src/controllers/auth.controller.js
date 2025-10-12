const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { generateToken } = require('../utils/jwt');

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user from database
    const [users] = await pool.query(
      'SELECT * FROM user WHERE EMAIL = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password using bcrypt
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.PASSWORD);
    
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if account is active
    if (user.STATUS !== 'active') {
      return res.status(401).json({ success: false, error: 'Account is not active. Please contact administrator.' });
    }

    // Generate JWT token
    const token = generateToken(user.USER_ID, user.EMAIL, user.FUNCTIONAL_ROLE);

    // Return user data
    res.json({
      success: true,
      token,
      user: {
        USER_ID: user.USER_ID,
        NAME: user.NAME,
        EMAIL: user.EMAIL,
        FUNCTIONAL_ROLE: user.FUNCTIONAL_ROLE,
        ORGANIZATIONAL_ROLE: user.ORGANIZATIONAL_ROLE,
        SECTION_ID: user.SECTION_ID,
        STATUS: user.STATUS
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
};

// Register (creates pending registration)
exports.register = async (req, res) => {
  try {
    const { name, idNumber, email, password, organizationalAssignment } = req.body;

    console.log('Registration request:', { name, idNumber, email, organizationalAssignment });

    // Validate required fields
    if (!name || !idNumber || !email || !password || !organizationalAssignment) {
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required: name, idNumber, email, password, organizationalAssignment' 
      });
    }

    // Check if email already exists
    const [existing] = await pool.query(
      'SELECT EMAIL FROM user WHERE EMAIL = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    // Determine section ID from organizational assignment
    const sectionId = determineSectionId(organizationalAssignment);
    console.log(`Determined section ID ${sectionId} for organizational assignment: ${organizationalAssignment}`);

    // Determine functional role from organizational assignment
    const functionalRole = determineFunctionalRole(organizationalAssignment);
    console.log(`Determined functional role ${functionalRole} for organizational assignment: ${organizationalAssignment}`);

    // Hash the password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // For now, insert directly into user table with determined role as pending
    // In production, would use pending_user_registration table
    const [result] = await pool.query(
      'INSERT INTO user (NAME, ID_NUMBER, EMAIL, PASSWORD, SECTION_ID, FUNCTIONAL_ROLE, ORGANIZATIONAL_ROLE, STATUS) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, idNumber, email, hashedPassword, sectionId, functionalRole, organizationalAssignment, 'pending']
    );

    console.log('User created successfully with ID:', result.insertId);

    res.json({
      success: true,
      message: 'Registration submitted successfully. Awaiting admin approval.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ 
      success: false, 
      error: 'Registration failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Test endpoint
exports.test = async (req, res) => {
  res.json({ success: true, message: 'Auth controller is working', body: req.body });
};

// Helper function to map organizational assignment to section ID
function determineFunctionalRole(orgAssignment) {
  // Regional Director assignment
  if (orgAssignment === 'Regional Office') {
    return 'regional_director';
  }
  
  // Division assignments = Division Manager
  if (orgAssignment === 'Engineering and Operations' || 
      orgAssignment === 'Administrative and Finance') {
    return 'division_manager';
  }
  
  // Section assignments = Section/Unit Head
  const sections = [
    'Engineering',
    'Operations Section',
    'Institutional Development',
    'Finance',
    'Administrative'
  ];
  
  if (sections.includes(orgAssignment)) {
    return 'section_unit_head';
  }
  
  // All other assignments (Units) = Staff
  // This includes: Planning, Design, Construction, BAC, Operations Unit, Equipment,
  // Cashiering, Budget, Accounting, Human Resource, Property, IT, Legal, PAIS
  return 'staff';
}

function determineSectionId(orgAssignment) {
  const mapping = {
    // Regional Office
    'Regional Office': 1,  // Default to Engineering section for regional director
    
    // Sections (exact matches)
    'Engineering': 1,
    'Operations Section': 2,
    'Institutional Development': 3,
    'Finance': 4,
    'Administrative': 5,
    
    // Units - Engineering Section (Section ID: 1)
    'Planning': 1,
    'Design': 1,
    'Construction': 1,
    'BAC': 1,             // ← Changed from 2 to 1
    
    // Units - Operations Section (Section ID: 2)
    'Operations Unit': 2,
    'Equipment': 2,
    
    // Units - Institutional Development Section (Section ID: 3)
    'Institutional Unit': 3,
    
    // Units - Finance Section (Section ID: 4)
    'Cashiering': 4,      // ← Changed from 3 to 4
    'Budget': 4,          // ← Changed from 3 to 4
    'Accounting': 4,      // ← Changed from 3 to 4
    
    // Units - Administrative Section (Section ID: 5)
    'Human Resource': 5,  // ← Changed from 4 to 5
    'Property': 5,
    
    // Standalone units (section ID 6)
    'IT': 6,              // ← Changed from 5 to 6 (standalone section)
    'PAIS': 6,            // ← Changed from 5 to 6 (standalone section)
    'Legal': 6,           // ← Changed from 5 to 6 (standalone section)
    
    // Divisions (default to first section of that division)
    'Engineering and Operations': 1,    // First section in division 1
    'Administrative and Finance': 4     // ← Changed from 3 to 4 (Finance section)
  };
  
  const sectionId = mapping[orgAssignment];
  console.log(`Mapping "${orgAssignment}" to section ID: ${sectionId}`);
  return sectionId || 1; // Default to Engineering section if not found
}

// Admin management endpoints
exports.getPendingRegistrations = async (req, res) => {
  try {
    // Get all users with pending status
    const [users] = await pool.query(
      'SELECT * FROM user WHERE STATUS = ?',
      ['pending']
    );

    const pendingRegistrations = users.map(user => ({
      id: user.USER_ID,
      name: user.NAME,
      idNumber: user.ID_NUMBER,
      email: user.EMAIL,
      functionalRole: user.FUNCTIONAL_ROLE,
      organizationalAssignment: user.ORGANIZATIONAL_ROLE,
      sectionId: user.SECTION_ID,
      requestedAt: user.CREATED_AT,
      status: user.STATUS
    }));

    res.json({
      success: true,
      data: pendingRegistrations
    });
  } catch (error) {
    console.error('Error fetching pending registrations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch pending registrations' 
    });
  }
};

exports.approveRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user.userId; // From JWT token

    // Update user status to active
    const [result] = await pool.query(
      'UPDATE user SET STATUS = ?, APPROVED_BY = ?, APPROVED_AT = NOW() WHERE USER_ID = ? AND STATUS = ?',
      ['active', adminUserId, id, 'pending']
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Registration not found or already processed' 
      });
    }

    res.json({
      success: true,
      message: 'Registration approved successfully'
    });
  } catch (error) {
    console.error('Error approving registration:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to approve registration' 
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    // Get all active users with their section information
    const [users] = await pool.query(`
      SELECT u.USER_ID, u.NAME, u.ID_NUMBER, u.EMAIL, u.FUNCTIONAL_ROLE, 
             u.ORGANIZATIONAL_ROLE, u.STATUS, u.CREATED_AT,
             s.NAME as SECTION_NAME
      FROM user u
      LEFT JOIN section s ON u.SECTION_ID = s.SECTION_ID
      WHERE u.STATUS = 'active'
      ORDER BY u.NAME ASC
    `);

    const usersData = users.map(user => ({
      id: user.USER_ID,
      name: user.NAME,
      idNumber: user.ID_NUMBER,
      email: user.EMAIL,
      functionalRole: user.FUNCTIONAL_ROLE,
      organizationalAssignment: user.ORGANIZATIONAL_ROLE,
      sectionName: user.SECTION_NAME,
      status: user.STATUS,
      createdAt: user.CREATED_AT
    }));

    res.json({
      success: true,
      data: usersData
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch users' 
    });
  }
};

exports.rejectRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUserId = req.user.userId; // From JWT token

    // Update user status to rejected (or delete the record)
    // For now, we'll update status to 'inactive' and store rejection reason
    const [result] = await pool.query(
      'UPDATE user SET STATUS = ?, APPROVED_BY = ?, APPROVED_AT = NOW() WHERE USER_ID = ? AND STATUS = ?',
      ['inactive', adminUserId, id, 'pending']
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Registration not found or already processed' 
      });
    }

    res.json({
      success: true,
      message: 'Registration rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting registration:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reject registration' 
    });
  }
};
