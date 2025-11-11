const { By, until } = require('selenium-webdriver');
const { getOrCreateDriver, maybeQuitDriver, sleep } = require('../helpers/driver');
const { config } = require('../config');
const {
	state,
	registerUser,
	getRegisteredUser,
	clearUser
} = require('../state');

const SELECTORS = {
	login: {
		email: '#email',
		password: '#password',
		submit: 'button[type="submit"]'
	},
	register: {
		fullName: '#fullName',
		email: '#email',
		password: '#password',
		confirmPassword: '#confirmPassword',
		yearOfBirth: '#yearOfBirth',
		gender: '#gender',
		course: '#course',
		yearOfEntry: '#yearOfEntry',
		interests: '#interests',
		submit: 'button[type="submit"]',
		successMessage: '.success-message, .toast-success'
	},
	home: {
		profileButton: '.profile-button',
		logoutButton: '.logout-button'
	},
	profile: {
		container: '.profile-card',
		editButton: '.edit-button',
		changeCredentialsButton: '.change-credentials-button',
		deleteAccountButton: '.delete-account-button'
	},
	editProfile: {
		container: '.profile-edit-card',
		fullName: '#fullName, input[name="fullName"]',
		yearOfBirth: '#yearOfBirth, select[name="yearOfBirth"]',
		gender: '#gender, select[name="gender"]',
		course: '#course, select[name="course"]',
		yearOfEntry: '#yearOfEntry, select[name="yearOfEntry"]',
		interests: '#interests, textarea[name="interests"]',
		currentPassword: '#currentPassword, input[name="currentPassword"]',
		submit: '.profile-edit-form .submit-button',
		successToast: '.success-message'
	},
	changeCredentials: {
		container: '.change-credentials-card',
		requestButton: '.change-credentials-card .request-code-button',
		debugCode: '.change-credentials-card .debug-code .code-display code, .change-credentials-card .field-hint code',
		currentPassword: '#currentPassword',
		mfaCode: '#mfaCode',
		newEmail: '#newEmail',
		newPassword: '#newPassword',
		confirmPassword: '#confirmPassword',
		submit: '.change-credentials-form .submit-button',
		successToast: '.success-message'
	},
	deleteAccount: {
		container: '.delete-account-card',
		requestButton: '.delete-account-card .request-code-button',
		debugCode: '.delete-account-card .debug-code .code-display code, .delete-account-card .field-hint code',
		currentPassword: '#currentPassword',
		confirmationCode: '#confirmationCode',
		confirmText: '#confirmText',
		submit: '.delete-account-form .delete-button',
		successToast: '.success-message'
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

async function waitVisible(driver, selector, timeout = config.timeouts.element) {
	const element = await driver.wait(until.elementLocated(By.css(selector)), timeout);
	await driver.wait(until.elementIsVisible(element), timeout);
	await delay();
	return element;
}

async function waitVisibleXPath(driver, xpath, timeout = config.timeouts.element) {
	const element = await driver.wait(until.elementLocated(By.xpath(xpath)), timeout);
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

async function selectByValue(driver, selector, value) {
	const element = await driver.findElement(By.css(selector));
	await element.click();
	await element.sendKeys(value);
	await delay();
	return element;
}

async function clickLinkByText(driver, options) {
	for (const text of options) {
		const element = await driver.findElements(By.xpath(`//a[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${text.toLowerCase()}")] | //button[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${text.toLowerCase()}")]`));
		if (element.length) {
			await clickEl(element[0]);
			return true;
		}
	}
	return false;
}

function withDelayLogger(logger) {
	return async (message) => {
		await logger(message);
		await delay();
	};
}

function allUserDefs() {
	const calouros = config.users?.calouros || [];
	const veteranos = config.users?.veteranos || [];
	return [...calouros, ...veteranos];
}

function getUserDefsByIds(ids = []) {
	if (!ids || ids.length === 0) return [];
	const set = new Set(ids);
	return allUserDefs().filter((u) => set.has(u.id));
}

function generateEmail(def, index = 0) {
	if (def.emailPrefix) {
		return `${def.emailPrefix}${Date.now() + index}${def.emailDomain || '@teste.com'}`;
	}
	if (def.email) return def.email;
	return `${def.id}.${Date.now() + index}@paduni.test`;
}

function getLoginCredentials(def) {
	const stored = getRegisteredUser(def.id);
	if (stored) {
		return stored;
	}
	if (def.email && def.credentials?.password) {
		return { email: def.email, password: def.credentials.password };
	}
	return null;
}

function resolveCandidates(options = {}, allowMultiple = false) {
	const selected = getUserDefsByIds(options.userIds);
	if (allowMultiple && selected.length > 0) {
		return selected;
	}
	if (!allowMultiple && selected.length > 0) {
		return [selected[0]];
	}
	return allowMultiple ? allUserDefs() : [allUserDefs()[0]].filter(Boolean);
}

async function ensureLoginPage(driver, log) {
	await driver.get(config.baseUrl);
	await driver.wait(until.elementLocated(By.css('body')), config.timeouts.page);
	await delay();

	// Se estiver logado, clicar em "Sair"
	const logoutButtons = await driver.findElements(By.xpath("//button[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'sair')]"));
	if (logoutButtons.length > 0) {
		await log('Usuário autenticado detectado. Clicando em "Sair".');
		await clickEl(logoutButtons[0]);
	}

	// Garantir que estamos na tela de login
	try {
		await waitVisible(driver, SELECTORS.login.email, config.timeouts.page);
	} catch (err) {
		const clicked = await clickLinkByText(driver, ['login', 'entrar']);
		if (!clicked) {
			throw err;
		}
		await waitVisible(driver, SELECTORS.login.email, config.timeouts.page);
	}
}

async function loginAs(driver, log, def) {
	const credentials = getLoginCredentials(def);
	if (!credentials) {
		throw new Error(`Nenhuma credencial encontrada para ${def.label}. Execute RFS01 para cadastrar`);
	}
	await ensureLoginPage(driver, log);
	await log(`Realizando login como ${def.label}`);

	await fill(await waitVisible(driver, SELECTORS.login.email), credentials.email);
	await fill(await waitVisible(driver, SELECTORS.login.password), credentials.password);
	await clickEl(await waitVisible(driver, SELECTORS.login.submit));

	await waitVisible(driver, SELECTORS.home.profileButton, config.timeouts.page);
	return credentials;
}

async function goToProfile(driver, log) {
	await log('Abrindo "Ver Meu Perfil"');
	await clickEl(await waitVisible(driver, SELECTORS.home.profileButton));
	await waitVisible(driver, SELECTORS.profile.container, config.timeouts.page);
}

async function requestDebugCode(driver, buttonSelector, codeSelector, log, logMessage) {
	await clickEl(await waitVisible(driver, buttonSelector));
	await log(logMessage);
	
	// Aguardar um pouco para o código aparecer
	await delay();
	
	// Tentar múltiplos seletores para encontrar o código MFA
	const selectors = codeSelector.split(', ').map(s => s.trim());
	let codeElement = null;
	let code = null;
	
	for (const sel of selectors) {
		try {
			codeElement = await driver.wait(until.elementLocated(By.css(sel)), config.timeouts.element);
			await driver.wait(until.elementIsVisible(codeElement), config.timeouts.element);
			code = await codeElement.getText();
			if (code && code.trim().length > 0) {
				break;
			}
		} catch (err) {
			// Tentar próximo seletor
			continue;
		}
	}
	
	if (!code || code.trim().length === 0) {
		throw new Error('Código MFA não encontrado na página');
	}
	
	return code.trim();
}

async function testRfs01_register(logger = () => {}, externalDriver = null, options = {}) {
	const log = withDelayLogger(async (msg) => logger(msg));
	const driver = externalDriver || await getOrCreateDriver();
	const ownedDriver = !externalDriver;
	const result = { id: 'RFS01', ok: false, skipped: false, message: '' };

	try {
		await ensureLoginPage(driver, log);
		const users = resolveCandidates(options, true);
		if (!users.length) {
			result.skipped = true;
			result.message = 'Nenhum usuário configurado para cadastro.';
			return result;
		}

		const created = [];
		for (let i = 0; i < users.length; i += 1) {
			const def = users[i];
			const email = generateEmail(def, i);

			await log(`Navegando para cadastro (${def.label})`);
			const opened = await clickLinkByText(driver, ['cadastre-se', 'cadastro', 'register', 'criar conta']);
			if (!opened) {
				result.skipped = true;
				result.message = 'Link de cadastro não encontrado.';
				return result;
			}
			await waitVisible(driver, SELECTORS.register.fullName, config.timeouts.page);

			await log(`Preenchendo formulário de ${def.label}`);
			await fill(await waitVisible(driver, SELECTORS.register.fullName), def.profile.fullName);
			await fill(await waitVisible(driver, SELECTORS.register.email), email);
			await fill(await waitVisible(driver, SELECTORS.register.password), def.credentials.password);
			await fill(await waitVisible(driver, SELECTORS.register.confirmPassword), def.credentials.password);

			await selectByValue(driver, SELECTORS.register.yearOfBirth, def.profile.yearOfBirth);
			await selectByValue(driver, SELECTORS.register.gender, def.profile.gender);
			await selectByValue(driver, SELECTORS.register.course, def.profile.course);
			await selectByValue(driver, SELECTORS.register.yearOfEntry, def.profile.yearOfEntry);
			await fill(await waitVisible(driver, SELECTORS.register.interests), def.profile.interests);

			await log('Enviando cadastro');
			await clickEl(await waitVisible(driver, SELECTORS.register.submit));
			await waitVisible(driver, SELECTORS.register.successMessage, config.timeouts.page);

			registerUser(def.id, { email, password: def.credentials.password });
			created.push(def.label);

			// Após cada cadastro, voltar à tela de login
			await ensureLoginPage(driver, log);
		}

		result.ok = true;
		result.message = `Usuários cadastrados: ${created.join(', ')}`;
		return result;
	} catch (error) {
		result.message = error && error.message ? error.message : String(error);
		return result;
	} finally {
		if (ownedDriver) await maybeQuitDriver();
	}
}

async function testRfs02_login(logger = () => {}, externalDriver = null, options = {}) {
	const log = withDelayLogger(async (msg) => logger(msg));
	const driver = externalDriver || await getOrCreateDriver();
	const ownedDriver = !externalDriver;
	const result = { id: 'RFS02', ok: false, skipped: false, message: '' };

	try {
		const candidates = resolveCandidates(options, false);
		if (!candidates.length) {
			result.skipped = true;
			result.message = 'Nenhum usuário configurado.';
			return result;
		}
		const def = candidates[0];
		await loginAs(driver, log, def);
		result.ok = true;
		result.message = `Login efetuado (${def.label})`;
		return result;
	} catch (error) {
		result.message = error && error.message ? error.message : String(error);
		return result;
	} finally {
		if (ownedDriver) await maybeQuitDriver();
	}
}

async function testRfs03_viewProfile(logger = () => {}, externalDriver = null, options = {}) {
	const log = withDelayLogger(async (msg) => logger(msg));
	const driver = externalDriver || await getOrCreateDriver();
	const ownedDriver = !externalDriver;
	const result = { id: 'RFS03', ok: false, skipped: false, message: '' };

	try {
		const candidates = resolveCandidates(options, false);
		if (!candidates.length) {
			result.skipped = true;
			result.message = 'Nenhum usuário configurado.';
			return result;
		}
		const def = candidates[0];
		await loginAs(driver, log, def);
		await goToProfile(driver, log);
		result.ok = true;
		result.message = `Perfil exibido (${def.label})`;
		return result;
	} catch (error) {
		result.message = error && error.message ? error.message : String(error);
		return result;
	} finally {
		if (ownedDriver) await maybeQuitDriver();
	}
}

async function testRfs04_editProfile(logger = () => {}, externalDriver = null, options = {}) {
	const log = withDelayLogger(async (msg) => logger(msg));
	const driver = externalDriver || await getOrCreateDriver();
	const ownedDriver = !externalDriver;
	const result = { id: 'RFS04', ok: false, skipped: false, message: '' };

	try {
		const candidates = resolveCandidates(options, false);
		if (!candidates.length) {
			result.skipped = true;
			result.message = 'Nenhum usuário configurado.';
			return result;
		}
		const def = candidates[0];
		const credentials = await loginAs(driver, log, def);
		await goToProfile(driver, log);

		await log('Abrindo editor de perfil');
		await clickEl(await waitVisible(driver, SELECTORS.profile.editButton));
		await waitVisible(driver, SELECTORS.editProfile.container, config.timeouts.page);

		await log('Atualizando informações do perfil');
		await fill(await waitVisible(driver, SELECTORS.editProfile.fullName), `${def.profile.fullName} Atualizado`);
		await selectByValue(driver, SELECTORS.editProfile.gender, def.profile.gender);
		await selectByValue(driver, SELECTORS.editProfile.course, def.profile.course);
		await selectByValue(driver, SELECTORS.editProfile.yearOfEntry, def.profile.yearOfEntry);
		await fill(await waitVisible(driver, SELECTORS.editProfile.interests), `${def.profile.interests}; edição automatizada`);
		await fill(await waitVisible(driver, SELECTORS.editProfile.currentPassword), credentials.password);

		await clickEl(await waitVisible(driver, SELECTORS.editProfile.submit));
		await waitVisible(driver, SELECTORS.editProfile.successToast, config.timeouts.page);
		result.ok = true;
		result.message = `Perfil atualizado (${def.label})`;
		return result;
	} catch (error) {
		result.message = error && error.message ? error.message : String(error);
		return result;
	} finally {
		if (ownedDriver) await maybeQuitDriver();
	}
}

async function testRfs05_changeEmailOrPassword(logger = () => {}, externalDriver = null, options = {}) {
	const log = withDelayLogger(async (msg) => logger(msg));
	const driver = externalDriver || await getOrCreateDriver();
	const ownedDriver = !externalDriver;
	const result = { id: 'RFS05', ok: false, skipped: false, message: '' };

	try {
		const candidates = resolveCandidates(options, false);
		if (!candidates.length) {
			result.skipped = true;
			result.message = 'Nenhum usuário configurado.';
			return result;
		}
		const def = candidates[0];
		const credentials = await loginAs(driver, log, def);
		await goToProfile(driver, log);

		await log('Abrindo alteração de credenciais');
		await clickEl(await waitVisible(driver, SELECTORS.profile.changeCredentialsButton));
		await waitVisible(driver, SELECTORS.changeCredentials.container, config.timeouts.page);

		await log('Solicitando código MFA');
		const code = await requestDebugCode(driver, SELECTORS.changeCredentials.requestButton, SELECTORS.changeCredentials.debugCode, log, 'Código MFA solicitado');
		await waitVisible(driver, SELECTORS.changeCredentials.currentPassword, config.timeouts.page);

		await fill(await waitVisible(driver, SELECTORS.changeCredentials.currentPassword), credentials.password);
		await fill(await waitVisible(driver, SELECTORS.changeCredentials.mfaCode), code);

		const newPassword = def.credentials.newPassword || `${credentials.password}!Nova1`;
		await fill(await waitVisible(driver, SELECTORS.changeCredentials.newPassword), newPassword);
		await fill(await waitVisible(driver, SELECTORS.changeCredentials.confirmPassword), newPassword);

		await clickEl(await waitVisible(driver, SELECTORS.changeCredentials.submit));
		await waitVisible(driver, SELECTORS.changeCredentials.successToast, config.timeouts.page);

		// Após sucesso, o sistema redireciona para login
		await waitVisible(driver, SELECTORS.login.email, config.timeouts.page);
		registerUser(def.id, { email: credentials.email, password: newPassword });

		result.ok = true;
		result.message = `Senha alterada (${def.label})`;
		return result;
	} catch (error) {
		result.message = error && error.message ? error.message : String(error);
		return result;
	} finally {
		if (ownedDriver) await maybeQuitDriver();
	}
}

async function testRfs06_deleteAccount(logger = () => {}, externalDriver = null, options = {}) {
	const log = withDelayLogger(async (msg) => logger(msg));
	const driver = externalDriver || await getOrCreateDriver();
	const ownedDriver = !externalDriver;
	const result = { id: 'RFS06', ok: false, skipped: false, message: '' };

	try {
		const candidates = resolveCandidates(options, false);
		if (!candidates.length) {
			result.skipped = true;
			result.message = 'Nenhum usuário configurado.';
			return result;
		}
		const def = candidates[0];
		const credentials = await loginAs(driver, log, def);
		await goToProfile(driver, log);

		await log('Abrindo exclusão de conta');
		await clickEl(await waitVisible(driver, SELECTORS.profile.deleteAccountButton));
		await waitVisible(driver, SELECTORS.deleteAccount.container, config.timeouts.page);

		await log('Solicitando código de confirmação');
		const code = await requestDebugCode(driver, SELECTORS.deleteAccount.requestButton, SELECTORS.deleteAccount.debugCode, log, 'Código de confirmação solicitado');
		await waitVisible(driver, SELECTORS.deleteAccount.currentPassword, config.timeouts.page);

		await fill(await waitVisible(driver, SELECTORS.deleteAccount.currentPassword), credentials.password);
		await fill(await waitVisible(driver, SELECTORS.deleteAccount.confirmationCode), code);
		await fill(await waitVisible(driver, SELECTORS.deleteAccount.confirmText), 'EXCLUIR');

		await clickEl(await waitVisible(driver, SELECTORS.deleteAccount.submit));
		await waitVisible(driver, SELECTORS.deleteAccount.successToast, config.timeouts.page);
		await waitVisible(driver, SELECTORS.login.email, config.timeouts.page);
		clearUser(def.id);

		result.ok = true;
		result.message = `Conta excluída (${def.label})`;
		return result;
	} catch (error) {
		result.message = error && error.message ? error.message : String(error);
		return result;
	} finally {
		if (ownedDriver) await maybeQuitDriver();
	}
}

const TESTS = {
	RFS01: testRfs01_register,
	RFS02: testRfs02_login,
	RFS03: testRfs03_viewProfile,
	RFS04: testRfs04_editProfile,
	RFS05: testRfs05_changeEmailOrPassword,
	RFS06: testRfs06_deleteAccount
};

async function runRfc01Suite(logger = () => {}, options = {}) {
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
	runRfc01Suite,
	runSingleTest
};

