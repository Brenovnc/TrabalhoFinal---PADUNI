# FrontEnd - React

Aplicação React criada com Create React App.

## Instalação

```bash
npm install
```

## Executar em Desenvolvimento

```bash
npm start
# ou
npm run dev
```

O projeto estará disponível em `http://localhost:3000`

## Build para Produção

```bash
npm run build
```

## Problemas Comuns no Windows/OneDrive

Se você encontrar erros do tipo `ENOTEMPTY` ou problemas ao instalar dependências, siga estes passos:

1. **Limpar cache e node_modules:**
```bash
npm cache clean --force
Remove-Item -Path node_modules -Recurse -Force
Remove-Item -Path package-lock.json -Force
```

2. **Reinstalar:**
```bash
npm install
```

3. **Se o problema persistir:**
   - Feche o OneDrive temporariamente
   - Ou mova o projeto para uma pasta fora do OneDrive (ex: `C:\dev\`)

## Nota sobre OneDrive

Projetos Node.js com muitos arquivos pequenos (como `node_modules`) podem ter problemas de sincronização com OneDrive. Recomenda-se:
- Adicionar `node_modules/` ao `.gitignore` (já configurado)
- Considerar mover projetos de desenvolvimento para uma pasta fora do OneDrive

