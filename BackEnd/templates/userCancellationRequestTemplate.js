/**
 * Template de email para confirmação de solicitação de anulação de match
 * Enviado ao usuário que solicitou a anulação
 */

/**
 * Gera o conteúdo HTML do email de confirmação para o solicitante
 * @param {Object} data - Dados da solicitação
 * @param {number} data.matchId - ID do match
 * @param {string} data.solicitanteNome - Nome do solicitante
 * @param {string} data.solicitanteEmail - Email do solicitante
 * @param {string} data.justificativa - Justificativa da solicitação
 * @param {Object} data.matchInfo - Informações completas do match
 * @param {string} data.matchInfo.veteranoNome - Nome do veterano
 * @param {string} data.matchInfo.calouroNome - Nome do calouro
 * @param {string} data.matchInfo.veteranoCurso - Curso do veterano
 * @param {string} data.matchInfo.calouroCurso - Curso do calouro
 * @param {string} data.matchInfo.status - Status do match
 * @param {string} data.matchInfo.dataMatch - Data do match
 * @returns {string} - HTML do email
 */
function generateUserCancellationRequestEmail(data) {
  const { matchId, solicitanteNome, solicitanteEmail, justificativa, matchInfo } = data;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmação de Solicitação de Anulação - PADUNI</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background-color: #19528d; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px;">✓ Solicitação de Anulação Recebida</h1>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                    Olá, <strong>${solicitanteNome}</strong>!
                  </p>
                  
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                    Recebemos sua solicitação de anulação de match. Sua solicitação foi registrada e está sendo analisada pela equipe administrativa.
                  </p>
                  
                  <div style="background-color: #e7f3ff; border-left: 4px solid #19528d; padding: 20px; margin: 30px 0; border-radius: 4px;">
                    <p style="margin: 0 0 10px 0; font-size: 16px; color: #19528d; font-weight: bold;">
                      Informações da Solicitação:
                    </p>
                    <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px; color: #333333; line-height: 1.8;">
                      <li><strong>ID do Match:</strong> ${matchId}</li>
                      <li><strong>Solicitante:</strong> ${solicitanteNome} (${solicitanteEmail})</li>
                      <li><strong>Status Atual:</strong> Anulação Pendente</li>
                    </ul>
                  </div>
                  
                  <div style="background-color: #f8f9fa; border-left: 4px solid #6c757d; padding: 20px; margin: 30px 0; border-radius: 4px;">
                    <p style="margin: 0 0 10px 0; font-size: 16px; color: #333333; font-weight: bold;">
                      Informações do Match:
                    </p>
                    <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px; color: #666666; line-height: 1.8;">
                      ${matchInfo.veteranoNome ? `<li><strong>Veterano:</strong> ${matchInfo.veteranoNome}${matchInfo.veteranoCurso ? ` (${matchInfo.veteranoCurso})` : ''}</li>` : ''}
                      ${matchInfo.calouroNome ? `<li><strong>Calouro:</strong> ${matchInfo.calouroNome}${matchInfo.calouroCurso ? ` (${matchInfo.calouroCurso})` : ''}</li>` : ''}
                      <li><strong>Data do Match:</strong> ${matchInfo.dataMatch ? new Date(matchInfo.dataMatch).toLocaleDateString('pt-BR') : 'N/A'}</li>
                      <li><strong>Status:</strong> ${matchInfo.status}</li>
                    </ul>
                  </div>
                  
                  <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 30px 0; border-radius: 4px;">
                    <p style="margin: 0 0 10px 0; font-size: 16px; color: #856404; font-weight: bold;">
                      Justificativa Enviada:
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #856404; line-height: 1.6; white-space: pre-wrap;">
                      ${justificativa}
                    </p>
                  </div>
                  
                  <p style="margin: 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                    <strong>Próximos passos:</strong> A equipe administrativa irá revisar sua solicitação e entrará em contato em breve. O status do match foi alterado para "anulação pendente" até que a solicitação seja revisada.
                  </p>
                  
                  <p style="margin: 30px 0 0 0; font-size: 14px; color: #666666; line-height: 1.6;">
                    Se você não solicitou esta anulação, entre em contato conosco imediatamente.
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
function getUserCancellationRequestSubject() {
  return '✓ Confirmação de Solicitação de Anulação de Match - PADUNI';
}

module.exports = {
  generateUserCancellationRequestEmail,
  getUserCancellationRequestSubject
};

