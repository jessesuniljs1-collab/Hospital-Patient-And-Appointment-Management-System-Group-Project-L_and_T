const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret } = require('../config/env');

/**
 * JWT Authentication Middleware
 * Verifies the token from Authorization header and attaches user to req.user
 */
const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        errorCode: 'AUTH_TOKEN_MISSING'
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, jwtSecret);
      const user = await User.findById(decoded.userId).select('-passwordHash');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token is valid but user no longer exists.',
          errorCode: 'AUTH_USER_NOT_FOUND'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account has been deactivated.',
          errorCode: 'AUTH_ACCOUNT_INACTIVE'
        });
      }

      req.user = user;
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.',
          errorCode: 'AUTH_TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
        errorCode: 'AUTH_TOKEN_INVALID'
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { authenticateJWT };
