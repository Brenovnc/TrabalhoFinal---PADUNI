const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { runSingleTest } = require('../tests/rfc01');
const { getOrCreateDriver } = require('../helpers/driver');
const { requestCancel, resetCancel } = require('../state');
const { config } = require('../config');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: { origin: '*' }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Expor usuários configurados para popular a UI
app.get('/api/users', (_req, res) => {
	res.json({
		users: {
			calouros: (config.users?.calouros || []).map(u => ({ id: u.id, label: u.label, role: u.role })),
			veteranos: (config.users?.veteranos || []).map(u => ({ id: u.id, label: u.label, role: u.role })),
		},
		defaultStepDelayMs: config.defaultStepDelayMs || 1000
	});
});

// Executa um teste individual por ID (RFS01..RFS06)
app.post('/api/run/:id', async (req, res) => {
	const id = req.params.id;
	const room = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	res.json({ room });

	const logger = (msg) => io.to(room).emit('log', msg);

	io.to(room).emit('start', { id });
	try {
		resetCancel();
		// garante driver inicializado para manter janela única entre execuções
		await getOrCreateDriver();
		const options = {
			stepDelayMs: typeof req.body?.stepDelayMs === 'number' ? req.body.stepDelayMs : undefined,
			userIds: Array.isArray(req.body?.userIds) ? req.body.userIds : undefined,
			suite: req.body?.suite || 'RFC01'
		};
		const result = await runSingleTest(id, logger, options);
		io.to(room).emit('end', result);
	} catch (err) {
		io.to(room).emit('end', { id, ok: false, skipped: false, message: err.message || String(err) });
	}
});

// Parar teste atual (sinaliza cancelamento)
app.post('/api/stop', (req, res) => {
	requestCancel();
	res.json({ ok: true });
});

io.on('connection', (socket) => {
	socket.on('join', (room) => {
		socket.join(room);
	});
});

const PORT = process.env.TEST_UI_PORT || 4000;
server.listen(PORT, () => {
	console.log(`UI de testes ativa em http://localhost:${PORT}`);
});

