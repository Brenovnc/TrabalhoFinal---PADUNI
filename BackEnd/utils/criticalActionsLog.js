const { query } = require('./db');
const { findUserByEmail } = require('./fileStorage');

// Map database row to log entry object (for API compatibility)
function mapDbRowToLog(row) {
  if (!row) return null;
  
  return {
    id: row.id.toString(),
    timestamp: row.data_hora ? new Date(row.data_hora).toISOString() : null,
    responsible: row.responsible_email || row.id_usuario_responsavel?.toString() || null,
    action: row.acao,
    target: row.alvo,
    justification: row.justificativa,
    metadata: row.metadata || {} // Metadata is not in DB schema, but we can add it if needed
  };
}

// Add a new log entry (append-only, cannot be modified or deleted)
async function addLogEntry(logEntry) {
  try {
    // Find user by email to get the user ID
    let userId = null;
    if (logEntry.responsible) {
      const user = await findUserByEmail(logEntry.responsible);
      if (user) {
        userId = parseInt(user.id);
      }
    }

    // If user not found by email, try to parse as ID
    if (!userId && logEntry.responsible) {
      const parsedId = parseInt(logEntry.responsible);
      if (!isNaN(parsedId)) {
        userId = parsedId;
      }
    }

    // Insert log entry
    const result = await query(`
      INSERT INTO logs_acao_critica_table (
        id_usuario_responsavel, acao, alvo, justificativa
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      userId,
      logEntry.action,
      logEntry.target,
      logEntry.justification || ''
    ]);

    // Get the created log with user email if available
    const logResult = await query(`
      SELECT 
        l.*,
        u.email as responsible_email
      FROM logs_acao_critica_table l
      LEFT JOIN usuarios_table u ON l.id_usuario_responsavel = u.id
      WHERE l.id = $1
    `, [result.rows[0].id]);

    return mapDbRowToLog(logResult.rows[0]);
  } catch (error) {
    console.error('Error adding log entry:', error);
    throw error;
  }
}

// Get all logs (read-only access)
async function getAllLogs() {
  try {
    const result = await query(`
      SELECT 
        l.*,
        u.email as responsible_email
      FROM logs_acao_critica_table l
      LEFT JOIN usuarios_table u ON l.id_usuario_responsavel = u.id
      ORDER BY l.data_hora DESC
    `);
    return result.rows.map(mapDbRowToLog);
  } catch (error) {
    console.error('Error getting all logs:', error);
    throw error;
  }
}

// Get logs filtered by action
async function getLogsByAction(action) {
  try {
    const result = await query(`
      SELECT 
        l.*,
        u.email as responsible_email
      FROM logs_acao_critica_table l
      LEFT JOIN usuarios_table u ON l.id_usuario_responsavel = u.id
      WHERE l.acao = $1
      ORDER BY l.data_hora DESC
    `, [action]);
    return result.rows.map(mapDbRowToLog);
  } catch (error) {
    console.error('Error getting logs by action:', error);
    throw error;
  }
}

// Get logs filtered by responsible (email or ID)
async function getLogsByResponsible(responsible) {
  try {
    // Try to find user by email first
    let userId = null;
    const user = await findUserByEmail(responsible);
    if (user) {
      userId = parseInt(user.id);
    }

    // If not found, try to parse as ID
    if (!userId) {
      const parsedId = parseInt(responsible);
      if (!isNaN(parsedId)) {
        userId = parsedId;
      }
    }

    if (!userId) {
      // If we can't find the user, return empty array
      return [];
    }

    const result = await query(`
      SELECT 
        l.*,
        u.email as responsible_email
      FROM logs_acao_critica_table l
      LEFT JOIN usuarios_table u ON l.id_usuario_responsavel = u.id
      WHERE l.id_usuario_responsavel = $1
      ORDER BY l.data_hora DESC
    `, [userId]);
    return result.rows.map(mapDbRowToLog);
  } catch (error) {
    console.error('Error getting logs by responsible:', error);
    throw error;
  }
}

module.exports = {
  addLogEntry,
  getAllLogs,
  getLogsByAction,
  getLogsByResponsible
};
