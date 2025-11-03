// Email service for sending MFA codes
// This is a mock implementation for development
// In production, integrate with a real email service (SendGrid, SES, etc.)

function sendEmail(to, subject, htmlContent) {
  // Mock email service - in development, just log to console
  // In production, replace with actual email service API call
  
  console.log('='.repeat(60));
  console.log('📧 EMAIL SENT (Mock Service)');
  console.log('='.repeat(60));
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('-'.repeat(60));
  console.log(htmlContent);
  console.log('='.repeat(60));
  
  // In production, you would do something like:
  // return sendGrid.send({
  //   to: to,
  //   from: 'noreply@paduni.com',
  //   subject: subject,
  //   html: htmlContent
  // });
  
  // For now, return a promise that resolves immediately
  return Promise.resolve({
    success: true,
    message: 'Email sent (mock)'
  });
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
  
  return sendEmail(email, subject, htmlContent);
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
  
  return sendEmail(email, subject, htmlContent);
}

module.exports = {
  sendEmail,
  sendMFACode,
  sendAccountDeletionCode
};

