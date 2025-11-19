/**
 * Serviço para gerenciar solicitações de anulação/cancelamento de matches
 * Conforme requisito: permitir que administradores solicitem desfazimento de matches
 */

const { query, getClient } = require('./db');
const { sendEmail } = require('./emailService');
const { 
  generateAdminCancellationRequestEmail, 
  getAdminCancellationRequestSubject 
} = require('../templates/adminCancellationRequestTemplate');
const {
  generateUserCancellationRequestEmail,
  getUserCancellationRequestSubject
} = require('../templates/userCancellationRequestTemplate');
const { addLogEntry } = require('./criticalActionsLog');

/**
 * Busca o email do administrador responsável pelo sistema
 * Retorna o primeiro administrador encontrado ou usa email padrão de configuração
 * @returns {Promise<string>} - Email do administrador
 */
async function getAdminEmail() {
  try {
    // Busca o primeiro administrador cadastrado no sistema
    const result = await query(`
      SELECT email, nome
      FROM usuarios_table
      WHERE tipo_usuario = 'administrador'
      ORDER BY criado_em ASC
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      return result.rows[0].email;
    }
    
    // Se não houver administrador, usa email de configuração ou retorna null
    return process.env.ADMIN_EMAIL || process.env.EMAIL_USER || null;
  } catch (error) {
    console.error('[MATCH CANCELLATION] Erro ao buscar email do administrador:', error);
    // Retorna email de fallback
    return process.env.ADMIN_EMAIL || process.env.EMAIL_USER || null;
  }
}

/**
 * Solicita o desfazimento de um match
 * Atualiza o match na tabela matches_table e notifica o administrador responsável
 * 
 * @param {Object} data - Dados da solicitação
 * @param {number} data.matchId - ID do match a ser desfeito
 * @param {string} data.justificativa - Justificativa fornecida pelo administrador
 * @param {number} data.adminId - ID do administrador que está solicitando
 * @param {string} data.adminEmail - Email do administrador que está solicitando
 * @param {string} data.adminName - Nome do administrador que está solicitando
 * @returns {Promise<Object>} - Resultado da operação
 */
async function requestMatchCancellation(data) {
  const { matchId, justificativa, adminId, adminEmail, adminName } = data;

  console.log('[MATCH CANCELLATION] ========================================');
  console.log(`[MATCH CANCELLATION] Iniciando solicitação de anulação do match ${matchId}`);
  console.log(`[MATCH CANCELLATION] Administrador: ${adminName} (ID: ${adminId})`);
  console.log('[MATCH CANCELLATION] ========================================');

  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // 1. Valida que o match existe e está ativo
    const matchResult = await client.query(`
      SELECT 
        m.id,
        m.status,
        m.id_usuario_veterano,
        m.id_usuario_calouro,
        u_veterano.nome as veterano_nome,
        u_calouro.nome as calouro_nome
      FROM matches_table m
      LEFT JOIN usuarios_table u_veterano ON m.id_usuario_veterano = u_veterano.id
      LEFT JOIN usuarios_table u_calouro ON m.id_usuario_calouro = u_calouro.id
      WHERE m.id = $1
    `, [matchId]);

    if (matchResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Match não encontrado');
    }

    const match = matchResult.rows[0];

    if (match.status !== 'ativo') {
      await client.query('ROLLBACK');
      throw new Error(`Match não está ativo. Status atual: ${match.status}`);
    }

    // 2. Valida que a justificativa foi fornecida
    if (!justificativa || justificativa.trim().length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Justificativa é obrigatória');
    }

    // 3. Atualiza o match na tabela matches_table
    // Marca a solicitação de anulação, salva a justificativa e muda o status para "cancelado"
    const updateResult = await client.query(`
      UPDATE matches_table
      SET status = 'cancelado',
          solicitacao_anulacao = TRUE,
          justificativa_anulacao = $1,
          atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [justificativa.trim(), matchId]);

    // 5. Atualiza o status_match dos usuários para 'pendente'
    if (match.id_usuario_veterano) {
      await client.query(`
        UPDATE usuarios_table
        SET status_match = 'pendente',
            atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [match.id_usuario_veterano]);
    }

    if (match.id_usuario_calouro) {
      await client.query(`
        UPDATE usuarios_table
        SET status_match = 'pendente',
            atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [match.id_usuario_calouro]);
    }

    await client.query('COMMIT');

    const updatedMatch = updateResult.rows[0];
    console.log(`[MATCH CANCELLATION] ✅ Match ${matchId} cancelado com sucesso`);

    // 4. Envia email ao administrador responsável (de forma assíncrona para não bloquear)
    setImmediate(async () => {
      try {
        const adminEmailToNotify = await getAdminEmail();
        
        if (adminEmailToNotify) {
          const subject = getAdminCancellationRequestSubject();
          const htmlContent = generateAdminCancellationRequestEmail({
            matchId: matchId.toString(),
            adminName: adminName || 'Administrador',
            adminEmail: adminEmail || 'N/A',
            justificativa: justificativa.trim(),
            calouroNome: match.calouro_nome || null,
            veteranoNome: match.veterano_nome || null
          });

          await sendEmail(adminEmailToNotify, subject, htmlContent);
          console.log(`[MATCH CANCELLATION] 📧 Email enviado ao administrador: ${adminEmailToNotify}`);
        } else {
          console.warn('[MATCH CANCELLATION] ⚠️ Não foi possível enviar email: nenhum administrador encontrado');
        }
      } catch (emailError) {
        console.error('[MATCH CANCELLATION] ❌ Erro ao enviar email ao administrador:', emailError);
        // Não interrompe o fluxo se o email falhar
      }
    });

    // 5. Registra log de sucesso
    try {
      await addLogEntry({
        responsible: adminEmail || adminId.toString(),
        action: 'MATCH_CANCELLATION_REQUESTED',
        target: `Match ID: ${matchId}`,
        justification: justificativa.trim(),
        metadata: {
          matchId: matchId,
          adminId: adminId,
          calouroId: match.id_usuario_calouro,
          veteranoId: match.id_usuario_veterano,
          status: 'cancelado',
          success: true
        }
      });
    } catch (logError) {
      console.error('[MATCH CANCELLATION] Erro ao registrar log:', logError);
      // Não interrompe o fluxo se o log falhar
    }

    client.release();

    return {
      success: true,
      message: 'Solicitação de anulação registrada com sucesso.',
      matchId: matchId
    };

  } catch (error) {
    await client.query('ROLLBACK');
    client.release();

    console.error('[MATCH CANCELLATION] ❌ Erro ao solicitar anulação:', error);

    // Registra log de falha
    try {
      await addLogEntry({
        responsible: adminEmail || adminId?.toString() || 'UNKNOWN',
        action: 'MATCH_CANCELLATION_REQUEST_FAILED',
        target: `Match ID: ${matchId || 'N/A'}`,
        justification: `Erro ao solicitar anulação: ${error.message}`,
        metadata: {
          matchId: matchId,
          adminId: adminId,
          error: error.message,
          success: false
        }
      });
    } catch (logError) {
      console.error('[MATCH CANCELLATION] Erro ao registrar log de falha:', logError);
    }

    throw error;
  }
}

