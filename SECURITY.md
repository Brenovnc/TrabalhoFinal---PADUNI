# Status de Segurança

## Resumo de Vulnerabilidades

### ✅ BackEnd
**Status: 0 vulnerabilidades**

Todas as vulnerabilidades foram corrigidas através de atualizações de dependências e `npm audit fix`.

### ⚠️ FrontEnd
**Status: 2 vulnerabilidades moderadas**

As vulnerabilidades restantes são do `webpack-dev-server` (ferramenta de desenvolvimento) e são de **severidade moderada**.

#### Detalhes:
- **Pacote**: `webpack-dev-server` (<=5.2.0)
- **Severidade**: Moderada
- **Impacto**: Requer cenário muito específico - desenvolvedor precisa acessar um site malicioso durante o desenvolvimento usando navegador não-Chromium
- **Risco em produção**: **Nenhum** (webpack-dev-server não é usado em produção)
- **Correção automática**: Não disponível sem breaking changes que quebrariam o projeto

#### Por que não foram corrigidas?
O `react-scripts` depende de uma versão específica do `webpack-dev-server` (3.x) que tem essas vulnerabilidades. Tentativas de forçar uma versão mais nova quebrariam a compatibilidade do `react-scripts`. Para corrigir completamente, seria necessário:
1. Fazer `npm audit fix --force` (quebra o projeto - como experimentado anteriormente)
2. Migrar para Vite ou outra ferramenta (mudança arquitetural significativa)
3. **Solução atual**: Removidos os overrides do webpack-dev-server para permitir funcionamento correto do projeto

#### Recomendação:
✅ **Seguro para usar em produção** - As vulnerabilidades afetam apenas o ambiente de desenvolvimento e requerem condições muito específicas para serem exploradas.

### ✅ TesteSelenium
**Status: 0 vulnerabilidades**

Todas as dependências estão atualizadas e seguras.

## Ações Realizadas

1. ✅ Atualização do Express para versão mais recente (BackEnd)
2. ✅ Atualização do Nodemon para versão mais recente (BackEnd)
3. ✅ Aplicação de `npm audit fix` em todas as dependências diretas
4. ✅ Adição de `overrides` no FrontEnd para forçar versões seguras de dependências transitivas
5. ✅ Redução de 9 vulnerabilidades (3 moderate, 6 high) para 2 vulnerabilidades moderadas no FrontEnd

