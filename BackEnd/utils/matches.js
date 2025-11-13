/**
 * Funções para gerenciar matches no banco de dados
 */
const { query, getClient } = require('./db');

/**
 * Busca calouros que precisam de padrinho (status 'pendente' e tipo 'calouro')
 * e que ainda não possuem match ativo
 */
async function getCalourosDisponiveis() {
  try {
    const result = await query(`
      SELECT 
        u.id,
        u.nome,
        u.email,
        u.ano_nascimento,
        u.genero,
        u.interesses,
        c.nome as curso_nome,
        u.ano_entrada_unifei
      FROM usuarios_table u
      LEFT JOIN cursos_table c ON u.curso_id = c.id
      WHERE u.tipo_usuario = 'calouro'
        AND u.status_match = 'pendente'
        AND u.id NOT IN (
          SELECT DISTINCT id_usuario_calouro
          FROM matches_table
          WHERE status = 'ativo'
            AND id_usuario_calouro IS NOT NULL
        )
      ORDER BY u.criado_em ASC
    `);
    
    // Mapeia para o formato esperado pela IA
    return result.rows.map(row => ({
      id: row.id.toString(),
      fullName: row.nome,
      email: row.email,
      yearOfBirth: row.ano_nascimento.toString(),
      gender: row.genero,
      course: row.curso_nome,
      interests: row.interesses,
      yearOfEntry: row.ano_entrada_unifei.toString()
    }));
  } catch (error) {
    console.error('Error fetching available calouros:', error);
    throw error;
  }
}

/**
 * Busca veteranos disponíveis para apadrinhamento (tipo 'veterano')
 * que não possuem match ativo (1:1 - cada veterano só pode ter um calouro)
 */
async function getVeteranosDisponiveis() {
  try {
    const result = await query(`
      SELECT 
        u.id,
        u.nome,
        u.email,
        u.ano_nascimento,
        u.genero,
        u.interesses,
        c.nome as curso_nome,
        u.ano_entrada_unifei
      FROM usuarios_table u
      LEFT JOIN cursos_table c ON u.curso_id = c.id
      WHERE u.tipo_usuario = 'veterano'
        AND u.id NOT IN (
          SELECT DISTINCT id_usuario_veterano
          FROM matches_table
          WHERE status = 'ativo'
            AND id_usuario_veterano IS NOT NULL
        )
      ORDER BY u.criado_em ASC
    `);
    
    // Mapeia para o formato esperado pela IA
    return result.rows.map(row => ({
      id: row.id.toString(),
      fullName: row.nome,
      email: row.email,
      yearOfBirth: row.ano_nascimento.toString(),
      gender: row.genero,
      course: row.curso_nome,
      interests: row.interesses,
      yearOfEntry: row.ano_entrada_unifei.toString(),
      activeMatches: 0
    }));
  } catch (error) {
    console.error('Error fetching available veteranos:', error);
    throw error;
  }
}

/**
 * Cria um match no banco de dados
 */
