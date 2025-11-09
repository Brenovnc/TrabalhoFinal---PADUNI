# Configuração de Email com Nodemailer

Este projeto usa **Nodemailer** para envio de emails reais. O sistema suporta dois modos:

1. **Modo Mock (Desenvolvimento)**: Se as variáveis de ambiente não estiverem configuradas, os emails são apenas logados no console
2. **Modo Produção**: Com as variáveis configuradas, os emails são enviados realmente

## Variáveis de Ambiente Necessárias

Crie um arquivo `.env` na pasta `BackEnd/` com as seguintes variáveis:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=d2023010066@unifei.edu.br
EMAIL_PASSWORD=sua-app-password
EMAIL_FROM=seu-email@gmail.com
EMAIL_SECURE=false
```

## Configuração por Provedor

### Gmail

Para usar Gmail, você precisa criar uma **App Password** (não use a senha normal):

1. Acesse sua conta Google: https://myaccount.google.com/
2. Vá em **Segurança** → **Verificação em duas etapas** (precisa estar ativada)
3. Role até **Senhas de app** e crie uma nova
4. Use essa senha no `EMAIL_PASSWORD`

**Configuração:**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu-email@gmail.com
EMAIL_PASSWORD=sua-app-password-aqui
EMAIL_FROM=seu-email@gmail.com
EMAIL_SECURE=false
```

**Nota:** O sistema detecta automaticamente Gmail e usa `service: 'gmail'` ao invés de configuração SMTP genérica. Você não precisa configurar `EMAIL_HOST` para Gmail.

### Outlook/Hotmail

O sistema detecta automaticamente emails Hotmail/Outlook e configura o SMTP automaticamente.

**Configuração mínima necessária:**
```env
EMAIL_USER=seu-email@hotmail.com
EMAIL_PASSWORD=sua-senha
EMAIL_FROM=seu-email@hotmail.com
```

**Suporta automaticamente:**
- `@hotmail.com` / `@hotmail.com.br`
- `@outlook.com` / `@outlook.com.br`
- `@live.com`
- `@msn.com`

**Nota:** O sistema configura automaticamente:
- Host: `smtp-mail.outlook.com`
- Porta: `587`
- Secure: `false`
- TLS com configurações específicas para Outlook/Hotmail

Você não precisa configurar `EMAIL_HOST` ou `EMAIL_PORT` para Hotmail/Outlook - o sistema detecta e configura automaticamente!

### SMTP Genérico

Para outros provedores de email (como provedores corporativos):

```env
EMAIL_HOST=smtp.seu-provedor.com
EMAIL_PORT=587
EMAIL_USER=seu-email@dominio.com
EMAIL_PASSWORD=sua-senha
EMAIL_FROM=seu-email@dominio.com
EMAIL_SECURE=false
```

**Para porta SSL (465):**
```env
EMAIL_PORT=465
EMAIL_SECURE=true
```

## Modo de Desenvolvimento (Mock)

Se você **não configurar** as variáveis de ambiente, o sistema automaticamente usa o modo mock:

- Os emails são **logados no console** do servidor
- O código de verificação aparece destacado no console
- Útil para desenvolvimento sem precisar configurar email real

## Testando a Configuração

Após configurar as variáveis de ambiente:

1. Reinicie o servidor backend
2. Solicite um código MFA através da interface
3. Verifique se o email foi recebido
4. Verifique os logs do console para confirmar o envio

## Troubleshooting

### Erro: "Invalid login"
- Verifique se `EMAIL_USER` e `EMAIL_PASSWORD` estão corretos
- Para Gmail, certifique-se de usar App Password, não a senha normal

### Erro: "Connection timeout"
- Verifique se `EMAIL_HOST` e `EMAIL_PORT` estão corretos
- Verifique se o firewall não está bloqueando a porta

### Erro: "Self signed certificate"
- O código já tem `rejectUnauthorized: false` para desenvolvimento
- Em produção, configure certificados SSL adequados

## Segurança

⚠️ **IMPORTANTE:**
- Nunca commite o arquivo `.env` no Git
- Use variáveis de ambiente em produção
- Para Gmail, sempre use App Passwords, nunca a senha normal
- Em produção, considere usar serviços especializados (SendGrid, AWS SES, etc.)

