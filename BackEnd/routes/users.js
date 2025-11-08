const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { addUser, findUserByEmail, findUserById, updateUser, deleteUser } = require('../utils/fileStorage');
const { validateUserData, isValidEmail, isStrongPassword } = require('../utils/validators');
const { validateEditableProfileData } = require('../utils/profileValidators');
const { generateToken } = require('../utils/jwt');
const { checkRateLimit, recordFailedAttempt, clearAttempts } = require('../utils/rateLimiter');
const { authenticateToken } = require('../middleware/auth');
const { createMFACode, verifyMFACode, invalidateMFACode } = require('../utils/mfa');
const { sendMFACode, sendAccountDeletionCode } = require('../utils/emailService');
const { blacklistToken } = require('../utils/tokenBlacklist');
const { addLogEntry } = require('../utils/criticalActionsLog');

// POST /api/users/register - Cadastrar novo usuário
router.post('/register', async (req, res) => {
  try {
    const userData = req.body;

    // Validate user data
    const validation = validateUserData(userData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    // Check if email already exists
    const existingUser = await findUserByEmail(userData.email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        errors: ['Este email já está em uso']
      });
    }

    // Determine user type based on year of entry
    const currentYear = new Date().getFullYear();
    const isVeteran = currentYear - userData.yearOfEntry >= 1;
    const userType = isVeteran ? 'veterano' : 'calouro';

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Create user object
    const newUser = {
      id: Date.now().toString(), // Simple ID generation
      fullName: userData.fullName.trim(),
      email: userData.email.trim().toLowerCase(),
      password: hashedPassword, // Store hashed password, never plain text
      yearOfBirth: userData.yearOfBirth,
      gender: userData.gender,
      course: userData.course,
      yearOfEntry: userData.yearOfEntry,
      interests: typeof userData.interests === 'string' ? userData.interests.trim() : (Array.isArray(userData.interests) ? userData.interests.join(', ') : ''),
      userType: userType,
      createdAt: new Date().toISOString()
    };

    // Save user to JSON file
    await addUser(newUser);

    // Return success (don't return password hash)
    const { password, ...userResponse } = newUser;

    res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso',
      user: userResponse
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({
      success: false,
      errors: ['Erro interno do servidor. Tente novamente mais tarde.']
    });
  }
});

// POST /api/users/login - Fazer login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Credenciais inválidas, verifique as informações'
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check rate limit (use email as identifier)
    const rateLimitCheck = checkRateLimit(normalizedEmail);
    if (rateLimitCheck.blocked) {
      return res.status(429).json({
        success: false,
        message: `Muitas tentativas de login. Acesso bloqueado por ${rateLimitCheck.minutesLeft} minutos.`
      });
    }

    // Find user by email
    const user = await findUserByEmail(normalizedEmail);
    
    // Always return generic message if user not found or password incorrect
    if (!user) {
      recordFailedAttempt(normalizedEmail);
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas, verifique as informações'
      });
    }

    // Compare password with hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      recordFailedAttempt(normalizedEmail);
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas, verifique as informações'
      });
    }

    // Clear failed attempts on successful login
    clearAttempts(normalizedEmail);

    // Generate JWT token
    const token = generateToken(user);

    // Return success with token (don't return password hash)
    const { password: _, ...userResponse } = user;

    res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor. Tente novamente mais tarde.'
    });
  }
});

// GET /api/users/profile - Visualizar perfil do usuário autenticado
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // Get user ID from token
    const userId = req.user.id;

    // Find user in database
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Return user data without password
    const { password, ...userResponse } = user;

    res.status(200).json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor. Tente novamente mais tarde.'
    });
  }
});

// PUT /api/users/profile - Editar perfil do usuário autenticado
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, ...profileData } = req.body;

    // Validate current password is provided
    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual é obrigatória para confirmar as alterações'
      });
    }

    // Find user
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Validate current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Senha inválida'
      });
    }

    // Validate editable fields
    const validation = validateEditableProfileData(profileData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    // Prepare update object with only editable fields
    const updates = {};
    
    if (profileData.fullName !== undefined) {
      updates.fullName = profileData.fullName.trim();
    }
    if (profileData.yearOfBirth !== undefined) {
      updates.yearOfBirth = profileData.yearOfBirth;
    }
    if (profileData.gender !== undefined) {
      updates.gender = profileData.gender;
    }
    if (profileData.course !== undefined) {
      updates.course = profileData.course.trim();
    }
    if (profileData.yearOfEntry !== undefined) {
      updates.yearOfEntry = profileData.yearOfEntry;
      
      // Recalculate user type if year of entry changed
      const currentYear = new Date().getFullYear();
      const isVeteran = currentYear - profileData.yearOfEntry >= 1;
      updates.userType = isVeteran ? 'veterano' : 'calouro';
    }
    if (profileData.interests !== undefined) {
      updates.interests = typeof profileData.interests === 'string' 
        ? profileData.interests.trim() 
        : (Array.isArray(profileData.interests) ? profileData.interests.join(', ') : '');
    }

    // Email and password cannot be updated here (they have separate endpoints)
    // Explicitly prevent updating these fields
    delete updates.email;
    delete updates.password;

    // Update user
    const updatedUser = await updateUser(userId, updates);

    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar perfil'
      });
    }

    // Return updated user data without password
    const { password, ...userResponse } = updatedUser;

    res.status(200).json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      user: userResponse
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor. Tente novamente mais tarde.'
    });
  }
});

