// Estado simples em memória para compartilhar informações entre testes na mesma execução
// Não persiste entre processos

const state = {
	cancelRequested: false,
	passwordChanged: new Set(),
	registeredUsers: new Map()
};

function requestCancel() {
	state.cancelRequested = true;
}

function resetCancel() {
	state.cancelRequested = false;
}

function registerUser(userId, info) {
	state.registeredUsers.set(userId, { ...info });
	state.passwordChanged.delete(userId);
}

function getRegisteredUser(userId) {
	return state.registeredUsers.get(userId);
}

function markPasswordChanged(userId, newPassword) {
	const entry = state.registeredUsers.get(userId) || {};
	entry.password = newPassword;
	state.registeredUsers.set(userId, entry);
	state.passwordChanged.add(userId);
}

function clearUser(userId) {
	state.registeredUsers.delete(userId);
	state.passwordChanged.delete(userId);
}

function hasPasswordChanged(userId) {
	return state.passwordChanged.has(userId);
}

module.exports = {
	state,
	requestCancel,
	resetCancel,
	registerUser,
	getRegisteredUser,
	markPasswordChanged,
	clearUser,
	hasPasswordChanged
};

