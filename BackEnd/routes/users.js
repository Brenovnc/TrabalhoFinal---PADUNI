const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { addUser, findUserByEmail, findUserById, updateUser } = require('../utils/fileStorage');
const { validateUserData } = require('../utils/validators');
const { validateEditableProfileData } = require('../utils/profileValidators');
const { generateToken } = require('../utils/jwt');
const { checkRateLimit, recordFailedAttempt, clearAttempts } = require('../utils/rateLimiter');
const { authenticateToken } = require('../middleware/auth');

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
      interests: Array.isArray(userData.interests) ? userData.interests : [userData.interests].filter(Boolean),
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
      updates.interests = Array.isArray(profileData.interests) 
        ? profileData.interests 
        : [profileData.interests].filter(Boolean);
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

module.exports = router;


