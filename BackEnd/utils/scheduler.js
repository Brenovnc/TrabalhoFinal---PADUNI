/**
 * Módulo de agendamento para execução automática de matches
 * Usa node-cron para agendar execuções periódicas
 */
const cron = require('node-cron');
const { getCalourosDisponiveis, getVeteranosDisponiveis, createMatchesBatch } = require('./matches');
const { processAutomaticMatch } = require('./matchAI');
const { sendMatchNotification } = require('./emailService');
const { addLogEntry } = require('./criticalActionsLog');
const { gerarMatches } = require('./match');

let matchJob = null;

/**
 * Função que executa o match automático
 */
async function matchAutomatico() {
  console.log('[SCHEDULER] ========================================');
  console.log('[SCHEDULER] Iniciando execução automática de match...');
  console.log('[SCHEDULER] Horário:', new Date().toLocaleString('pt-BR'));
  
  try {
    // 1. Gera matches baseados em similaridade de interesses
    console.log('[SCHEDULER] Executando geração de matches por similaridade...');
    try {
      await gerarMatches();
    } catch (matchError) {
      console.error('[SCHEDULER] Erro ao gerar matches por similaridade:', matchError);
      // Continua mesmo se houver erro na geração de matches por similaridade
    }

    // 2. Busca calouros e veteranos disponíveis para match padrinho-apadrinhado
    const calouros = await getCalourosDisponiveis();
    const veteranos = await getVeteranosDisponiveis();

    if (calouros.length === 0) {
      console.log('[SCHEDULER] Nenhum calouro disponível para match');
      return {
        success: true,
        message: 'Nenhum calouro disponível',
        matchesCreated: 0
      };
    }

    if (veteranos.length === 0) {
      console.log('[SCHEDULER] Nenhum veterano disponível para match');
      return {
        success: true,
        message: 'Nenhum veterano disponível',
        matchesCreated: 0
      };
    }

    console.log(`[SCHEDULER] Processando ${calouros.length} calouros e ${veteranos.length} veteranos...`);

    // Processa o match automático usando IA (agora é async)
    const matchResult = await processAutomaticMatch(calouros, veteranos);

    if (!matchResult.success || matchResult.matches.length === 0) {
      console.log('[SCHEDULER] Nenhum match compatível encontrado');
      return {
        success: true,
        message: matchResult.message || 'Nenhum match compatível encontrado',
        matchesCreated: 0
      };
    }

    // Cria os matches no banco de dados
    const createdMatches = await createMatchesBatch(matchResult.matches);

    console.log(`[SCHEDULER] ✅ ${createdMatches.length} matches criados com sucesso`);

    // Envia emails de notificação para cada match criado
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const match of createdMatches) {
      try {
        // Envia email para o calouro
        await sendMatchNotification(
          match.calouro.email,
          match.calouro.fullName,
          match.veterano.fullName,
          'calouro'
        );

        // Envia email para o veterano
        await sendMatchNotification(
          match.veterano.email,
          match.veterano.fullName,
          match.calouro.fullName,
          'veterano'
        );

        emailsSent += 2;
      } catch (emailError) {
        console.error(`[SCHEDULER] Erro ao enviar emails de notificação:`, emailError);
        emailsFailed += 2;
      }
    }

    console.log(`[SCHEDULER] 📧 Emails enviados: ${emailsSent}, Falhas: ${emailsFailed}`);

    // Log da ação
    try {
      await addLogEntry({
        responsible: 'SYSTEM_SCHEDULER',
        action: 'AUTOMATIC_MATCH_EXECUTION',
        target: `Matches criados: ${createdMatches.length}`,
        justification: 'Execução automática agendada de match entre calouros e veteranos',
        metadata: {
          totalCalouros: calouros.length,
          totalVeteranos: veteranos.length,
          matchesCreated: createdMatches.length,
          averageScore: matchResult.statistics.averageScore,
          emailsSent,
          emailsFailed
        }
      });
    } catch (logError) {
      console.error('[SCHEDULER] Erro ao registrar log:', logError);
    }

    console.log('[SCHEDULER] Execução concluída com sucesso!');
    console.log('[SCHEDULER] ========================================');

    return {
      success: true,
      message: `Match automático executado com sucesso. ${createdMatches.length} matches criados.`,
      matchesCreated: createdMatches.length,
      statistics: matchResult.statistics,
      emailsSent,
      emailsFailed
    };
  } catch (error) {
    console.error('[SCHEDULER] ❌ Erro ao executar match automático:', error);
    
    // Log do erro
    try {
      await addLogEntry({
        responsible: 'SYSTEM_SCHEDULER',
        action: 'AUTOMATIC_MATCH_EXECUTION_ERROR',
        target: 'Erro na execução',
        justification: `Erro ao executar match automático: ${error.message}`,
        metadata: {
          error: error.message,
          stack: error.stack
        }
      });
    } catch (logError) {
      console.error('[SCHEDULER] Erro ao registrar log de erro:', logError);
    }

    console.log('[SCHEDULER] ========================================');

    return {
      success: false,
      message: `Erro ao executar match automático: ${error.message}`,
      matchesCreated: 0
    };
  }
}

/**
 * Inicia o agendamento de matches automáticos
 * @param {string} schedule - Expressão cron (ex: '0 2 * * *' = todo dia às 2h)
 * @param {boolean} runImmediately - Se true, executa imediatamente ao iniciar
 */
function startMatchScheduler(schedule = '0 2 * * *', runImmediately = false) {
  // Para o job anterior se existir
  if (matchJob) {
    matchJob.stop();
    matchJob = null;
  }

  // Valida expressão cron
  if (!cron.validate(schedule)) {
    throw new Error(`Expressão cron inválida: ${schedule}`);
  }

  console.log('[SCHEDULER] ========================================');
  console.log(`[SCHEDULER] ⚙️  Configurando agendamento de match automático`);
  console.log(`[SCHEDULER] 📅 Cron: ${schedule}`);
  console.log(`[SCHEDULER] 🚀 Execução imediata: ${runImmediately ? 'SIM' : 'NÃO'}`);
  console.log('[SCHEDULER] ========================================');

  // Executa imediatamente se solicitado
  if (runImmediately) {
    console.log('[SCHEDULER] Executando match imediatamente...');
    matchAutomatico().catch(err => {
      console.error('[SCHEDULER] Erro na execução imediata:', err);
    });
  }

  // Agenda execução periódica
  matchJob = cron.schedule(schedule, async () => {
    console.log('[SCHEDULER] ⏰ Tarefa agendada executada!');
    await matchAutomatico();
  }, {
    scheduled: true,
    timezone: 'America/Sao_Paulo'
  });

  console.log('[SCHEDULER] ✅ Agendamento iniciado com sucesso!');
  console.log('[SCHEDULER] ========================================');
}

/**
 * Para o agendamento de matches
 */
function stopMatchScheduler() {
  if (matchJob) {
    matchJob.stop();
    matchJob = null;
    console.log('[SCHEDULER] ⏹️  Agendamento parado');
  }
}

/**
 * Retorna o status do agendamento
 */
function getSchedulerStatus() {
  return {
    isRunning: matchJob !== null,
    schedule: matchJob ? matchJob.getStatus() : null
  };
}

module.exports = {
  startMatchScheduler,
  stopMatchScheduler,
  getSchedulerStatus,
  matchAutomatico,
  executeAutomaticMatch: matchAutomatico // Alias para compatibilidade
};
