/**
 * Serviço dedicado para notificações de matches
 * Gerencia o envio automático de emails após criação de matches
 * Conforme requisito RFS07: notificação automática sem dados pessoais
 */

const { sendEmail } = require('./emailService');
const { 
  generateMatchNotificationEmail, 
  getMatchNotificationSubject 
} = require('../templates/matchNotificationTemplate');
const { addLogEntry } = require('./criticalActionsLog');

/**
 * Envia notificação de match para um usuário (calouro ou veterano)
 * IMPORTANTE: O email NÃO contém dados pessoais do parceiro
 * 
 * @param {string} email - Email do destinatário
 * @param {string} userType - 'calouro' ou 'veterano'
 * @param {string} userId - ID do usuário (para logs)
 * @returns {Promise<Object>} - Resultado do envio { success: boolean, messageId?: string, error?: string }
 */
async function sendMatchNotificationToUser(email, userType, userId) {
  try {
    // Valida parâmetros
    if (!email || !userType) {
      throw new Error('Email e tipo de usuário são obrigatórios');
    }

    if (userType !== 'calouro' && userType !== 'veterano') {
      throw new Error('Tipo de usuário deve ser "calouro" ou "veterano"');
    }

    // Gera o conteúdo do email usando o template
    const subject = getMatchNotificationSubject(userType);
    const htmlContent = generateMatchNotificationEmail(userType);

    // Envia o email
    const result = await sendEmail(email, subject, htmlContent);

    // Log de sucesso
    console.log(`[MATCH NOTIFICATION] ✅ Email enviado com sucesso para ${userType} (ID: ${userId}, Email: ${email})`);
    
    if (result.messageId) {
      console.log(`[MATCH NOTIFICATION]    Message ID: ${result.messageId}`);
    }

    // Registra log de ação crítica
    try {
      await addLogEntry({
        responsible: 'SYSTEM_MATCH_NOTIFICATION',
        action: 'MATCH_NOTIFICATION_EMAIL_SENT',
        target: `Usuário ${userType} (ID: ${userId})`,
        justification: 'Notificação automática de novo match enviada',
        metadata: {
          email: email,
          userType: userType,
          userId: userId,
          messageId: result.messageId || null,
          success: true
        }
      });
    } catch (logError) {
      console.error('[MATCH NOTIFICATION] Erro ao registrar log:', logError);
      // Não interrompe o fluxo se o log falhar
    }

    return {
      success: true,
      messageId: result.messageId,
      email: email,
      userType: userType
    };

  } catch (error) {
    // Log de erro
    console.error(`[MATCH NOTIFICATION] ❌ Erro ao enviar email para ${userType} (ID: ${userId}, Email: ${email}):`, error.message);
    
    // Registra log de falha
    try {
      await addLogEntry({
        responsible: 'SYSTEM_MATCH_NOTIFICATION',
        action: 'MATCH_NOTIFICATION_EMAIL_FAILED',
        target: `Usuário ${userType} (ID: ${userId})`,
        justification: `Erro ao enviar notificação de match: ${error.message}`,
        metadata: {
          email: email,
          userType: userType,
          userId: userId,
          error: error.message,
          success: false
        }
      });
    } catch (logError) {
      console.error('[MATCH NOTIFICATION] Erro ao registrar log de falha:', logError);
    }

    return {
      success: false,
      error: error.message,
      email: email,
      userType: userType
    };
  }
}

/**
 * Envia notificações para ambos os usuários de um match
 * Esta é a função principal que deve ser chamada após a criação de um match
 * 
 * @param {Object} matchData - Dados do match
 * @param {string} matchData.calouroId - ID do calouro
 * @param {string} matchData.calouroEmail - Email do calouro
 * @param {string} matchData.veteranoId - ID do veterano
 * @param {string} matchData.veteranoEmail - Email do veterano
 * @returns {Promise<Object>} - Resultado do envio { success: boolean, results: Object }
 */
async function notifyMatchCreated(matchData) {
  const { calouroId, calouroEmail, veteranoId, veteranoEmail } = matchData;

  console.log('[MATCH NOTIFICATION] ========================================');
  console.log('[MATCH NOTIFICATION] Iniciando envio de notificações de match');
  console.log(`[MATCH NOTIFICATION] Calouro ID: ${calouroId}, Email: ${calouroEmail}`);
  console.log(`[MATCH NOTIFICATION] Veterano ID: ${veteranoId}, Email: ${veteranoEmail}`);
  console.log('[MATCH NOTIFICATION] ========================================');

  // Valida dados
  if (!calouroId || !calouroEmail || !veteranoId || !veteranoEmail) {
    const errorMsg = 'Dados incompletos para envio de notificações';
    console.error(`[MATCH NOTIFICATION] ❌ ${errorMsg}`);
    return {
      success: false,
      error: errorMsg,
      results: {
        calouro: { success: false, error: errorMsg },
        veterano: { success: false, error: errorMsg }
      }
    };
  }

  // Envia notificações para ambos os usuários
  const results = {
    calouro: null,
    veterano: null
  };

  // Envia para o calouro
  try {
    results.calouro = await sendMatchNotificationToUser(calouroEmail, 'calouro', calouroId);
  } catch (error) {
    console.error('[MATCH NOTIFICATION] Erro ao enviar notificação para calouro:', error);
    results.calouro = {
      success: false,
      error: error.message,
      email: calouroEmail,
      userType: 'calouro'
    };
  }

  // Envia para o veterano
  try {
    results.veterano = await sendMatchNotificationToUser(veteranoEmail, 'veterano', veteranoId);
  } catch (error) {
    console.error('[MATCH NOTIFICATION] Erro ao enviar notificação para veterano:', error);
    results.veterano = {
      success: false,
      error: error.message,
      email: veteranoEmail,
      userType: 'veterano'
    };
  }

  // Determina sucesso geral (ambos devem ter sido enviados)
  const overallSuccess = results.calouro.success && results.veterano.success;

  console.log('[MATCH NOTIFICATION] ========================================');
  console.log(`[MATCH NOTIFICATION] Resultado geral: ${overallSuccess ? '✅ SUCESSO' : '⚠️ PARCIAL'}`);
  console.log(`[MATCH NOTIFICATION] Calouro: ${results.calouro.success ? '✅' : '❌'}`);
  console.log(`[MATCH NOTIFICATION] Veterano: ${results.veterano.success ? '✅' : '❌'}`);
  console.log('[MATCH NOTIFICATION] ========================================');

  return {
    success: overallSuccess,
    results: results
  };
}

module.exports = {
  sendMatchNotificationToUser,
  notifyMatchCreated
};

