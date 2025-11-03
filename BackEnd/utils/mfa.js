// MFA (Multi-Factor Authentication) utility
// Stores MFA codes temporarily in memory
// In production, use Redis or similar for distributed systems

const mfaCodes = new Map();

// Clean up expired codes periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of mfaCodes.entries()) {
    if (now > data.expiresAt) {
      mfaCodes.delete(key);
    }
  }
}, 60000); // Clean up every minute

function generateMFACode() {
  // In development, use a test code for easier testing
  // In production, generate random code
  if (process.env.NODE_ENV !== 'production' && process.env.USE_TEST_CODE === 'true') {
    return '123456'; // Test code for development
  }
  
  // Generate 6-digit code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function createMFACode(userId, userEmail) {
  const code = generateMFACode();
  const expiresAt = Date.now() + 300000; // 5 minutes in milliseconds
  
  const codeData = {
    code,
    userId,
    userEmail,
    expiresAt,
    used: false
  };

  // Store code with userId as key
  mfaCodes.set(userId, codeData);

  return code;
}

function verifyMFACode(userId, code) {
  const codeData = mfaCodes.get(userId);
  
  if (!codeData) {
    return { valid: false, message: 'Código não encontrado ou expirado' };
  }

  if (codeData.used) {
    return { valid: false, message: 'Código já foi utilizado' };
  }

  if (Date.now() > codeData.expiresAt) {
    mfaCodes.delete(userId);
    return { valid: false, message: 'Código expirado' };
  }

  if (codeData.code !== code) {
    return { valid: false, message: 'Código inválido' };
  }

  // Mark as used
  codeData.used = true;
  
  return { valid: true };
}

function invalidateMFACode(userId) {
  mfaCodes.delete(userId);
}

function getMFACode(userId) {
  return mfaCodes.get(userId);
}

module.exports = {
  createMFACode,
  verifyMFACode,
  invalidateMFACode,
  getMFACode
};

