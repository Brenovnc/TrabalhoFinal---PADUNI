# Testes Selenium

Esta pasta contém os testes automatizados com Selenium.

## Instalação

```bash
npm install
```

## Configuração

Certifique-se de ter o WebDriver apropriado instalado:
- Chrome: [ChromeDriver](https://chromedriver.chromium.org/)
- Firefox: [GeckoDriver](https://github.com/mozilla/geckodriver/releases)

- Todas as configurações ficam em `TesteSelenium/config.js` (URL da aplicação, timeouts, usuários de teste, atraso entre passos, etc.).
- Ajuste os usuários (calouros e veteranos) conforme desejar; cada item possui dados de perfil e credenciais padrão.
- O código MFA padrão pode ser deixado vazio; os testes leem o código exibido em tela durante a execução.
- O navegador padrão é o Chrome (altere via variável de ambiente `BROWSER` se necessário).

## Execução

```bash
npm test
```

O runner executa, na ordem, os testes de RFC01:

- RFS01: Cadastrar usuário
- RFS02: Fazer login
- RFS03: Visualizar perfil
- RFS04: Editar perfil (requer senha atual)
- RFS05: Alterar email/senha (MFA)
- RFS06: Excluir conta (MFA)

No final, é exibido um resumo com OK/FAIL/SKIPPED.

## Modo UI (visualização em tempo real)

Você pode usar uma interface separada para executar cada requisito individualmente e ver os passos em tempo real:

1) Inicie a UI:
```bash
npm run ui
```

2) Acesse no navegador:

`http://localhost:4000`

3) Selecione:
   - Suite: (por enquanto apenas `RFC01.js`).
   - `stepDelayMs`: atraso entre cada ação (em ms). Se vazio, usa o valor padrão definido em `config.js`.
   - Usuários: escolha um ou mais usuários para o teste (multi-seleção). RFS01 cadastra todos os selecionados; os demais testes usam o primeiro selecionado.
4) Clique no botão do requisito desejado (RFS01..RFS06). Os passos serão exibidos na tela, e a automação abrirá uma janela do navegador separada para executar o teste. Ao final, a UI mostrará se o requisito foi aprovado, reprovado ou ignorado.

Observações:
- Os testes sempre garantem que a tela de login seja acessada via fluxo de “Sair” antes de executar cada caso.
- O código MFA e o código de exclusão são lidos diretamente da área “Modo Desenvolvimento” exibida na UI.
- Ajuste `config.js` para refletir qualquer mudança de URL, usuários ou credenciais de teste.

