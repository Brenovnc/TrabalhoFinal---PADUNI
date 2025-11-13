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

module.exports = {
  requestMatchCancellation,
  getAdminEmail
};

