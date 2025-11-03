const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { addUser, findUserByEmail } = require('../utils/fileStorage');
const { validateUserData } = require('../utils/validators');
const { generateToken } = require('../utils/jwt');
const { checkRateLimit, recordFailedAttempt, clearAttempts } = require('../utils/rateLimiter');

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

module.exports = router;


