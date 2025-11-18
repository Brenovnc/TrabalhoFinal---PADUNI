const { By, until } = require('selenium-webdriver');
const { config } = require('../config');
const { getOrCreateDriver, maybeQuitDriver, sleep } = require('../helpers/driver');
const { state, getRegisteredUser } = require('../state');

const SELECTORS = {
	login: {
		email: '#email',
		password: '#password',
		submit: 'button[type="submit"]'
	},
	home: {
		container: '.home-card',
		generateMatches: '.generate-matches-button',
		listMatches: '.list-matches-button',
		matchesTable: '.matches-table',
		matchesRows: '.matches-table tbody tr',
		noMatchesMessage: '.no-matches-message',
		manageMatches: '.matches-table-button'
	},
	matchModal: {
		overlay: '.modal-overlay',
		closeButton: '.modal-close'
	},
	matches: {
		container: '.matches-table-container',
		tableRows: '.matches-table tbody tr',
		cancelButton: '.cancel-button',
		cancelModal: '.modal-content',
		justificationField: '#justificativa',
		confirmButton: '.modal-button-confirm'
	}
};

function ensureNotCancelled() {
	if (state.cancelRequested) {
		throw new Error('Teste cancelado pelo usuário');
	}
}

async function delay() {
	if (config.stepDelayMs > 0) {
		await sleep(config.stepDelayMs);
	}
	ensureNotCancelled();
}

function withDelayLogger(logger) {
	return async (message) => {
		await logger(message);
		await delay();
	};
}

async function waitVisible(driver, selector, timeout = config.timeouts.element) {
	const element = await driver.wait(until.elementLocated(By.css(selector)), timeout);
	await driver.wait(until.elementIsVisible(element), timeout);
	await delay();
	return element;
}

async function clickEl(element) {
	await element.click();
	await delay();
}

async function fill(element, value) {
	await element.clear();
	await element.sendKeys(value);
	await delay();
}

function allUserDefs() {
	const vets = config.users?.veteranos || [];
	return vets;
}

function getUserDefsByIds(ids = []) {
	if (!ids || ids.length === 0) return [];
	const set = new Set(ids);
	return [...(config.users?.calouros || []), ...(config.users?.veteranos || []), ...(config.users?.administradores || [])].filter((u) =>
		set.has(u.id)
	);
}

function resolveVeteranoAdm(options = {}) {
	const selected = getUserDefsByIds(options.userIds);
	const selectedVeteran = selected.find((u) => u.role === 'veterano');
	if (selectedVeteran) return selectedVeteran;

	const vets = allUserDefs();
	const adm = vets.find((u) => u.id === 'veteranoADM');
	return adm || vets[0];
}

function getLoginCredentials(def) {
	const stored = getRegisteredUser(def.id);
	if (stored?.email && stored?.password) {
		return stored;
	}
	if (def.email && def.credentials?.password) {
		return { email: def.email, password: def.credentials.password };
	}
	return null;
}

async function clickLinkByText(driver, options) {
	for (const text of options) {
		const elements = await driver.findElements(
			By.xpath(
				`//a[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${text.toLowerCase()}")] | //button[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${text.toLowerCase()}")]`
			)
		);
		if (elements.length) {
			await clickEl(elements[0]);
			return true;
		}
	}
	return false;
}

async function ensureLoginPage(driver) {
	await driver.get(config.baseUrl);
	await driver.wait(until.elementLocated(By.css('body')), config.timeouts.page);
	await delay();

	const logoutButtons = await driver.findElements(By.xpath("//button[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'sair')]"));
	if (logoutButtons.length > 0) {
		await clickEl(logoutButtons[0]);
	}

	try {
		await waitVisible(driver, SELECTORS.login.email, config.timeouts.page);
	} catch (err) {
		const clicked = await clickLinkByText(driver, ['login', 'entrar']);
		if (!clicked) throw err;
		await waitVisible(driver, SELECTORS.login.email, config.timeouts.page);
	}
}

async function loginAs(driver, log, def) {
	const credentials = getLoginCredentials(def);
	if (!credentials) {
		throw new Error(`Nenhuma credencial encontrada para ${def.label}. Execute RFS01 para cadastrá-lo.`);
	}

	await ensureLoginPage(driver);
	await log(`Realizando login como ${def.label}`);
	await fill(await waitVisible(driver, SELECTORS.login.email), credentials.email);
	await fill(await waitVisible(driver, SELECTORS.login.password), credentials.password);
	await clickEl(await waitVisible(driver, SELECTORS.login.submit));
	await waitVisible(driver, SELECTORS.home.container, config.timeouts.page);
	return credentials;
}

async function handleAlertIfPresent(driver, log, context) {
	try {
		await driver.wait(until.alertIsPresent(), 5000);
		const alert = await driver.switchTo().alert();
		const text = await alert.getText();
		await log(`Popup exibido (${context}): ${text}`);
		await alert.accept();
		await delay();
	} catch (err) {
		// Sem alert, seguir normalmente
	}
}

async function ensureMatchesList(driver) {
	await driver.wait(async () => {
		const hasTable = (await driver.findElements(By.css(SELECTORS.home.matchesTable))).length > 0;
		const hasEmpty = (await driver.findElements(By.css(SELECTORS.home.noMatchesMessage))).length > 0;
		return hasTable || hasEmpty;
	}, config.timeouts.page);
	await delay();
}

async function navigateToMatchesPage(driver) {
	await waitVisible(driver, SELECTORS.matches.container, config.timeouts.page);
	await delay();
}

async function waitForMatchRows(driver) {
	await driver
		.wait(async () => {
			const rows = await driver.findElements(By.css(SELECTORS.matches.tableRows));
			return rows.length > 0;
		}, config.timeouts.page)
		.catch(() => {});
	await delay();
}

