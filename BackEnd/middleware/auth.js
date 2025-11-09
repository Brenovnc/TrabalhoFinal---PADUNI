const { verifyToken } = require('../utils/jwt');
const { isTokenBlacklisted } = require('../utils/tokenBlacklist');

// Middleware to authenticate JWT tokens
function authenticateToken(req, res, next) {
  // Get token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acesso não fornecido'
    });
  }

  // Check if token is blacklisted
  if (isTokenBlacklisted(token)) {
    return res.status(403).json({
      success: false,
      message: 'Token inválido (sessão encerrada)'
    });
  }

  // Verify token
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(403).json({
      success: false,
      message: 'Token inválido ou expirado'
    });
  }

  // Attach user info to request
  req.user = decoded;
  next();
}

module.exports = {
  authenticateToken
};

