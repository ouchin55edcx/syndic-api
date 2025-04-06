const { admin } = require('../config/firebase-config');


const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No token provided'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    try {

      const [userId, userRole] = token.split(':');

      if (!userId) {
        throw new Error('Invalid token format');
      }

      req.userId = userId;
      req.userRole = userRole || 'user';

      console.log(`Authenticated user: ${req.userId} with role: ${req.userRole}`);

      next();
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid token'
      });
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

const isSyndic = (req, res, next) => {
  if (req.userRole !== 'syndic') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Syndic access required'
    });
  }

  next();
};

module.exports = {
  verifyToken,
  isSyndic
};