async function cancelAllMatches(driver, log) {
	let cancelled = 0;

	while (true) {
		const rows = await driver.findElements(By.css(SELECTORS.matches.tableRows));
		if (!rows.length) break;

		let targetButton = null;
		for (const row of rows) {
			const buttons = await row.findElements(By.css(SELECTORS.matches.cancelButton));
			if (!buttons.length) continue;
			const button = buttons[0];
			if (await button.isEnabled()) {
				targetButton = button;
				break;
			}
		}

		if (!targetButton) break;

		cancelled += 1;
		await log(`Cancelando match ${cancelled}`);
		await clickEl(targetButton);
		const modal = await waitVisible(driver, SELECTORS.matches.cancelModal, config.timeouts.page);
		await fill(await waitVisible(driver, SELECTORS.matches.justificationField), `Cancelamento automatizado ${cancelled}`);
		await clickEl(await waitVisible(driver, SELECTORS.matches.confirmButton));
		await driver.wait(until.stalenessOf(modal), config.timeouts.page).catch(() => {});
		await delay();
	}

	await log(cancelled ? `Total de matches cancelados: ${cancelled}` : 'Nenhum match disponível para cancelamento.');
	return cancelled;
}

async function closeMatchModalIfPresent(driver, log) {
	const overlays = await driver.findElements(By.css(SELECTORS.matchModal.overlay));
	if (!overlays.length) return;

	const overlay = overlays[0];
	await log('Modal de match encontrado. Fechando antes de listar.');

	const closeButtons = await driver.findElements(By.css(SELECTORS.matchModal.closeButton));
	if (closeButtons.length > 0) {
		await clickEl(closeButtons[0]);
	} else {
		await clickEl(overlay);
	}

	try {
		await driver.wait(until.stalenessOf(overlay), config.timeouts.page);
	} catch (err) {
		// overlay pode ser reusado; seguir mesmo assim
	}
	await delay();
}

async function testRfs07_automaticMatch(logger = () => {}, externalDriver = null, options = {}) {
	const log = withDelayLogger(logger);
	const driver = externalDriver || (await getOrCreateDriver());
	const ownedDriver = !externalDriver;
	const result = { id: 'RFS07', ok: false, skipped: false, message: '' };

	try {
		const def = resolveVeteranoAdm(options);
		if (!def) {
			result.skipped = true;
			result.message = 'Nenhum veterano configurado para executar o match.';
			return result;
		}

		await loginAs(driver, log, def);
		await log('Clicando em "Gerar Matches"');
		await clickEl(await waitVisible(driver, SELECTORS.home.generateMatches));
		await handleAlertIfPresent(driver, log, 'Geração de matches');
		await closeMatchModalIfPresent(driver, log);

		await log('Listando matches disponíveis');
		await clickEl(await waitVisible(driver, SELECTORS.home.listMatches));
		await ensureMatchesList(driver);

		result.ok = true;
		result.message = 'Matches gerados e listados via interface.';
		return result;
	} catch (error) {
		result.message = error?.message || String(error);
		return result;
	} finally {
		if (ownedDriver) await maybeQuitDriver();
	}
}

async function testRfs08_matchNotification(logger = () => {}) {
	const log = withDelayLogger(logger);
	const result = { id: 'RFS08', ok: false, skipped: true, message: 'Automático do sistema no RFS07' };
	await log('RFS08 é automático e depende da execução do RFS07. Nenhuma ação manual.');
	return result;
}

async function testRfs09_cancelMatch(logger = () => {}, externalDriver = null, options = {}) {
	const log = withDelayLogger(logger);
	const driver = externalDriver || (await getOrCreateDriver());
	const ownedDriver = !externalDriver;
	const result = { id: 'RFS09', ok: false, skipped: false, message: '' };

	try {
		const def = resolveVeteranoAdm(options);
		if (!def) {
			result.skipped = true;
			result.message = 'Nenhum veterano configurado para gerenciar matches.';
			return result;
		}

		await loginAs(driver, log, def);
		await log('Abrindo tela de gerenciamento de matches');
		await clickEl(await waitVisible(driver, SELECTORS.home.manageMatches));
		await navigateToMatchesPage(driver);
		await waitForMatchRows(driver);
		const cancelled = await cancelAllMatches(driver, log);

		result.ok = true;
		result.message = cancelled ? `Matches cancelados: ${cancelled}` : 'Nenhum match para cancelar.';
		return result;
	} catch (error) {
		result.message = error?.message || String(error);
		return result;
	} finally {
		if (ownedDriver) await maybeQuitDriver();
	}
}

const TESTS = {
	RFS07: testRfs07_automaticMatch,
	RFS08: testRfs08_matchNotification,
	RFS09: testRfs09_cancelMatch
};

async function runRfc02Suite(logger = () => {}, options = {}) {
	const results = [];
	for (const id of Object.keys(TESTS)) {
		const res = await runSingleTest(id, (msg) => logger(`[${id}] ${msg}`), options);
		results.push(res);
	}
	return results;
}

async function runSingleTest(id, logger = () => {}, options = {}) {
	const testFn = TESTS[id];
	if (!testFn) throw new Error(`Teste não encontrado: ${id}`);
	const prevDelay = config.stepDelayMs;
	if (typeof options.stepDelayMs === 'number' && options.stepDelayMs >= 0) {
		config.stepDelayMs = options.stepDelayMs;
	}
	try {
		return await testFn(logger, null, options);
	} finally {
		config.stepDelayMs = prevDelay;
	}
}

module.exports = {
	runRfc02Suite,
	runSingleTest
};
