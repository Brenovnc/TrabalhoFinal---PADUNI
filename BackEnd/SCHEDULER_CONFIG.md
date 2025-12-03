# Configuração do Agendamento Automático de Matches

O sistema permite configurar quando os matches serão gerados automaticamente usando expressões **Cron**.

## Como Configurar

### Opção 1: Via arquivo `.env` (Recomendado)

Crie ou edite o arquivo `.env` na pasta `BackEnd/` e adicione:

```env
# Agendamento de matches automáticos (expressão cron)
MATCH_SCHEDULE=0 2 * * *

# Executar match imediatamente ao iniciar o servidor (true/false)
RUN_MATCH_ON_STARTUP=false
```

### Opção 2: Modificar diretamente no `server.js`

Edite o arquivo `BackEnd/server.js` nas linhas 42-43:

```javascript
const matchSchedule = process.env.MATCH_SCHEDULE || '0 2 * * *'; // Altere aqui
const runMatchOnStartup = process.env.RUN_MATCH_ON_STARTUP === 'true';
```

## Expressões Cron - Exemplos

A expressão cron segue o formato: `minuto hora dia mês dia-da-semana`

### Exemplos Comuns:

| Expressão | Descrição |
|-----------|-----------|
| `0 2 * * *` | Todo dia às 2h da manhã (padrão) |
| `0 */6 * * *` | A cada 6 horas |
| `0 0 * * *` | Todo dia à meia-noite |
| `0 9,17 * * *` | Todo dia às 9h e 17h |
| `0 2 * * 1` | Toda segunda-feira às 2h |
| `*/30 * * * *` | A cada 30 minutos |
| `0 0 * * 0` | Todo domingo à meia-noite |
| `0 8-18 * * 1-5` | Das 8h às 18h, apenas dias úteis (seg-sex) |

### Formato Detalhado:

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Dia da semana (0-7, onde 0 e 7 = domingo)
│ │ │ └───── Mês (1-12)
│ │ └─────── Dia do mês (1-31)
│ └───────── Hora (0-23)
└─────────── Minuto (0-59)
```

## Configurações Disponíveis

### 1. MATCH_SCHEDULE
Define quando o match será executado automaticamente.

**Padrão:** `0 2 * * *` (todo dia às 2h da manhã)

**Exemplos:**
- `0 2 * * *` - Todo dia às 2h
- `0 */6 * * *` - A cada 6 horas
- `0 0,12 * * *` - À meia-noite e ao meio-dia
- `0 9 * * 1-5` - Todo dia útil às 9h

### 2. RUN_MATCH_ON_STARTUP
Define se o match deve ser executado imediatamente quando o servidor iniciar.

**Valores:**
- `true` - Executa imediatamente ao iniciar
- `false` - Não executa ao iniciar (padrão)

## Como Testar

1. **Configurar no `.env`:**
   ```env
   MATCH_SCHEDULE=*/5 * * * *
   RUN_MATCH_ON_STARTUP=true
   ```
   Isso executará a cada 5 minutos e também ao iniciar.

2. **Reiniciar o servidor:**
   ```bash
   npm run dev
   ```

3. **Verificar os logs:**
   Você verá mensagens como:
   ```
   [SCHEDULER] ⚙️  Configurando agendamento de match automático
   [SCHEDULER] 📅 Cron: */5 * * * *
   [SCHEDULER] 🚀 Execução imediata: SIM
   ```

## Validação

O sistema valida automaticamente a expressão cron. Se for inválida, você verá um erro no console ao iniciar o servidor.

## Fuso Horário

O scheduler está configurado para usar o fuso horário `America/Sao_Paulo`. Para alterar, edite o arquivo `BackEnd/utils/scheduler.js` na linha 201.

## Desabilitar Agendamento

Para desabilitar o agendamento automático, comente as linhas 41-50 no arquivo `server.js`:

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

