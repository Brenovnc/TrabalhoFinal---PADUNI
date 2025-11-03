# Projeto Trabalho Final - PADUNI

Projeto dividido em três partes principais:

## Estrutura do Projeto

- **FrontEnd**: Aplicação React
- **BackEnd**: API Express
- **TesteSelenium**: Testes automatizados com Selenium

## Como executar

**⚠️ IMPORTANTE:** Ambos os servidores (FrontEnd e BackEnd) devem estar rodando simultaneamente para que a aplicação funcione corretamente!

### Iniciando o projeto completo

Você precisa abrir **2 terminais** separados:

#### Terminal 1 - BackEnd (Execute primeiro)

```bash
cd BackEnd
npm install
npm start
```

O BackEnd estará disponível em `http://localhost:3001`

Você deve ver a mensagem: `Servidor rodando na porta 3001`

#### Terminal 2 - FrontEnd (Execute depois)

```bash
cd FrontEnd
npm install
npm start
```

O FrontEnd estará disponível em `http://localhost:3000`

Agora acesse `http://localhost:3000` no navegador e você deve ver a mensagem do backend!

### TesteSelenium

```bash
cd TesteSelenium
npm install
npm test
```

## Desenvolvimento

Para desenvolvimento com hot-reload no BackEnd:

```bash
cd BackEnd
npm run dev
```

