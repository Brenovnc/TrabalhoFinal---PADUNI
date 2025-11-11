// Configurações editáveis diretamente neste arquivo

const DEFAULT_STEP_DELAY_MS = 1000;

const config = {
	baseUrl: 'http://localhost:3000',
	timeouts: {
		page: 10000,
		element: 8000
	},
	stepDelayMs: DEFAULT_STEP_DELAY_MS,
	defaultStepDelayMs: DEFAULT_STEP_DELAY_MS,
	keepBrowserOpen: true,
	users: {
		calouros: [
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
					yearOfEntry: '2024',
					interests: 'Robótica; Programação; Inteligência Artificial'
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
					course: 'Engenharia Elétrica',
					yearOfEntry: '2024',
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
					course: 'Ciências da Computação',
					yearOfEntry: '2024',
					interests: 'Jogos Digitais; Comunidades Estudantis; Tecnologia'
				}
			}
		],
		veteranos: [
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
					interests: 'Mentoria; Programação; Hackathons'
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
					course: 'Engenharia Elétrica',
					yearOfEntry: '2019',
					interests: 'Projetos de extensão; Tutoria; Música'
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
					course: 'Engenharia de Produção',
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