async function createMatch(veteranoId, calouroId) {
  try {
    const result = await query(`
      INSERT INTO matches_table (
        id_usuario_veterano,
        id_usuario_calouro,
        status
      ) VALUES ($1, $2, 'ativo')
      ON CONFLICT (id_usuario_veterano, id_usuario_calouro) 
      DO UPDATE SET 
        status = 'ativo',
        atualizado_em = CURRENT_TIMESTAMP
      RETURNING *
    `, [parseInt(veteranoId), parseInt(calouroId)]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating match:', error);
    throw error;
  }
}

/**
 * Atualiza o status do usuário para 'pareado'
 */
async function updateUserMatchStatus(userId, status) {
  try {
    const result = await query(`
      UPDATE usuarios_table
      SET status_match = $1,
          atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, parseInt(userId)]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error updating user match status:', error);
    throw error;
  }
}

/**
 * Cria múltiplos matches em uma transação
 * Garante regra 1:1 - cada veterano e calouro só pode ter um match ativo
 */
async function createMatchesBatch(matches) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const createdMatches = [];
    
    for (const match of matches) {
      const veteranoId = parseInt(match.veterano.id);
      const calouroId = parseInt(match.calouro.id);
      
      // Verifica se o veterano já está associado a outro calouro (1:1)
      const existingMatchVeterano = await client.query(`
        SELECT id, id_usuario_calouro
        FROM matches_table
        WHERE id_usuario_veterano = $1 AND status = 'ativo'
      `, [veteranoId]);
      
      // Se o veterano já está associado a outro calouro, desativa o match anterior
      if (existingMatchVeterano.rows.length > 0) {
        const existingVet = existingMatchVeterano.rows[0];
        if (parseInt(existingVet.id_usuario_calouro) !== calouroId) {
          await client.query(`
            UPDATE matches_table
            SET status = 'desativado',
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [existingVet.id]);
          console.log(`[MATCHES] Match anterior do veterano ${veteranoId} desativado para garantir 1:1`);
        }
      }
      
      // Verifica se o calouro já está associado a outro veterano
      const existingMatchCalouro = await client.query(`
        SELECT id, id_usuario_veterano
        FROM matches_table
        WHERE id_usuario_calouro = $1 AND status = 'ativo'
      `, [calouroId]);
      
      // Se o calouro já está associado a outro veterano, desativa o match anterior
      if (existingMatchCalouro.rows.length > 0) {
        const existingCal = existingMatchCalouro.rows[0];
        if (parseInt(existingCal.id_usuario_veterano) !== veteranoId) {
          await client.query(`
            UPDATE matches_table
            SET status = 'desativado',
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [existingCal.id]);
          console.log(`[MATCHES] Match anterior do calouro ${calouroId} desativado para garantir 1:1`);
        }
      }
      
      // Cria o match (ou atualiza se já existir)
      const matchResult = await client.query(`
        INSERT INTO matches_table (
          id_usuario_veterano,
          id_usuario_calouro,
          status,
          score
        ) VALUES ($1, $2, 'ativo', $3)
        ON CONFLICT (id_usuario_veterano, id_usuario_calouro) 
        DO UPDATE SET 
          status = 'ativo',
          score = $3,
          atualizado_em = CURRENT_TIMESTAMP
        RETURNING *
      `, [veteranoId, calouroId, match.score || null]);
      
      // Atualiza status do calouro para 'pareado'
      await client.query(`
        UPDATE usuarios_table
        SET status_match = 'pareado',
            atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [calouroId]);
      
      createdMatches.push({
        match: matchResult.rows[0],
        calouro: match.calouro,
        veterano: match.veterano,
        score: match.score
      });
    }
    
    await client.query('COMMIT');
    
    return createdMatches;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating matches batch:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Verifica se um calouro já possui match ativo
 */
async function hasActiveMatch(userId) {
  try {
    const result = await query(`
      SELECT COUNT(*) as count
      FROM matches_table
      WHERE (id_usuario_calouro = $1 OR id_usuario_veterano = $1)
        AND status = 'ativo'
    `, [parseInt(userId)]);
    
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    console.error('Error checking active match:', error);
    throw error;
  }
}

/**
 * Busca matches de um usuário
 */
async function getUserMatches(userId) {
  try {
    const result = await query(`
      SELECT 
        m.*,
        v.nome as veterano_nome,
        v.email as veterano_email,
        c.nome as calouro_nome,
        c.email as calouro_email
      FROM matches_table m
      LEFT JOIN usuarios_table v ON m.id_usuario_veterano = v.id
      LEFT JOIN usuarios_table c ON m.id_usuario_calouro = c.id
      WHERE (m.id_usuario_veterano = $1 OR m.id_usuario_calouro = $1)
        AND m.status = 'ativo'
      ORDER BY m.data_match DESC
    `, [parseInt(userId)]);
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching user matches:', error);
    throw error;
  }
}

module.exports = {
  getCalourosDisponiveis,
  getVeteranosDisponiveis,
  createMatch,
  createMatchesBatch,
  updateUserMatchStatus,
  hasActiveMatch,
  getUserMatches
};

