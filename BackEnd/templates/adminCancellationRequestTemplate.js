/**
 * Template de email para notificação de solicitação de anulação de match
 * Enviado ao administrador responsável pelo gerenciamento do sistema
 */

/**
 * Gera o conteúdo HTML do email de notificação para administrador
 * @param {Object} data - Dados da solicitação
 * @param {number} data.matchId - ID do match
 * @param {string} data.adminName - Nome do administrador que solicitou
 * @param {string} data.adminEmail - Email do administrador que solicitou
 * @param {string} data.justificativa - Justificativa da solicitação
 * @param {string} data.calouroNome - Nome do calouro (opcional)
 * @param {string} data.veteranoNome - Nome do veterano (opcional)
 * @returns {string} - HTML do email
 */
function generateAdminCancellationRequestEmail(data) {
  const { matchId, adminName, adminEmail, justificativa, calouroNome, veteranoNome } = data;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const adminPanelUrl = `${frontendUrl}/admin`; // URL do painel administrativo

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nova Solicitação de Anulação de Match - PADUNI</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background-color: #e74c3c; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px;">⚠️ Nova Solicitação de Anulação</h1>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                    Uma nova solicitação de anulação de match foi registrada no sistema PADUNI.
                  </p>
                  
                  <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 30px 0; border-radius: 4px;">
                    <p style="margin: 0 0 10px 0; font-size: 16px; color: #856404; font-weight: bold;">
                      Detalhes da Solicitação:
                    </p>
                    <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px; color: #856404; line-height: 1.8;">
                      <li><strong>ID do Match:</strong> ${matchId}</li>
                      <li><strong>Solicitado por:</strong> ${adminName} (${adminEmail})</li>
                      ${calouroNome ? `<li><strong>Calouro:</strong> ${calouroNome}</li>` : ''}
                      ${veteranoNome ? `<li><strong>Veterano:</strong> ${veteranoNome}</li>` : ''}
                    </ul>
                  </div>
                  
                  <div style="background-color: #f8f9fa; border-left: 4px solid #6c757d; padding: 20px; margin: 30px 0; border-radius: 4px;">
                    <p style="margin: 0 0 10px 0; font-size: 16px; color: #333333; font-weight: bold;">
                      Justificativa:
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6; white-space: pre-wrap;">
                      ${justificativa}
                    </p>
                  </div>
                  
                  <p style="margin: 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                    <strong>Ação requerida:</strong> Acesse o painel administrativo para revisar e aprovar ou rejeitar esta solicitação.
                  </p>
                  
                  <!-- Button -->
                  <table role="presentation" style="width: 100%; margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${adminPanelUrl}" 
                           style="display: inline-block; background-color: #19528d; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                          Acessar Painel Administrativo
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 30px 0 0 0; font-size: 14px; color: #666666; line-height: 1.6;">
                    <strong>Observação:</strong> O status dos usuários envolvidos no match foi alterado para "pendente" até que a solicitação seja revisada.
                  </p>
                  
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
                  <p style="margin: 0 0 10px 0; font-size: 12px; color: #999999;">
                    Este é um email automático, não responda.
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #999999;">
                    © ${new Date().getFullYear()} PADUNI - Sistema de Padrinho Universitário
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Retorna o assunto do email
 * @returns {string} - Assunto do email
 */
function getAdminCancellationRequestSubject() {
  return '⚠️ Nova Solicitação de Anulação de Match - PADUNI';
}

module.exports = {
  generateAdminCancellationRequestEmail,
  getAdminCancellationRequestSubject
};

