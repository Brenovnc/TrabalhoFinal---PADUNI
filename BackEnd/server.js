// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const usersRoutes = require('./routes/users');
const matchesRoutes = require('./routes/matches');
const textSimilarityRoutes = require('./routes/textSimilarity');
app.use('/api/users', usersRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api', textSimilarityRoutes);

// Rota de teste
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend funcionando corretamente!' });
});

// Rota padrão
app.get('/', (req, res) => {
  res.json({ message: 'API Backend está rodando' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Iniciar scheduler de match automático
// Executa diariamente às 2h da manhã (horário de Brasília)
// Pode ser configurado via variável de ambiente MATCH_SCHEDULE
// Exemplo: '0 2 * * *' = todo dia às 2h, '0 */6 * * *' = a cada 6 horas
const { startMatchScheduler } = require('./utils/scheduler');
const matchSchedule = process.env.MATCH_SCHEDULE || '0 2 * * *'; // Padrão: todo dia às 2h
const runMatchOnStartup = process.env.RUN_MATCH_ON_STARTUP === 'true'; // Opcional: executar ao iniciar

try {
  startMatchScheduler(matchSchedule, runMatchOnStartup);
  console.log(`Scheduler de match automático configurado: ${matchSchedule}`);
} catch (error) {
  console.error('Erro ao iniciar scheduler de match:', error);
}

module.exports = app;

