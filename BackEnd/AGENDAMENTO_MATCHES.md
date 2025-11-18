# 📅 Como Configurar o Agendamento Automático de Matches

O sistema permite configurar quando os matches serão gerados automaticamente usando **expressões Cron**.

## 🚀 Formas de Configurar

### **Opção 1: Via arquivo `.env` (Recomendado)**

1. Crie ou edite o arquivo `.env` na pasta `BackEnd/`
2. Adicione as seguintes variáveis:

```env
# Agendamento de matches automáticos (expressão cron)
MATCH_SCHEDULE=0 2 * * *

# Executar match imediatamente ao iniciar o servidor (true/false)
RUN_MATCH_ON_STARTUP=false
```

### **Opção 2: Modificar diretamente no código**

Edite o arquivo `BackEnd/server.js` nas linhas 42-43:

```javascript
const matchSchedule = process.env.MATCH_SCHEDULE || '0 2 * * *'; // Altere aqui
const runMatchOnStartup = process.env.RUN_MATCH_ON_STARTUP === 'true';
```

## 📋 Exemplos de Expressões Cron

A expressão cron segue o formato: `minuto hora dia mês dia-da-semana`

| Expressão | Descrição |
|-----------|-----------|
| `0 2 * * *` | **Todo dia às 2h da manhã** (padrão) |
| `0 */6 * * *` | A cada 6 horas |
| `0 0 * * *` | Todo dia à meia-noite |
| `0 9,17 * * *` | Todo dia às 9h e 17h |
| `0 2 * * 1` | Toda segunda-feira às 2h |
| `*/30 * * * *` | A cada 30 minutos |
| `0 0 * * 0` | Todo domingo à meia-noite |
| `0 8-18 * * 1-5` | Das 8h às 18h, apenas dias úteis (seg-sex) |
| `0 0 1 * *` | Todo dia 1 de cada mês à meia-noite |

### 📖 Formato Detalhado:

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Dia da semana (0-7, onde 0 e 7 = domingo)
│ │ │ └───── Mês (1-12)
│ │ └─────── Dia do mês (1-31)
│ └───────── Hora (0-23)
└─────────── Minuto (0-59)
```

## ⚙️ Variáveis de Ambiente

### 1. `MATCH_SCHEDULE`
Define **quando** o match será executado automaticamente.

**Padrão:** `0 2 * * *` (todo dia às 2h da manhã)

**Exemplos:**
- `0 2 * * *` - Todo dia às 2h
- `0 */6 * * *` - A cada 6 horas
- `0 0,12 * * *` - À meia-noite e ao meio-dia
- `0 9 * * 1-5` - Todo dia útil às 9h
- `*/15 * * * *` - A cada 15 minutos

### 2. `RUN_MATCH_ON_STARTUP`
Define se o match deve ser executado **imediatamente** quando o servidor iniciar.

**Valores:**
- `true` - Executa imediatamente ao iniciar
- `false` - Não executa ao iniciar (padrão)

## 🧪 Como Testar

### Exemplo 1: Executar a cada 5 minutos (para testes)

No arquivo `.env`:
```env
MATCH_SCHEDULE=*/5 * * * *
RUN_MATCH_ON_STARTUP=true
```

### Exemplo 2: Executar apenas às 9h da manhã

No arquivo `.env`:
```env
MATCH_SCHEDULE=0 9 * * *
RUN_MATCH_ON_STARTUP=false
```

### Exemplo 3: Executar a cada 6 horas

No arquivo `.env`:
```env
MATCH_SCHEDULE=0 */6 * * *
RUN_MATCH_ON_STARTUP=false
```

Depois de configurar, **reinicie o servidor**:
```bash
npm run dev
```

## 📊 Verificar Configuração

Ao iniciar o servidor, você verá logs como:

```
[SCHEDULER] ========================================
[SCHEDULER] ⚙️  Configurando agendamento de match automático
[SCHEDULER] 📅 Cron: 0 2 * * *
[SCHEDULER] 🚀 Execução imediata: NÃO
[SCHEDULER] ========================================
[SCHEDULER] ✅ Agendamento iniciado com sucesso!
```

## 🛑 Desabilitar Agendamento

Para desabilitar completamente o agendamento automático, comente as linhas 41-50 no arquivo `server.js`:

```javascript
// const { startMatchScheduler } = require('./utils/scheduler');
// const matchSchedule = process.env.MATCH_SCHEDULE || '0 2 * * *';
// const runMatchOnStartup = process.env.RUN_MATCH_ON_STARTUP === 'true';
// 
// try {
//   startMatchScheduler(matchSchedule, runMatchOnStartup);
//   console.log(`Scheduler de match automático configurado: ${matchSchedule}`);
// } catch (error) {
//   console.error('Erro ao iniciar scheduler de match:', error);
// }
```

## 🌍 Fuso Horário

O scheduler está configurado para usar o fuso horário **America/Sao_Paulo**. 

Para alterar, edite o arquivo `BackEnd/utils/scheduler.js` na linha 201:
```javascript
timezone: 'America/Sao_Paulo' // Altere aqui
```

## ✅ Validação

O sistema valida automaticamente a expressão cron. Se for inválida, você verá um erro no console ao iniciar o servidor.

## 📝 Resumo Rápido

1. **Crie/edite** o arquivo `.env` na pasta `BackEnd/`
2. **Adicione** as variáveis `MATCH_SCHEDULE` e `RUN_MATCH_ON_STARTUP`
3. **Reinicie** o servidor
4. **Verifique** os logs para confirmar a configuração

## 🎯 Exemplo Completo de `.env`

```env
# Configuração do Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=paduni
DB_USER=postgres
DB_PASSWORD=sua_senha

# Porta do Servidor
PORT=3001

# Agendamento de Matches
MATCH_SCHEDULE=0 2 * * *
RUN_MATCH_ON_STARTUP=false

# API Hugging Face
HUGGINGFACE_API_KEY=sua_chave_aqui
```

