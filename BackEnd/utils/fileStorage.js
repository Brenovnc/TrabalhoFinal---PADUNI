const { query } = require('./db');
const { getOrCreateCourse, getCourseById } = require('./courses');

// Map database row to user object (for API compatibility)
function mapDbRowToUser(row) {
  if (!row) return null;
  
  return {
    id: row.id.toString(),
    fullName: row.nome,
    email: row.email,
    password: row.hash_senha,
    yearOfBirth: row.ano_nascimento.toString(),
    gender: row.genero,
    course: row.curso_nome || null, // Will be populated by JOIN
    yearOfEntry: row.ano_entrada_unifei.toString(),
    interests: row.interesses,
    userType: row.tipo_usuario,
    statusMatch: row.status_match,
    createdAt: row.criado_em ? new Date(row.criado_em).toISOString() : null,
    updatedAt: row.atualizado_em ? new Date(row.atualizado_em).toISOString() : null
  };
}

// Read all users from database
async function readUsers() {
  try {
    const result = await query(`
      SELECT 
        u.*,
        c.nome as curso_nome
      FROM usuarios_table u
      LEFT JOIN cursos_table c ON u.curso_id = c.id
      ORDER BY u.id
    `);
    return result.rows.map(mapDbRowToUser);
  } catch (error) {
    console.error('Error reading users:', error);
    throw error;
  }
}

// Write users to database (for compatibility, but not really needed)
async function writeUsers(users) {
  // This function is kept for compatibility but doesn't do anything
  // Individual operations should use addUser, updateUser, deleteUser
  console.warn('writeUsers called - this function is deprecated. Use individual operations instead.');
}

// Add a new user
async function addUser(userData) {
  try {
    // Get or create course
    const courseId = await getOrCreateCourse(userData.course);

    // Determine user type if not provided
    let userType = userData.userType;
    if (!userType) {
      const currentYear = new Date().getFullYear();
      const yearOfEntry = parseInt(userData.yearOfEntry);
      userType = (currentYear - yearOfEntry >= 1) ? 'veterano' : 'calouro';
    }

    // Convert interests to string if it's an array
    let interests = userData.interests;
    if (Array.isArray(interests)) {
      interests = interests.join(', ');
    }

    // Insert user
    const result = await query(`
      INSERT INTO usuarios_table (
        nome, email, ano_nascimento, ano_entrada_unifei, 
        interesses, hash_senha, genero, tipo_usuario, 
        status_match, curso_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      userData.fullName,
      userData.email.toLowerCase(),
      parseInt(userData.yearOfBirth),
      parseInt(userData.yearOfEntry),
      interests,
      userData.password,
      userData.gender.toLowerCase(),
      userType,
      'pendente', // Default status_match
      courseId
    ]);

    // Get the created user with course name
    const userResult = await query(`
      SELECT 
        u.*,
        c.nome as curso_nome
      FROM usuarios_table u
      LEFT JOIN cursos_table c ON u.curso_id = c.id
      WHERE u.id = $1
    `, [result.rows[0].id]);

    return mapDbRowToUser(userResult.rows[0]);
  } catch (error) {
    console.error('Error adding user:', error);
    throw error;
  }
}

// Find user by email
async function findUserByEmail(email) {
  try {
    const result = await query(`
      SELECT 
        u.*,
        c.nome as curso_nome
      FROM usuarios_table u
      LEFT JOIN cursos_table c ON u.curso_id = c.id
      WHERE u.email = $1
    `, [email.toLowerCase()]);
    
    return mapDbRowToUser(result.rows[0]);
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
}

// Find user by ID
async function findUserById(id) {
  try {
    const result = await query(`
      SELECT 
        u.*,
        c.nome as curso_nome
      FROM usuarios_table u
      LEFT JOIN cursos_table c ON u.curso_id = c.id
      WHERE u.id = $1
    `, [parseInt(id)]);
    
    return mapDbRowToUser(result.rows[0]);
  } catch (error) {
    console.error('Error finding user by ID:', error);
    throw error;
  }
}

// Update user by ID
async function updateUser(userId, updates) {
  try {
    const userIdInt = parseInt(userId);
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    // Handle course update
    if (updates.course !== undefined) {
      const courseId = await getOrCreateCourse(updates.course);
      updateFields.push(`curso_id = $${paramCount++}`);
      values.push(courseId);
      delete updates.course; // Remove from updates to avoid duplicate
    }

    // Handle user type recalculation if year of entry changed
    if (updates.yearOfEntry !== undefined) {
      const currentYear = new Date().getFullYear();
      const yearOfEntry = parseInt(updates.yearOfEntry);
      const isVeteran = currentYear - yearOfEntry >= 1;
      updates.userType = isVeteran ? 'veterano' : 'calouro';
    }

    // Map updates to database fields
    const fieldMapping = {
      fullName: 'nome',
      email: 'email',
      password: 'hash_senha',
      yearOfBirth: 'ano_nascimento',
      gender: 'genero',
      yearOfEntry: 'ano_entrada_unifei',
      interests: 'interesses',
      userType: 'tipo_usuario',
      statusMatch: 'status_match'
    };

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || key === 'course') continue;
      
      const dbField = fieldMapping[key];
      if (dbField) {
        // Handle special cases
        if (key === 'yearOfBirth' || key === 'yearOfEntry') {
          updateFields.push(`${dbField} = $${paramCount++}`);
          values.push(parseInt(value));
        } else if (key === 'email') {
          updateFields.push(`${dbField} = $${paramCount++}`);
          values.push(value.toLowerCase());
        } else if (key === 'interests') {
          let interestsValue = value;
          if (Array.isArray(interestsValue)) {
            interestsValue = interestsValue.join(', ');
          }
          updateFields.push(`${dbField} = $${paramCount++}`);
          values.push(interestsValue);
        } else if (key === 'gender') {
          updateFields.push(`${dbField} = $${paramCount++}`);
          values.push(value.toLowerCase());
        } else {
          updateFields.push(`${dbField} = $${paramCount++}`);
          values.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      // No updates to make, just return the user
      return await findUserById(userId);
    }

    // Add updated_at timestamp
    updateFields.push(`atualizado_em = CURRENT_TIMESTAMP`);

    // Add user ID to values
    values.push(userIdInt);

    // Execute update
    await query(`
      UPDATE usuarios_table 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
    `, values);

    // Return updated user
    return await findUserById(userId);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

// Delete user by ID (hard delete - LGPD compliant)
async function deleteUser(userId) {
  try {
    const result = await query(
      'DELETE FROM usuarios_table WHERE id = $1',
      [parseInt(userId)]
    );
    
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

module.exports = {
  readUsers,
  writeUsers,
  addUser,
  findUserByEmail,
  findUserById,
  updateUser,
  deleteUser
};
