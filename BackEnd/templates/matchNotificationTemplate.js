/**
 * Template de email para notificação de novo match
 * IMPORTANTE: Este template NÃO contém dados pessoais do parceiro
 * conforme requisito de privacidade (RFS07)
 */

/**
 * Gera o conteúdo HTML do email de notificação de match
 * @param {string} userType - 'calouro' ou 'veterano'
 * @returns {string} - HTML do email
 */
function generateMatchNotificationEmail(userType) {
  const isCalouro = userType === 'calouro';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Match Realizado - PADUNI</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background-color: #19528d; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🎉 Match Realizado!</h1>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                    Olá!
                  </p>
                  
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                    ${isCalouro 
                      ? 'Parabéns! Você foi vinculado(a) a um veterano que poderá te ajudar em sua jornada acadêmica.'
                      : 'Parabéns! Você foi vinculado(a) a um calouro que poderá receber sua orientação e apoio.'
                    }
                  </p>
                  
                  <div style="background-color: #f0f7ff; border-left: 4px solid #19528d; padding: 20px; margin: 30px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 16px; color: #19528d; line-height: 1.6;">
                      <strong>${isCalouro ? 'Seu padrinho foi encontrado!' : 'Seu apadrinhado foi encontrado!'}</strong>
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #666666; line-height: 1.6;">
                      Faça login na plataforma PADUNI para visualizar os detalhes do match e entrar em contato.
                    </p>
                  </div>
                  
                  <p style="margin: 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                    ${isCalouro 
                      ? 'Através da plataforma, você poderá receber orientações, dicas sobre o curso e todo o apoio necessário para sua adaptação à universidade.'
                      : 'Através da plataforma, você poderá oferecer orientações, compartilhar experiências e ajudar seu apadrinhado em sua adaptação à universidade.'
                    }
                  </p>
                  
                  <!-- Button -->
                  <table role="presentation" style="width: 100%; margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${frontendUrl}/login" 
                           style="display: inline-block; background-color: #19528d; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                          Acessar Plataforma
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 30px 0 0 0; font-size: 14px; color: #666666; line-height: 1.6;">
                    <strong>Próximos passos:</strong>
                  </p>
                  <ol style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px; color: #666666; line-height: 1.8;">
                    <li>Faça login na plataforma PADUNI</li>
                    <li>Acesse a seção de Matches para visualizar os detalhes</li>
                    <li>Entre em contato com ${isCalouro ? 'seu padrinho' : 'seu apadrinhado'} através da plataforma</li>
                  </ol>
                  
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
 * Retorna o assunto do email baseado no tipo de usuário
 * @param {string} userType - 'calouro' ou 'veterano'
 * @returns {string} - Assunto do email
 */
function getMatchNotificationSubject(userType) {
  return '🎉 Match Realizado - PADUNI';
}

module.exports = {
  generateMatchNotificationEmail,
  getMatchNotificationSubject
};

