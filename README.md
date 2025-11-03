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

Para desenvolvimento com hot-reload no BackEnd:

```bash
cd BackEnd
npm run dev
```

