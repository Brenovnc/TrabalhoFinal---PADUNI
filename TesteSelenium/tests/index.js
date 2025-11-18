const rfc01 = require('./rfc01');
const rfc02 = require('./rfc02');

const suites = {
	RFC01: rfc01,
	RFC02: rfc02
};

const TEST_TO_SUITE = {
	RFS01: 'RFC01',
	RFS02: 'RFC01',
	RFS03: 'RFC01',
	RFS04: 'RFC01',
	RFS05: 'RFC01',
	RFS06: 'RFC01',
	RFS07: 'RFC02',
	RFS08: 'RFC02',
	RFS09: 'RFC02'
};

function resolveSuite(id, preferredSuite) {
	if (preferredSuite && suites[preferredSuite]) {
		return preferredSuite;
	}
	if (TEST_TO_SUITE[id]) {
		return TEST_TO_SUITE[id];
	}
	return 'RFC01';
}

async function runSingleTest(id, logger = () => {}, options = {}) {
	const suiteName = resolveSuite(id, options.suite);
	const suite = suites[suiteName];
	if (!suite || typeof suite.runSingleTest !== 'function') {
		throw new Error(`Suite não encontrada para o teste ${id}`);
	}
	return suite.runSingleTest(id, logger, options);
}

module.exports = {
	runSingleTest,
	runRfc01Suite: rfc01.runRfc01Suite,
	runRfc02Suite: rfc02.runRfc02Suite,
	suites
};



