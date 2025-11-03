const jwt = require('jsonwebtoken');

// In production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'paduni_secret_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // 7 days

function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    userType: user.userType
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken,
  JWT_SECRET
};

