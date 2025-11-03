const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { addUser, findUserByEmail } = require('../utils/fileStorage');
const { validateUserData } = require('../utils/validators');

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

module.exports = router;

