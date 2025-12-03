const { query } = require('./db');

// Get or create a course by name
async function getOrCreateCourse(courseName) {
  try {
    // First, try to find the course
    let result = await query(
      'SELECT id FROM cursos_table WHERE nome = $1',
      [courseName]
    );

    if (result.rows.length > 0) {
      return result.rows[0].id;
    }

    // If not found, create it
    result = await query(
      'INSERT INTO cursos_table (nome) VALUES ($1) ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id',
      [courseName]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error('Error getting or creating course:', error);
    throw error;
  }
}

// Get course by ID
async function getCourseById(courseId) {
  try {
    const result = await query(
      'SELECT * FROM cursos_table WHERE id = $1',
      [courseId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting course by ID:', error);
    throw error;
  }
}

// Get all courses
async function getAllCourses() {
  try {
    const result = await query('SELECT * FROM cursos_table ORDER BY nome');
    return result.rows;
  } catch (error) {
    console.error('Error getting all courses:', error);
    throw error;
  }
}

module.exports = {
  getOrCreateCourse,
  getCourseById,
  getAllCourses
};

