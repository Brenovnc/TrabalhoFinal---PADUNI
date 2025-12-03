# Projeto Trabalho Final - PADUNI

Sistema de padrinho universitário desenvolvido para a Unifei (Universidade Federal de Itajubá).

Projeto dividido em três partes principais:

## Estrutura do Projeto

- **FrontEnd**: Aplicação React
- **BackEnd**: API Express
- **TesteSelenium**: Testes automatizados com Selenium

## Funcionalidades Implementadas

### RFC01 - Manter Usuário

#### RFS01 - Cadastrar Usuário ✅

Funcionalidade de cadastro de usuários implementada com:

- **Validações completas:**
  - Campos obrigatórios
  - Validação de email
  - Validação de força de senha (mínimo 8 caracteres, letra e número)
  - Idade mínima de 16 anos
  - Verificação de unicidade de email

- **Persistência:**
  - Dados armazenados em arquivo JSON (`BackEnd/data/users.json`)
  - Senhas criptografadas com bcrypt

- **Interface:**
  - Formulário responsivo (mobile-first)
  - Cores principais: #19528d (primária) e #f7cc46 (secundária)
  - Validação em tempo real
  - Mensagens de erro e sucesso

- **Campos do formulário:**
  - Nome completo *
  - Email *
  - Senha *
  - Confirmar Senha *
  - Ano de Nascimento *
  - Gênero *
  - Curso *
  - Ano de Ingresso *
  - Interesses * (múltipla escolha)

O sistema determina automaticamente se o usuário é "veterano" ou "calouro" baseado no ano de ingresso.

## Configuração de Email (Nodemailer)

O sistema usa **Nodemailer** para envio de emails reais. Por padrão, funciona em modo mock (desenvolvimento), onde os emails são apenas logados no console.

### Modo Mock (Padrão - Desenvolvimento)

Sem configuração adicional, os códigos MFA são enviados de duas formas:

1. **Console do Backend**: O código aparece destacado no console do servidor quando você solicita
2. **Interface do Frontend**: O código também é exibido na tela em uma caixa destacada

### Modo Produção (Envio Real de Emails)

Para enviar emails reais, configure as variáveis de ambiente no arquivo `BackEnd/.env`:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu-email@gmail.com
EMAIL_PASSWORD=sua-app-password
EMAIL_FROM=seu-email@gmail.com
EMAIL_SECURE=false
```

**Para Gmail:** Você precisa criar uma **App Password** (não use a senha normal). Veja instruções completas em `BackEnd/EMAIL_CONFIG.md`.

**Suporta:**
- Gmail (detecção automática - não precisa configurar EMAIL_HOST)
- Outlook/Hotmail (detecção automática - não precisa configurar EMAIL_HOST)
- SMTP genérico (requer EMAIL_HOST configurado)

Veja `BackEnd/EMAIL_CONFIG.md` para instruções detalhadas de configuração.

## Como executar

**⚠️ IMPORTANTE:** Ambos os servidores (FrontEnd e BackEnd) devem estar rodando simultaneamente para que a aplicação funcione corretamente!

### Iniciando o projeto completo

Você precisa abrir **2 terminais** separados:

#### Terminal 1 - BackEnd (Execute primeiro)

```bash
cd BackEnd
npm install
npm start
```

O BackEnd estará disponível em `http://localhost:3001`

Você deve ver a mensagem: `Servidor rodando na porta 3001`

#### Terminal 2 - FrontEnd (Execute depois)

```bash
cd FrontEnd
npm install
npm start
```

O FrontEnd estará disponível em `http://localhost:3000`

Agora acesse `http://localhost:3000` no navegador e você deve ver a mensagem do backend!

### TesteSelenium

```bash
cd TesteSelenium
npm install
npm test
```

## Desenvolvimento

Para desenvolvimento com hot-reload no BackEnd (usando nodemon):

```bash
cd BackEnd
npm install  # Instala dependências incluindo dotenv
npm run dev  # Inicia o servidor com nodemon (reinicia automaticamente ao salvar arquivos)
```

**Nodemon configurado:**
- Monitora mudanças em arquivos `.js` e `.json` nas pastas `routes`, `utils`, `middleware` e `server.js`
- Reinicia automaticamente o servidor quando detecta mudanças
- Carrega variáveis de ambiente do arquivo `.env` automaticamente
- Ignora arquivos em `node_modules`, `data/*.json` e logs

**Variáveis de ambiente:**
- Crie um arquivo `.env` na pasta `BackEnd/` para configurar variáveis de ambiente
- O `dotenv` carrega automaticamente as variáveis do arquivo `.env`
- Veja `BackEnd/EMAIL_CONFIG.md` para configuração de email

