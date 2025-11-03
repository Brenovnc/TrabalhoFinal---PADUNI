// Validators specifically for profile update (editable fields only)

function validateEditableProfileData(profileData) {
  const errors = [];

  // Full Name validation
  if (profileData.fullName !== undefined) {
    if (!profileData.fullName || profileData.fullName.trim() === '') {
      errors.push('Nome completo é obrigatório');
    }
  }

  // Year of Birth validation
  if (profileData.yearOfBirth !== undefined) {
    if (!profileData.yearOfBirth) {
      errors.push('Ano de nascimento é obrigatório');
    } else {
      const currentYear = new Date().getFullYear();
      const age = currentYear - profileData.yearOfBirth;
      if (age < 16) {
        errors.push('Idade mínima de 16 anos é necessária');
      }
    }
  }

  // Gender validation
  if (profileData.gender !== undefined) {
    if (!profileData.gender || profileData.gender.trim() === '') {
      errors.push('Gênero é obrigatório');
    }
  }

  // Course validation
  if (profileData.course !== undefined) {
    if (!profileData.course || profileData.course.trim() === '') {
      errors.push('Curso é obrigatório');
    }
  }

  // Year of Entry validation
  if (profileData.yearOfEntry !== undefined) {
    if (!profileData.yearOfEntry) {
      errors.push('Ano de ingresso é obrigatório');
    }
  }

  // Interests validation
  if (profileData.interests !== undefined) {
    if (!profileData.interests || profileData.interests.length === 0) {
      errors.push('Selecione pelo menos um interesse');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateEditableProfileData
};