/**
 * Busca todos os emails dos administradores
 * @returns {Promise<Array<{email: string, nome: string}>>} - Lista de administradores
 */
async function getAllAdminEmails() {
  try {
    const result = await query(`
      SELECT email, nome
      FROM usuarios_table
      WHERE tipo_usuario = 'administrador'
      ORDER BY criado_em ASC
    `);
    
    return result.rows.map(row => ({
      email: row.email,
      nome: row.nome
    }));
  } catch (error) {
    console.error('[MATCH CANCELLATION] Erro ao buscar emails dos administradores:', error);
    return [];
  }
}

/**
 * Solicita cancelamento de um match (nova versão conforme requisitos)
 * Atualiza o match com status "anulacao_pendente" e envia emails ao solicitante e administradores
 * 
 * @param {Object} data - Dados da solicitação
 * @param {number} data.match_id - ID do match
 * @param {string} data.justificativa - Justificativa da solicitação
 * @param {number} data.usuario_solicitante - ID do usuário que está solicitando
 * @returns {Promise<Object>} - Resultado da operação
 */
async function requestMatchCancellationByUser(data) {
  const { match_id, justificativa, usuario_solicitante } = data;

  console.log('[MATCH CANCELLATION] ========================================');
  console.log(`[MATCH CANCELLATION] Iniciando solicitação de anulação do match ${match_id}`);
  console.log(`[MATCH CANCELLATION] Usuário solicitante: ${usuario_solicitante}`);
  console.log('[MATCH CANCELLATION] ========================================');

  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // 1. Valida que o match existe
    const matchResult = await client.query(`
      SELECT 
        m.id,
        m.status,
        m.id_usuario_veterano,
        m.id_usuario_calouro,
        u_veterano.nome as veterano_nome,
        u_veterano.email as veterano_email,
        u_calouro.nome as calouro_nome,
        u_calouro.email as calouro_email,
        c_veterano.nome as veterano_curso,
        c_calouro.nome as calouro_curso,
        m.data_match
      FROM matches_table m
      LEFT JOIN usuarios_table u_veterano ON m.id_usuario_veterano = u_veterano.id
      LEFT JOIN usuarios_table u_calouro ON m.id_usuario_calouro = u_calouro.id
      LEFT JOIN cursos_table c_veterano ON u_veterano.curso_id = c_veterano.id
      LEFT JOIN cursos_table c_calouro ON u_calouro.curso_id = c_calouro.id
      WHERE m.id = $1
    `, [match_id]);

    if (matchResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Match não encontrado');
    }

    const match = matchResult.rows[0];

    // 2. Valida que o usuário solicitante faz parte do match
    if (match.id_usuario_veterano !== usuario_solicitante && match.id_usuario_calouro !== usuario_solicitante) {
      await client.query('ROLLBACK');
      throw new Error('Usuário não faz parte deste match');
    }

    // 3. Valida que a justificativa foi fornecida
    if (!justificativa || justificativa.trim().length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Justificativa é obrigatória');
    }

    // 4. Busca informações do solicitante
    const solicitanteResult = await client.query(`
      SELECT id, nome, email
      FROM usuarios_table
      WHERE id = $1
    `, [usuario_solicitante]);

    if (solicitanteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Usuário solicitante não encontrado');
    }

    const solicitante = solicitanteResult.rows[0];

    // 5. Atualiza o match na tabela matches_table
    // Define status = "anulacao_pendente", solicitacao_anulacao = true e salva justificativa
    const updateResult = await client.query(`
      UPDATE matches_table
      SET status = 'anulacao_pendente',
          solicitacao_anulacao = TRUE,
          justificativa_anulacao = $1,
          atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [justificativa.trim(), match_id]);

    await client.query('COMMIT');

    const updatedMatch = updateResult.rows[0];
    console.log(`[MATCH CANCELLATION] ✅ Match ${match_id} atualizado para anulacao_pendente`);

    // 6. Prepara informações do match para os emails
    const matchInfo = {
      veteranoNome: match.veterano_nome || null,
      calouroNome: match.calouro_nome || null,
      veteranoCurso: match.veterano_curso || null,
      calouroCurso: match.calouro_curso || null,
      status: updatedMatch.status,
      dataMatch: match.data_match
    };

    // 7. Envia email ao solicitante confirmando a solicitação (de forma assíncrona)
    setImmediate(async () => {
      try {
        if (solicitante.email) {
          const subject = getUserCancellationRequestSubject();
          const htmlContent = generateUserCancellationRequestEmail({
            matchId: match_id.toString(),
            solicitanteNome: solicitante.nome,
            solicitanteEmail: solicitante.email,
            justificativa: justificativa.trim(),
            matchInfo: matchInfo
          });

          await sendEmail(solicitante.email, subject, htmlContent);
          console.log(`[MATCH CANCELLATION] 📧 Email de confirmação enviado ao solicitante: ${solicitante.email}`);
        } else {
          console.warn('[MATCH CANCELLATION] ⚠️ Não foi possível enviar email ao solicitante: email não encontrado');
        }
      } catch (emailError) {
        console.error('[MATCH CANCELLATION] ❌ Erro ao enviar email ao solicitante:', emailError);
        // Não interrompe o fluxo se o email falhar
      }
    });

    // 8. Envia email para todos os administradores (de forma assíncrona)
    setImmediate(async () => {
      try {
        const admins = await getAllAdminEmails();
        
        if (admins.length === 0) {
          console.warn('[MATCH CANCELLATION] ⚠️ Nenhum administrador encontrado para notificar');
          return;
        }

        const subject = getAdminCancellationRequestSubject();
        
        // Envia email para cada administrador
        const emailPromises = admins.map(async (admin) => {
          try {
            const htmlContent = generateAdminCancellationRequestEmail({
              matchId: match_id.toString(),
              adminName: solicitante.nome,
              adminEmail: solicitante.email || 'N/A',
              justificativa: justificativa.trim(),
              calouroNome: match.calouro_nome || null,
              veteranoNome: match.veterano_nome || null
            });

            await sendEmail(admin.email, subject, htmlContent);
            console.log(`[MATCH CANCELLATION] 📧 Email enviado ao administrador: ${admin.email}`);
          } catch (emailError) {
            console.error(`[MATCH CANCELLATION] ❌ Erro ao enviar email ao administrador ${admin.email}:`, emailError);
          }
        });

        await Promise.all(emailPromises);
        console.log(`[MATCH CANCELLATION] 📧 Emails enviados para ${admins.length} administrador(es)`);
      } catch (emailError) {
        console.error('[MATCH CANCELLATION] ❌ Erro ao enviar emails aos administradores:', emailError);
        // Não interrompe o fluxo se o email falhar
      }
    });

    // 9. Registra log de sucesso
    try {
      await addLogEntry({
        responsible: solicitante.email || usuario_solicitante.toString(),
        action: 'MATCH_CANCELLATION_REQUESTED_BY_USER',
        target: `Match ID: ${match_id}`,
        justification: justificativa.trim(),
        metadata: {
          matchId: match_id,
          usuarioSolicitante: usuario_solicitante,
          calouroId: match.id_usuario_calouro,
          veteranoId: match.id_usuario_veterano,
          status: 'anulacao_pendente',
          success: true
        }
      });
    } catch (logError) {
      console.error('[MATCH CANCELLATION] Erro ao registrar log:', logError);
      // Não interrompe o fluxo se o log falhar
    }

    client.release();

    return {
      success: true,
      message: 'Solicitação de anulação registrada com sucesso.',
      matchId: match_id
    };

  } catch (error) {
    await client.query('ROLLBACK');
    client.release();

    console.error('[MATCH CANCELLATION] ❌ Erro ao solicitar anulação:', error);

    // Registra log de falha
    try {
      await addLogEntry({
        responsible: usuario_solicitante?.toString() || 'UNKNOWN',
        action: 'MATCH_CANCELLATION_REQUEST_FAILED',
        target: `Match ID: ${match_id || 'N/A'}`,
        justification: `Erro ao solicitar anulação: ${error.message}`,
        metadata: {
          matchId: match_id,
          usuarioSolicitante: usuario_solicitante,
          error: error.message,
          success: false
        }
      });
    } catch (logError) {
      console.error('[MATCH CANCELLATION] Erro ao registrar log de falha:', logError);
    }

    throw error;
  }
}

module.exports = {
  requestMatchCancellation,
  requestMatchCancellationByUser,
  getAdminEmail,
  getAllAdminEmails
};