// POST /api/users/request-mfa-code - Solicitar código MFA para alterar email/senha
router.post('/request-mfa-code', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find user
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Generate and store MFA code
    const code = await createMFACode(userId, user.email);

    // Send code via email
    try {
      const emailResult = await sendMFACode(user.email, code);
      
      // Always return the code in development mode
      const response = {
        success: true,
        message: 'Código de verificação enviado para o seu email.'
      };
      
      // Always include code in development (NODE_ENV is typically not set in dev)
      // Check if we're in development by checking if NODE_ENV is not 'production'
      if (process.env.NODE_ENV !== 'production' || !process.env.NODE_ENV) {
        response.debugCode = code;
        response.message += ' (Verifique também o console do servidor)';
      }
      
      res.status(200).json(response);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Even if email fails, return code in development
      res.status(200).json({
        success: true,
        message: 'Código de verificação gerado. Verifique o console do servidor.',
        debugCode: code // Always include in development
      });
    }
  } catch (error) {
    console.error('Error requesting MFA code:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar código de verificação. Tente novamente mais tarde.'
    });
  }
});

// PUT /api/users/change-credentials - Alterar email ou senha com MFA
router.put('/change-credentials', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, mfaCode, newEmail, newPassword, confirmPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !mfaCode) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual e código MFA são obrigatórios'
      });
    }

    // Validate that at least one field is being changed
    if (!newEmail && !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Informe pelo menos um campo para alterar (Novo Email ou Nova Senha)'
      });
    }

    // Find user
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Validate current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Senha atual inválida'
      });
    }

    // Verify MFA code
    const mfaVerification = await verifyMFACode(userId, mfaCode);
    if (!mfaVerification.valid) {
      return res.status(401).json({
        success: false,
        message: mfaVerification.message || 'Código de verificação incorreto ou expirado'
      });
    }

    // Validate new email if provided
    if (newEmail) {
      const normalizedNewEmail = newEmail.trim().toLowerCase();
      
      if (!isValidEmail(normalizedNewEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Email inválido'
        });
      }

      // Check if email is already in use
      const existingUser = await findUserByEmail(normalizedNewEmail);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          success: false,
          message: 'Esse email já está em uso'
        });
      }
    }

    // Validate new password if provided
    if (newPassword) {
      const passwordValidation = isStrongPassword(newPassword);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'A nova senha e a confirmação não coincidem'
        });
      }
    }

    // Prepare updates
    const updates = {};
    
    if (newEmail) {
      updates.email = newEmail.trim().toLowerCase();
    }
    
    if (newPassword) {
      const saltRounds = 10;
      updates.password = await bcrypt.hash(newPassword, saltRounds);
    }

    // Update user
    const updatedUser = await updateUser(userId, updates);
    
    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar credenciais'
      });
    }

    // Invalidate MFA code
    await invalidateMFACode(userId);

    // Get token from request to blacklist it
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      // Blacklist current token and all other tokens would need to be invalidated
      // For simplicity, we just blacklist this one
      // In production, you might want to store a "token version" or "session ID" in user record
      blacklistToken(token);
    }

    res.status(200).json({
      success: true,
      message: 'Dados atualizados com sucesso. Por favor, faça login novamente.'
    });
  } catch (error) {
    console.error('Error changing credentials:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor. Tente novamente mais tarde.'
    });
  }
});

// POST /api/users/request-deletion-code - Solicitar código de confirmação para exclusão de conta
router.post('/request-deletion-code', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find user
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Generate and store MFA code for account deletion
    const code = await createMFACode(userId, user.email);

    // Send deletion confirmation code via email
    try {
      const emailResult = await sendAccountDeletionCode(user.email, code);
      
      // Always return the code in development mode
      const response = {
        success: true,
        message: 'Código de confirmação enviado para o seu email.'
      };
      
      // Always include code in development (NODE_ENV is typically not set in dev)
      // Check if we're in development by checking if NODE_ENV is not 'production'
      if (process.env.NODE_ENV !== 'production' || !process.env.NODE_ENV) {
        response.debugCode = code;
        response.message += ' (Verifique também o console do servidor)';
      }
      
      res.status(200).json(response);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Even if email fails, return code in development
      res.status(200).json({
        success: true,
        message: 'Código de confirmação gerado. Verifique o console do servidor.',
        debugCode: code // Always include in development
      });
    }
  } catch (error) {
    console.error('Error requesting deletion code:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar código de confirmação. Tente novamente mais tarde.'
    });
  }
});

// DELETE /api/users/account - Excluir conta do usuário autenticado
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, confirmationCode } = req.body;

    // Validate required fields
    if (!currentPassword || !confirmationCode) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual e código de confirmação são obrigatórios'
      });
    }

    // Find user
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Validate current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Senha atual inválida'
      });
    }

    // Verify confirmation code
    const codeVerification = await verifyMFACode(userId, confirmationCode);
    if (!codeVerification.valid) {
      return res.status(401).json({
        success: false,
        message: codeVerification.message || 'Código de confirmação incorreto ou expirado'
      });
    }

    // Log the critical action before deletion
    try {
      await addLogEntry({
        responsible: user.email, // Email of the user who is deleting their account
        action: 'USER_DELETION',
        target: userId,
        justification: 'Exclusão de conta solicitada pelo próprio usuário',
        metadata: {
          userType: user.userType,
          email: user.email
        }
      });
    } catch (logError) {
      console.error('Error logging deletion action:', logError);
      // Continue with deletion even if logging fails
    }

    // Perform hard delete (LGPD compliant - permanent removal)
    const deleted = await deleteUser(userId);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao excluir conta'
      });
    }

    // Invalidate MFA code
    await invalidateMFACode(userId);

    // Get token from request to blacklist it
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      blacklistToken(token);
    }

    res.status(200).json({
      success: true,
      message: 'Conta excluída com sucesso.'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor. Tente novamente mais tarde.'
    });
  }
});

module.exports = router;


