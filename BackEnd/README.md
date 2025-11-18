# BackEnd - API Express

API REST desenvolvida com Express.js e PostgreSQL.

## Pré-requisitos

- Node.js instalado
- PostgreSQL instalado e rodando
- Banco de dados criado (execute o script SQL fornecido)

## Instalação

```bash
npm install
```

## Configuração do Banco de Dados

1. Crie o banco de dados PostgreSQL executando o script SQL fornecido (`database_schema.sql`)

2. Crie um arquivo `.env` na pasta `BackEnd/` baseado no `.env.example`:

```bash
cp .env.example .env
```

3. Configure as variáveis de ambiente no arquivo `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=paduni
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui
PORT=3001

# Agendamento de Matches Automáticos (opcional)
MATCH_SCHEDULE=0 2 * * *
RUN_MATCH_ON_STARTUP=false

# API Hugging Face (para comparação de interesses)
HUGGINGFACE_API_KEY=sua_chave_aqui
```

**Nota:** Para mais detalhes sobre configuração do agendamento, consulte `AGENDAMENTO_MATCHES.md`

## Executar

### Modo Produção
```bash
npm start
```

### Modo Desenvolvimento (com hot-reload)
```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3001`

## Rotas Disponíveis

- `GET /` - Rota padrão da API
- `GET /api/test` - Rota de teste para verificar se o backend está funcionando
- `POST /api/users/register` - Cadastrar novo usuário
- `POST /api/users/login` - Fazer login
- `GET /api/users/profile` - Visualizar perfil do usuário autenticado
- `PUT /api/users/profile` - Editar perfil do usuário autenticado
- `POST /api/users/request-mfa-code` - Solicitar código MFA
- `PUT /api/users/change-credentials` - Alterar email ou senha com MFA
- `POST /api/users/request-deletion-code` - Solicitar código de confirmação para exclusão
- `DELETE /api/users/account` - Excluir conta do usuário autenticado
- `POST /api/matches/generate` - Gerar matches baseados em similaridade de interesses
- `GET /api/matches/list` - Listar matches de similaridade
- `POST /api/matches/automatic` - Executar match automático padrinho-apadrinhado
- `GET /api/matches/status` - Status do match
- `POST /api/compare-texts` - Comparar similaridade entre dois textos

## Dependências

- **express**: Framework web para Node.js
- **cors**: Middleware para habilitar CORS
- **pg**: Cliente PostgreSQL para Node.js
- **bcrypt**: Biblioteca para hash de senhas
- **jsonwebtoken**: Biblioteca para criação e verificação de tokens JWT
- **dotenv**: Carregamento de variáveis de ambiente
- **nodemailer**: Envio de emails
- **nodemon** (dev): Ferramenta para reiniciar o servidor automaticamente durante desenvolvimento

## Estrutura do Banco de Dados

O backend utiliza PostgreSQL com as seguintes tabelas principais:

- `cursos_table` - Cursos disponíveis
- `usuarios_table` - Usuários do sistema
- `matches_table` - Vínculos entre usuários
- `mensagens_table` - Mensagens entre usuários
- `agendamentos_ia_table` - Agendamentos de execução da IA
- `logs_acao_critica_table` - Logs de ações críticas

### Nota sobre Foreign Keys e Exclusão de Usuários

O schema foi projetado para permitir **hard delete** de usuários (conforme LGPD), mantendo a integridade dos dados históricos:

- **Foreign keys que referenciam `usuarios_table`**: Usam `ON DELETE SET NULL`
  - Permite deletar usuários mantendo logs, matches, mensagens e agendamentos
  - Os registros históricos são preservados, mas sem referência ao usuário deletado
  
- **Foreign key `curso_id` em `usuarios_table`**: Usa `ON DELETE RESTRICT`
  - Impede deletar um curso se houver usuários usando-o
  - Garante integridade referencial dos cursos

