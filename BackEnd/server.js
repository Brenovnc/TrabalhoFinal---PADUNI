const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

module.exports = app;

