/**
 * Sistema de match automático baseado em similaridade de interesses
 * Compara interesses de todos os usuários e gera matches com score >= 0.5
 */
const { query, getClient } = require('./db');
const { compareTexts } = require('./textSimilarity');

/**
 * Verifica se a coluna score existe na matches_table, se não, adiciona
 * Usa a tabela matches_table existente do database_schema.sql
 */
async function ensureScoreColumn() {
  try {
    // Verifica se a coluna score já existe
    const checkColumn = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'matches_table'
        AND column_name = 'score'
      );
    `);

    if (checkColumn.rows[0].exists) {
      console.log('[MATCH] Coluna score já existe na matches_table');
      return;
    }

    console.log('[MATCH] Adicionando coluna score na matches_table...');

    // Adiciona a coluna score na tabela existente
    await query(`
      ALTER TABLE matches_table
      ADD COLUMN score DECIMAL(5, 4) CHECK (score >= 0 AND score <= 1);
    `);

    // Cria índice para melhor performance nas consultas por score
    await query(`
      CREATE INDEX idx_matches_table_score ON matches_table(score DESC) WHERE score IS NOT NULL;
    `);

    console.log('[MATCH] Coluna score adicionada com sucesso na matches_table');
  } catch (error) {
    console.error('[MATCH] Erro ao verificar/adicionar coluna score:', error);
    throw error;
  }
}

/**
 * Busca todos os usuários do banco de dados
 */
async function getAllUsers() {
  try {
    const result = await query(`
      SELECT id, nome, interesses
      FROM usuarios_table
      WHERE interesses IS NOT NULL 
        AND interesses != ''
        AND interesses != ' '
      ORDER BY id
    `);

    return result.rows.map(row => ({
      id: parseInt(row.id),
      nome: row.nome,
      interesses: row.interesses
    }));
  } catch (error) {
    console.error('[MATCH] Erro ao buscar usuários:', error);
    throw error;
  }
}

/**
 * Gera matches baseados em similaridade de interesses
 * Compara todos os pares de usuários e salva matches com score >= 0.5
 */
async function gerarMatches() {
  console.log('[MATCH] ========================================');
  console.log('[MATCH] Iniciando verificação de matches...');
  console.log('[MATCH] Horário:', new Date().toLocaleString('pt-BR'));

  try {
    // Garante que a coluna score existe na matches_table
    await ensureScoreColumn();

    // Busca todos os usuários
    const users = await getAllUsers();

    if (users.length < 2) {
      console.log('[MATCH] Número insuficiente de usuários para gerar matches (mínimo 2)');
      return {
        success: true,
        message: 'Número insuficiente de usuários',
        matchesFound: 0,
        matchesSaved: 0
      };
    }

    console.log(`[MATCH] Encontrados ${users.length} usuários para comparação`);

    // Lista para armazenar os matches encontrados
    const matches = [];
    const MIN_SCORE = 0.5; // Score mínimo para considerar um match

    // Compara cada par de usuários
    let comparisons = 0;    
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const user1 = users[i];
        const user2 = users[j];

        try {
          // Calcula similaridade entre os interesses
          const score = await compareTexts(user1.interesses, user2.interesses);
          comparisons++;

          // Se o score for >= 0.5, adiciona à lista de matches
          if (score >= MIN_SCORE) {
            matches.push({
              user1_id: user1.id,
              user2_id: user2.id,
              score: score,
              user1_nome: user1.nome,
              user2_nome: user2.nome
            });

            console.log(`[MATCH] Par encontrado: ${user1.nome} e ${user2.nome} (score: ${score.toFixed(4)})`);
          }
        } catch (error) {
          console.error(`[MATCH] Erro ao comparar ${user1.nome} e ${user2.nome}:`, error.message);
          // Continua com o próximo par mesmo se houver erro
        }
      }
    }

    console.log(`[MATCH] Total de comparações realizadas: ${comparisons}`);
    console.log(`[MATCH] Matches encontrados (score >= ${MIN_SCORE}): ${matches.length}`);

    if (matches.length === 0) {
      console.log('[MATCH] Nenhum match encontrado com score suficiente');
      return {
        success: true,
        message: 'Nenhum match encontrado',
        matchesFound: 0,
        matchesSaved: 0
      };
    }

    // Salva os matches no banco de dados
    const client = await getClient();
    let savedCount = 0;
    let skippedCount = 0;

    try {
      await client.query('BEGIN');

      for (const match of matches) {
        try {
          // Usa matches_table existente
          // Garante ordem consistente: menor ID sempre em id_usuario_veterano
          // Isso evita duplicatas devido à constraint UNIQUE
          const [veteranoId, calouroId] = match.user1_id < match.user2_id
            ? [match.user1_id, match.user2_id]
            : [match.user2_id, match.user1_id];

          // Insere ou atualiza o match na matches_table
          // Se já existir um match entre esses usuários, atualiza o score
          await client.query(`
            INSERT INTO matches_table (
              id_usuario_veterano, 
              id_usuario_calouro, 
              status, 
              score
            )
            VALUES ($1, $2, 'ativo', $3)
            ON CONFLICT (id_usuario_veterano, id_usuario_calouro) 
            DO UPDATE SET 
              score = EXCLUDED.score,
              atualizado_em = CURRENT_TIMESTAMP
          `, [veteranoId, calouroId, match.score]);

          savedCount++;
        } catch (error) {
          // Se for erro de constraint única, apenas ignora (já existe)
          if (error.code === '23505') {
            skippedCount++;
          } else {
            console.error(`[MATCH] Erro ao salvar match ${match.user1_id}-${match.user2_id}:`, error.message);
          }
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    console.log(`[MATCH] Matches salvos: ${savedCount}`);
    if (skippedCount > 0) {
      console.log(`[MATCH] Matches já existentes (ignorados): ${skippedCount}`);
    }
    console.log('[MATCH] Matches salvos com sucesso.');
    console.log('[MATCH] ========================================');

    return {
      success: true,
      message: `Processamento concluído. ${matches.length} matches encontrados, ${savedCount} salvos.`,
      matchesFound: matches.length,
      matchesSaved: savedCount,
      matchesSkipped: skippedCount,
      comparisons: comparisons
    };
  } catch (error) {
    console.error('[MATCH] ❌ Erro ao gerar matches:', error);
    console.log('[MATCH] ========================================');
    throw error;
  }
}

/**
 * Busca todos os matches de similaridade do banco de dados
 * Usa a tabela matches_table existente
 * @param {Object} options - Opções de filtro (limit, offset, minScore)
 * @returns {Promise<Array>} - Lista de matches com informações dos usuários
 */
async function getMatches(options = {}) {
  try {
    // Garante que a coluna score existe
    await ensureScoreColumn();

    const {
      limit = 100,
      offset = 0,
      minScore = 0,
      userId = null // Filtrar por um usuário específico
    } = options;

    let queryText = `
      SELECT 
        m.id,
        m.id_usuario_veterano as user1_id,
        m.id_usuario_calouro as user2_id,
        m.score,
        m.data_match as data_criacao,
        m.status,
        u1.nome as user1_nome,
        u1.email as user1_email,
        u2.nome as user2_nome,
        u2.email as user2_email
      FROM matches_table m
      LEFT JOIN usuarios_table u1 ON m.id_usuario_veterano = u1.id
      LEFT JOIN usuarios_table u2 ON m.id_usuario_calouro = u2.id
      WHERE m.score IS NOT NULL AND m.score >= $1
    `;

    const params = [minScore];
    let paramIndex = 2;

    // Filtro por usuário específico
    if (userId) {
      queryText += ` AND (m.id_usuario_veterano = $${paramIndex} OR m.id_usuario_calouro = $${paramIndex})`;
      params.push(parseInt(userId));
      paramIndex++;
    }

    queryText += `
      ORDER BY m.score DESC, m.data_match DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, params);

    return result.rows.map(row => ({
      id: parseInt(row.id),
      user1: {
        id: parseInt(row.user1_id),
        nome: row.user1_nome || 'Usuário removido',
        email: row.user1_email || null
      },
      user2: {
        id: parseInt(row.user2_id),
        nome: row.user2_nome || 'Usuário removido',
        email: row.user2_email || null
      },
      score: row.score ? parseFloat(row.score) : null,
      status: row.status,
      dataCriacao: row.data_criacao
    }));
  } catch (error) {
    console.error('[MATCH] Erro ao buscar matches:', error);
    throw error;
  }
}

