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

module.exports = {
  gerarMatches,
  ensureScoreColumn,
  getAllUsers,
  getMatches,
  countMatches
};

