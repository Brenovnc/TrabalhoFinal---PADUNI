const { Builder } = require('selenium-webdriver');
const { config } = require('../config');

let singletonDriver = null;

async function buildDriver(browser = process.env.BROWSER || 'chrome') {
	return await new Builder().forBrowser(browser).build();
}

async function getOrCreateDriver() {
	if (singletonDriver) return singletonDriver;
	singletonDriver = await buildDriver();
	return singletonDriver;
}

async function maybeQuitDriver() {
	if (!singletonDriver) return;
	if (config.keepBrowserOpen) return; // manter aberto para visualização contínua
	await singletonDriver.quit();
	singletonDriver = null;
}

function sleep(ms) {
	return new Promise(r => setTimeout(r, ms));
}

module.exports = { buildDriver, getOrCreateDriver, maybeQuitDriver, sleep };

