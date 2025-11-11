const { runRfc01Suite } = require('./tests/rfc01');

async function main() {
	console.log('Iniciando suíte de testes: RFC01 - Manter Usuário');
	const results = await runRfc01Suite();

	console.log('\nResumo RFC01');
	console.log('============');
	let passed = 0;
	let failed = 0;
	let skipped = 0;
	results.forEach(r => {
		const status = r.skipped ? 'SKIPPED' : (r.ok ? 'OK' : 'FAIL');
		if (r.skipped) skipped++;
		else if (r.ok) passed++;
		else failed++;
		console.log(`- ${r.id}: ${status}${r.message ? ` - ${r.message}` : ''}`);
	});

	console.log('\nTotais:');
	console.log(`- Passou: ${passed}`);
	console.log(`- Falhou: ${failed}`);
	console.log(`- Ignorado: ${skipped}`);

	// Exit with non-zero on failures
	if (failed > 0) {
		process.exitCode = 1;
	}
}

if (require.main === module) {
	main().catch(err => {
		console.error('Erro inesperado na suíte:', err);
		process.exit(1);
	});
}

module.exports = { main };