/**
 * Conta o total de matches no banco
 * Usa a tabela matches_table existente
 * @param {Object} options - Opções de filtro (minScore, userId)
 * @returns {Promise<number>} - Total de matches
 */
async function countMatches(options = {}) {
  try {
    // Garante que a coluna score existe
    await ensureScoreColumn();

    const {
      minScore = 0,
      userId = null
    } = options;

    let queryText = `
      SELECT COUNT(*) as total
      FROM matches_table
      WHERE score IS NOT NULL AND score >= $1
    `;

    const params = [minScore];

    if (userId) {
      queryText += ` AND (id_usuario_veterano = $2 OR id_usuario_calouro = $2)`;
      params.push(parseInt(userId));
    }

    const result = await query(queryText, params);
    return parseInt(result.rows[0].total);
  } catch (error) {
    console.error('[MATCH] Erro ao contar matches:', error);
    throw error;
  }
}

/**
 * Busca o match de um usuário específico
 * Retorna as informações completas do usuário com quem ele fez match
 * @param {number} userId - ID do usuário
 * @returns {Promise<Object|null>} - Informações do match ou null se não encontrado
 */
async function getUserMatch(userId) {
  try {
    // Garante que a coluna score existe
    await ensureScoreColumn();

    if (!userId || isNaN(parseInt(userId))) {
      throw new Error('ID de usuário inválido');
    }

    const userIdNum = parseInt(userId);

    // Busca match onde o usuário está em qualquer posição (veterano ou calouro)
    const result = await query(`
      SELECT 
        m.id as match_id,
        m.id_usuario_veterano,
        m.id_usuario_calouro,
        m.score,
        m.status,
        m.data_match,
        -- Informações do usuário veterano
        u_veterano.id as veterano_id,
        u_veterano.nome as veterano_nome,
        u_veterano.email as veterano_email,
        u_veterano.ano_nascimento as veterano_ano_nascimento,
        u_veterano.ano_entrada_unifei as veterano_ano_entrada,
        u_veterano.interesses as veterano_interesses,
        u_veterano.genero as veterano_genero,
        u_veterano.tipo_usuario as veterano_tipo,
        c_veterano.nome as veterano_curso,
        -- Informações do usuário calouro
        u_calouro.id as calouro_id,
        u_calouro.nome as calouro_nome,
        u_calouro.email as calouro_email,
        u_calouro.ano_nascimento as calouro_ano_nascimento,
        u_calouro.ano_entrada_unifei as calouro_ano_entrada,
        u_calouro.interesses as calouro_interesses,
        u_calouro.genero as calouro_genero,
        u_calouro.tipo_usuario as calouro_tipo,
        c_calouro.nome as calouro_curso
      FROM matches_table m
      LEFT JOIN usuarios_table u_veterano ON m.id_usuario_veterano = u_veterano.id
      LEFT JOIN usuarios_table u_calouro ON m.id_usuario_calouro = u_calouro.id
      LEFT JOIN cursos_table c_veterano ON u_veterano.curso_id = c_veterano.id
      LEFT JOIN cursos_table c_calouro ON u_calouro.curso_id = c_calouro.id
      WHERE (m.id_usuario_veterano = $1 OR m.id_usuario_calouro = $1)
        AND m.status = 'ativo'
      ORDER BY m.data_match DESC
      LIMIT 1
    `, [userIdNum]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Determina qual usuário é o solicitante e qual é o matchado
    const isVeterano = row.id_usuario_veterano === userIdNum;
    
    // Se o usuário solicitante é o veterano, o matchado é o calouro, e vice-versa
    const solicitante = isVeterano ? {
      id: parseInt(row.veterano_id),
      nome: row.veterano_nome || 'Usuário removido',
      email: row.veterano_email || null,
      anoNascimento: row.veterano_ano_nascimento,
      anoEntrada: row.veterano_ano_entrada,
      interesses: row.veterano_interesses,
      genero: row.veterano_genero,
      tipoUsuario: row.veterano_tipo,
      curso: row.veterano_curso || null
    } : {
      id: parseInt(row.calouro_id),
      nome: row.calouro_nome || 'Usuário removido',
      email: row.calouro_email || null,
      anoNascimento: row.calouro_ano_nascimento,
      anoEntrada: row.calouro_ano_entrada,
      interesses: row.calouro_interesses,
      genero: row.calouro_genero,
      tipoUsuario: row.calouro_tipo,
      curso: row.calouro_curso || null
    };

    const matchado = isVeterano ? {
      id: parseInt(row.calouro_id),
      nome: row.calouro_nome || 'Usuário removido',
      email: row.calouro_email || null,
      anoNascimento: row.calouro_ano_nascimento,
      anoEntrada: row.calouro_ano_entrada,
      interesses: row.calouro_interesses,
      genero: row.calouro_genero,
      tipoUsuario: row.calouro_tipo,
      curso: row.calouro_curso || null
    } : {
      id: parseInt(row.veterano_id),
      nome: row.veterano_nome || 'Usuário removido',
      email: row.veterano_email || null,
      anoNascimento: row.veterano_ano_nascimento,
      anoEntrada: row.veterano_ano_entrada,
      interesses: row.veterano_interesses,
      genero: row.veterano_genero,
      tipoUsuario: row.veterano_tipo,
      curso: row.veterano_curso || null
    };

    return {
      match: {
        id: parseInt(row.match_id),
        score: row.score ? parseFloat(row.score) : null,
        status: row.status,
        dataMatch: row.data_match
      },
      solicitante,
      matchado
    };
  } catch (error) {
    console.error('[MATCH] Erro ao buscar match do usuário:', error);
    throw error;
  }
}

module.exports = {
  gerarMatches,
  ensureScoreColumn,
  getAllUsers,
  getMatches,
  countMatches,
  getUserMatch
};

