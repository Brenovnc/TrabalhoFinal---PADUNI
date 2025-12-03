// Email service for sending MFA codes using Nodemailer
const nodemailer = require('nodemailer');

// Configuração do transporter de email
// Suporta variáveis de ambiente ou modo de desenvolvimento (mock)
function createTransporter() {
  // Verifica se as variáveis de ambiente estão configuradas

  const emailHost = process.env.EMAIL_HOST;
  const emailPort = process.env.EMAIL_PORT || 587;
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  const emailFrom = process.env.EMAIL_FROM || emailUser || 'noreply@paduni.com';
  const emailSecure = process.env.EMAIL_SECURE === 'true';

  // Se não houver usuário ou senha, usa modo de desenvolvimento (mock)
  if (!emailUser || !emailPassword) {
    return null; // Retorna null para usar modo mock
  }

  // Configuração do transporter
  // Para Gmail, usa service ao invés de host (detecta pelo email do usuário)
  const isGmail = emailUser.includes('@gmail.com') || emailUser.includes('@googlemail.com');
  
  if (isGmail) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword // Use App Password do Gmail (não a senha normal)
      }
    });
    return transporter;
  }

  // Para outros provedores, usa configuração SMTP genérica
  // EMAIL_HOST é obrigatório para provedores não-Gmail
  if (!emailHost) {
    console.warn('⚠️ EMAIL_HOST não configurado. Para provedores não-Gmail, configure EMAIL_HOST no .env');
    return null; // Retorna null para usar modo mock
  }

  const transporter = nodemailer.createTransport({
    host: emailHost,
    port: parseInt(emailPort),
    secure: emailSecure, // true para 465, false para outras portas
    auth: {
      user: emailUser,
      pass: emailPassword
    },
    // Configurações adicionais para melhor compatibilidade
    tls: {
      rejectUnauthorized: false // Apenas para desenvolvimento/testes
    }
  });

  console.log('transporter :>> ', transporter);
  return transporter;
}

async function sendEmail(to, subject, htmlContent) {
  const transporter = createTransporter();
  
  // Extract code from HTML content for easier debugging
  const codeMatch = htmlContent.match(/(\d{6})/);
  const extractedCode = codeMatch ? codeMatch[1] : 'N/A';

  // Se não houver transporter configurado, usa modo mock (desenvolvimento)
  if (!transporter) {
    console.log('Transporter not configured');  

    return Promise.resolve({
      success: true,
      message: 'Email sent (mock)',
      code: extractedCode
    });
  }

  // Envia email real usando nodemailer
  try {
    const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@paduni.com';
    
    const mailOptions = {
      from: `"PADUNI" <${emailFrom}>`,
      to: to,
      subject: subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('📧 Email enviado com sucesso!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    
    return {
      success: true,
      message: 'Email enviado com sucesso',
      messageId: info.messageId,
      code: extractedCode
    };
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    throw new Error(`Erro ao enviar email: ${error.message}`);
  }
}

function sendMFACode(email, code) {
  const subject = 'Código de Verificação - PADUNI';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #19528d;">Código de Verificação</h2>
      <p>Você solicitou uma alteração em sua conta PADUNI.</p>
      <p>Seu código de verificação é:</p>
      <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #19528d; margin: 20px 0; border-radius: 8px; letter-spacing: 5px;">
        ${code}
      </div>
      <p style="color: #666; font-size: 14px;">Este código expira em 5 minutos.</p>
      <p style="color: #666; font-size: 14px;">Se você não solicitou esta alteração, ignore este email.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">Este é um email automático, não responda.</p>
    </div>
  `;
  
  const result = sendEmail(email, subject, htmlContent);
  return result.then(res => ({ ...res, code }));
}

function sendAccountDeletionCode(email, code) {
  const subject = '⚠️ Confirmação de Exclusão de Conta - PADUNI';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #e74c3c;">⚠️ Confirmação de Exclusão de Conta</h2>
      <p style="color: #c0392b; font-weight: bold;">ATENÇÃO: Esta é uma ação IRREVERSÍVEL!</p>
      <p>Você solicitou a exclusão permanente de sua conta PADUNI.</p>
      <p>Seu código de confirmação é:</p>
      <div style="background: #fee; border: 2px solid #e74c3c; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #e74c3c; margin: 20px 0; border-radius: 8px; letter-spacing: 5px;">
        ${code}
      </div>
      <p style="color: #666; font-size: 14px;"><strong>Este código expira em 5 minutos.</strong></p>
      <p style="color: #c0392b; font-size: 14px; font-weight: bold;">⚠️ Se você não solicitou esta exclusão, ignore este email imediatamente.</p>
      <p style="color: #666; font-size: 14px;">Ao confirmar a exclusão, todos os seus dados serão permanentemente removidos do sistema, em conformidade com a LGPD.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">Este é um email automático, não responda.</p>
    </div>
  `;
  
  const result = sendEmail(email, subject, htmlContent);
  return result.then(res => ({ ...res, code }));
}

/**
 * @deprecated Esta função está depreciada. Use matchNotificationService.notifyMatchCreated() ao invés.
 * Esta função foi mantida apenas para compatibilidade com código legado.
 * A nova implementação não envia dados pessoais do parceiro.
 * 
 * Envia notificação de match para calouro ou veterano
 * NOTA: Esta versão não envia dados pessoais do parceiro (conforme RFS07)
 * 
 * @param {string} email - Email do destinatário
 * @param {string} userType - 'calouro' ou 'veterano'
 * @returns {Promise<Object>} - Resultado do envio
 */
async function sendMatchNotification(email, userType) {
  // Importa dinamicamente para evitar dependência circular
  const { sendMatchNotificationToUser } = require('./matchNotificationService');
  
  console.warn('[EMAIL SERVICE] sendMatchNotification está depreciada. Use matchNotificationService.notifyMatchCreated()');
  
  // Usa o novo serviço de notificação (sem dados pessoais)
  return sendMatchNotificationToUser(email, userType, 'unknown');
}

module.exports = {
  sendEmail,
  sendMFACode,
  sendAccountDeletionCode,
  sendMatchNotification
};

