const { verifyToken } = require('../utils/jwt');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Normalize token payload so downstream code can rely on expected fields
  req.user = {
    ...decoded,
    USER_ID: decoded.USER_ID ?? decoded.userId,
    FUNCTIONAL_ROLE: decoded.FUNCTIONAL_ROLE ?? decoded.role
  };
  next();
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.FUNCTIONAL_ROLE)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
