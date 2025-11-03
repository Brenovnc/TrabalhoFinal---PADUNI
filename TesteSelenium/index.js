const { Builder, By, until } = require('selenium-webdriver');

async function exemploTeste() {
  // Configurar o driver (ajuste conforme necessário)
  let driver = await new Builder().forBrowser('chrome').build();
  
  try {
    console.log('Iniciando teste...');
    
    // Exemplo de teste
    await driver.get('http://localhost:3000');
    
    // Aguardar elemento
    await driver.wait(until.elementLocated(By.tagName('body')), 5000);
    
    console.log('Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('Erro no teste:', error);
  } finally {
    await driver.quit();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  exemploTeste();
}

module.exports = { exemploTeste };

