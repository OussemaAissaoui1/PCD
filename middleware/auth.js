const jwt = require('jsonwebtoken');

// JWT secret key - should match the one in user.js
const JWT_SECRET = process.env.JWT_SECRET || 'PCD_JWT_SECRET_KEY_2024';

// Authentication middleware
const auth = (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user data to request object
    req.user = decoded;
    
    // Continue with the request
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please login again.' });
    }
    
    return res.status(403).json({ message: 'Invalid token.' });
  }
};

module.exports = auth;