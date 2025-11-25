// Configurações editáveis diretamente neste arquivo

const DEFAULT_STEP_DELAY_MS = 1000;
const DEFAULT_API_BASE_URL = 'http://localhost:3001/api';
const DEFAULT_API_TIMEOUT = 15000;

const config = {
	baseUrl: 'http://localhost:3000',
	apiBaseUrl: DEFAULT_API_BASE_URL,
	apiTimeoutMs: DEFAULT_API_TIMEOUT,
	timeouts: {
		page: 10000,
		element: 8000,
		api: DEFAULT_API_TIMEOUT
	},
	stepDelayMs: DEFAULT_STEP_DELAY_MS,
	defaultStepDelayMs: DEFAULT_STEP_DELAY_MS,
	keepBrowserOpen: true,
	users: {
		administradores: [
			{
				id: 'ADMIN01',
				label: 'Administrador 01',
				role: 'administrador',
				emailPrefix: 'administrador01',
				emailDomain: '@teste.com',
				credentials: {
					password: 'Senha@Forte123',
					currentPassword: 'Senha@Forte123',
					newPassword: 'NovaSenha@Forte123'
				},
				profile: {
					fullName: 'Administrador 01',
					yearOfBirth: '2002',
					gender: 'Masculino',
					course: 'Engenharia de Software',
					yearOfEntry: '2020',
					interests: 'Engenharia de Software, Tecnologias, IA'
				}
			}
		],
		calouros: [
			{
				id: 'calouroMatch01',
				label: 'Calouro Match 01',
				role: 'calouro',
				emailPrefix: 'calouro.match01',
				emailDomain: '@teste.com',
				credentials: {
					password: 'Senha@Forte123',
					currentPassword: 'Senha@Forte123',
					newPassword: 'NovaSenha@Forte123'
				},
				profile: {
					fullName: 'Calouro Match 01',
					yearOfBirth: '2006',
					gender: 'Masculino',
					course: 'Engenharia de Computação',
					yearOfEntry: '2025',
					interests: 'Mentorias iniciais; Integração acadêmica; Tecnologia aplicada'
				}
			},
			{
				id: 'calouroMatch02',
				label: 'Calouro Match 02',
				role: 'calouro',
				emailPrefix: 'calouro.match02',
				emailDomain: '@teste.com',
				credentials: {
					password: 'Senha@Forte123',
					currentPassword: 'Senha@Forte123',
					newPassword: 'NovaSenha@Forte123'
				},
				profile: {
					fullName: 'Calouro Match 02',
					yearOfBirth: '2005',
					gender: 'Feminino',
					course: 'Engenharia de Computação',
					yearOfEntry: '2025',
					interests: 'Robótica; Programação; Inteligência Artificial'
				}
			},
			{
				id: 'calouroMatch03',
				label: 'Calouro Match 03',
				role: 'calouro',
				emailPrefix: 'calouro.match03',
				emailDomain: '@teste.com',
				credentials: {
					password: 'Senha@Forte123',
					currentPassword: 'Senha@Forte123',
					newPassword: 'NovaSenha@Forte123'
				},
				profile: {
					fullName: 'Calouro Match 03',
					yearOfBirth: '2005',
					gender: 'Masculino',
					course: 'Engenharia de Computação',
					yearOfEntry: '2025',
					interests: 'Jogos Digitais; Comunidades Estudantis; Tecnologia'
				}
			},
			{
				id: 'calouro01',
				label: 'Calouro 01',
				role: 'calouro',
				emailPrefix: 'calouro01',
				emailDomain: '@teste.com',
				credentials: {
					password: 'Senha@Forte123',
					currentPassword: 'Senha@Forte123',
					newPassword: 'NovaSenha@Forte123'
				},
				profile: {
					fullName: 'Calouro Teste 01',
					yearOfBirth: '2005',
					gender: 'Masculino',
					course: 'Engenharia de Computação',
					yearOfEntry: '2025',
					interests: 'Mentorias iniciais; Integração acadêmica; Tecnologia aplicada'
				}
			},
			{
				id: 'calouro02',
				label: 'Calouro 02',
				role: 'calouro',
				emailPrefix: 'calouro02',
				emailDomain: '@teste.com',
				credentials: {
					password: 'Senha@Forte123',
					currentPassword: 'Senha@Forte123',
					newPassword: 'NovaSenha@Forte123'
				},
				profile: {
					fullName: 'Calouro Teste 02',
					yearOfBirth: '2004',
					gender: 'Feminino',
					course: 'Engenharia de Computação',
					yearOfEntry: '2025',
					interests: 'Voluntariado; Música; Integração Acadêmica'
				}
			},
			{
				id: 'calouro03',
				label: 'Calouro 03',
				role: 'calouro',
				emailPrefix: 'calouro03',
				emailDomain: '@teste.com',
				credentials: {
					password: 'Senha@Forte123',
					currentPassword: 'Senha@Forte123',
					newPassword: 'NovaSenha@Forte123'
				},
				profile: {
					fullName: 'Calouro Teste 03',
					yearOfBirth: '2005',
					gender: 'Masculino',
					course: 'Engenharia de Computação',
					yearOfEntry: '2025',
					interests: 'Jogos Digitais; Comunidades Estudantis; Tecnologia'
				}
			}
		],
		veteranos: [
			{
				id: 'veteranoMatch01',
				label: 'Veterano Match 01',
				role: 'veterano',
				emailPrefix: 'veterano.match01',
				emailDomain: '@teste.com',
				credentials: {
					password: 'Senha@Forte123',
					currentPassword: 'Senha@Forte123',
					newPassword: 'NovaSenha@Forte123'
				},
				profile: {
					fullName: 'Veterano Match 01',
					yearOfBirth: '1999',
					gender: 'Masculino',
					course: 'Engenharia de Computação',
					yearOfEntry: '2021',
					interests: 'Mentorias iniciais; Integração acadêmica; Tecnologia aplicada'
				},
				email: 'veterano.match01@teste.com'
			},
			{
				id: 'veteranoMatch02',
				label: 'Veterano Match 02',
				role: 'veterano',
				emailPrefix: 'veterano.match02',
				emailDomain: '@teste.com',
				credentials: {
					password: 'Senha@Forte123',
					currentPassword: 'Senha@Forte123',
					newPassword: 'NovaSenha@Forte123'
				},
				profile: {
					fullName: 'Veterano Match 02',
					yearOfBirth: '1998',
					gender: 'Feminino',
					course: 'Engenharia de Computação',
					yearOfEntry: '2020',
					interests: 'Robótica; Programação; Inteligência Artificial'
				},
				email: 'veterano.match02@teste.com'
			},
			{
				id: 'veteranoMatch03',
				label: 'Veterano Match 03',
				role: 'veterano',
				emailPrefix: 'veterano.match03',
				emailDomain: '@teste.com',
				credentials: {
					password: 'Senha@Forte123',
					currentPassword: 'Senha@Forte123',
					newPassword: 'NovaSenha@Forte123'
				},
				profile: {
					fullName: 'Veterano Match 03',
					yearOfBirth: '1998',
					gender: 'Masculino',
					course: 'Engenharia de Computação',
					yearOfEntry: '2019',
					interests: 'Jogos Digitais; Comunidades Estudantis; Tecnologia'
				},
				email: 'veterano.match03@teste.com'
			},
			{
				id: 'veterano01',
				label: 'Veterano 01',
				role: 'veterano',
				emailPrefix: 'veterano01',
				emailDomain: '@teste.com',
				credentials: {
					password: 'Senha@Forte123',
					currentPassword: 'Senha@Forte123',
					newPassword: 'NovaSenha@Forte123'
				},
				profile: {
					fullName: 'Veterano Teste 01',
					yearOfBirth: '2000',
					gender: 'Masculino',
					course: 'Engenharia de Computação',
					yearOfEntry: '2020',
					interests: 'Robótica; Programação; Inteligência Artificial'
				},
				email: 'veterano01@teste.com'
			},
			{
				id: 'veterano02',
				label: 'Veterano 02',
				role: 'veterano',
				emailPrefix: 'veterano02',
				emailDomain: '@teste.com',
				credentials: {
					password: 'Senha@Forte123',
					currentPassword: 'Senha@Forte123',
					newPassword: 'NovaSenha@Forte123'
				},
				profile: {
					fullName: 'Veterano Teste 02',
					yearOfBirth: '1999',
					gender: 'Feminino',
					course: 'Engenharia de Computação',
					yearOfEntry: '2019',
					interests: 'Jogos Digitais; Comunidades Estudantis; Tecnologia'
				},
				email: 'veterano02@teste.com'
			},
			{
				id: 'veterano03',
				label: 'Veterano 03',
				role: 'veterano',
				emailPrefix: 'veterano03',
				emailDomain: '@teste.com',
				credentials: {
					password: 'Senha@Forte123',
					currentPassword: 'Senha@Forte123',
					newPassword: 'NovaSenha@Forte123'
				},
				profile: {
					fullName: 'Veterano Teste 03',
					yearOfBirth: '1998',
					gender: 'Masculino',
					course: 'Engenharia de Computação',
					yearOfEntry: '2018',
					interests: 'Empreendedorismo; Liga Acadêmica; Esportes'
				},
				email: 'veterano03@teste.com'
			}
		]
	},
	mfaCode: ''
};

module.exports = { config };

