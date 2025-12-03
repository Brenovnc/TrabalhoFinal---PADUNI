// Email validation
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Password strength validation
// At least 8 characters, containing at least one letter and one number
function isStrongPassword(password) {
  if (password.length < 8) {
    return { valid: false, message: 'A senha deve ter no mínimo 8 caracteres' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: 'A senha deve conter pelo menos uma letra' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'A senha deve conter pelo menos um número' };
  }
  return { valid: true };
}

// Age validation (minimum 16 years)
function isAgeValid(yearOfBirth) {
  const currentYear = new Date().getFullYear();
  const age = currentYear - yearOfBirth;
  return age >= 16;
}

// Validate all user data
function validateUserData(userData) {
  const errors = [];

  // Required fields validation
  if (!userData.fullName || userData.fullName.trim() === '') {
    errors.push('Nome completo é obrigatório');
  }

  if (!userData.email || userData.email.trim() === '') {
    errors.push('Email é obrigatório');
  } else if (!isValidEmail(userData.email)) {
    errors.push('Email inválido');
  }

  if (!userData.password || userData.password.trim() === '') {
    errors.push('Senha é obrigatória');
  } else {
    const passwordValidation = isStrongPassword(userData.password);
    if (!passwordValidation.valid) {
      errors.push(passwordValidation.message);
    }
  }

  if (userData.password !== userData.confirmPassword) {
    errors.push('A senha e a confirmação de senha não coincidem');
  }

  if (!userData.yearOfBirth) {
    errors.push('Ano de nascimento é obrigatório');
  } else if (!isAgeValid(userData.yearOfBirth)) {
    errors.push('Idade mínima de 16 anos é necessária');
  }

  if (!userData.gender || userData.gender.trim() === '') {
    errors.push('Gênero é obrigatório');
  }

  if (!userData.course || userData.course.trim() === '') {
    errors.push('Curso é obrigatório');
  }

  if (!userData.yearOfEntry) {
    errors.push('Ano de ingresso é obrigatório');
  }

  if (!userData.interests || (typeof userData.interests === 'string' ? userData.interests.trim() : '').length === 0) {
    errors.push('Interesses são obrigatórios');
  } else if (typeof userData.interests === 'string' && userData.interests.trim().length > 600) {
    errors.push('Interesses devem ter no máximo 600 caracteres');
  } else if (Array.isArray(userData.interests) && userData.interests.join(', ').length > 600) {
    errors.push('Interesses devem ter no máximo 600 caracteres');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  isValidEmail,
  isStrongPassword,
  isAgeValid,
  validateUserData
};


