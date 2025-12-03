// MFA (Multi-Factor Authentication) utility
// Stores MFA codes in the database (usuarios_table.codigo_mfa and expiracao_mfa)

const { query } = require('./db');

function generateMFACode() {
  // In development, use a test code for easier testing
  // In production, generate random code
  if (process.env.NODE_ENV !== 'production' && process.env.USE_TEST_CODE === 'true') {
    return '123456'; // Test code for development
  }
  
  // Generate 6-digit code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create and store MFA code in database
async function createMFACode(userId, userEmail) {
  try {
    const code = generateMFACode();
    const expiresAt = new Date(Date.now() + 300000); // 5 minutes from now
    
    // Update user record with MFA code and expiration
    await query(`
      UPDATE usuarios_table 
      SET codigo_mfa = $1, expiracao_mfa = $2
      WHERE id = $3
    `, [code, expiresAt, parseInt(userId)]);
    
    return code;
  } catch (error) {
    console.error('Error creating MFA code:', error);
    throw error;
  }
}

// Verify MFA code from database
async function verifyMFACode(userId, code) {
  try {
    // Get user's MFA code and expiration from database
    const result = await query(`
      SELECT codigo_mfa, expiracao_mfa
      FROM usuarios_table
      WHERE id = $1
    `, [parseInt(userId)]);
    
    if (result.rows.length === 0) {
      return { valid: false, message: 'Usuário não encontrado' };
    }
    
    const user = result.rows[0];
    
    // Check if code exists
    if (!user.codigo_mfa) {
      return { valid: false, message: 'Código não encontrado ou expirado' };
    }
    
    // Check if code has expired
    const now = new Date();
    const expiresAt = new Date(user.expiracao_mfa);
    
    if (now > expiresAt) {
      // Clear expired code
      await invalidateMFACode(userId);
      return { valid: false, message: 'Código expirado' };
    }
    
    // Check if code matches
    if (user.codigo_mfa !== code) {
      return { valid: false, message: 'Código inválido' };
    }
    
    // Code is valid - it will be invalidated after use
    return { valid: true };
  } catch (error) {
    console.error('Error verifying MFA code:', error);
    return { valid: false, message: 'Erro ao verificar código' };
  }
}

// Invalidate MFA code (clear it from database)
async function invalidateMFACode(userId) {
  try {
    await query(`
      UPDATE usuarios_table 
      SET codigo_mfa = NULL, expiracao_mfa = NULL
      WHERE id = $1
    `, [parseInt(userId)]);
  } catch (error) {
    console.error('Error invalidating MFA code:', error);
    throw error;
  }
}

// Get MFA code for a user (for debugging/development)
async function getMFACode(userId) {
  try {
    const result = await query(`
      SELECT codigo_mfa, expiracao_mfa
      FROM usuarios_table
      WHERE id = $1
    `, [parseInt(userId)]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const user = result.rows[0];
    
    if (!user.codigo_mfa) {
      return null;
    }
    
    // Check if expired
    const now = new Date();
    const expiresAt = new Date(user.expiracao_mfa);
    
    if (now > expiresAt) {
      return null; // Expired
    }
    
    return {
      code: user.codigo_mfa,
      expiresAt: expiresAt,
      userId: parseInt(userId)
    };
  } catch (error) {
    console.error('Error getting MFA code:', error);
    return null;
  }
}

module.exports = {
  createMFACode,
  verifyMFACode,
  invalidateMFACode,
  getMFACode
};
