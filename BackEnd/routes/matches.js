const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getCalourosDisponiveis, getVeteranosDisponiveis, createMatchesBatch } = require('../utils/matches');
const { processAutomaticMatch } = require('../utils/matchAI');
const { addLogEntry } = require('../utils/criticalActionsLog');
const { getMatches, countMatches, gerarMatches, getUserMatch } = require('../utils/match');
const { requestMatchCancellation } = require('../utils/matchCancellationService');
// Nota: Notificações de match são enviadas automaticamente pelo createMatchesBatch

/**
 * POST /api/matches/automatic
 * Executa o processo de match automático
 * Requer autenticação de administrador (pode ser ajustado conforme necessário)
 */
router.post('/automatic', authenticateToken, async (req, res) => {
  try {
    // Verificar se o usuário é administrador (opcional - ajustar conforme necessário)
    // Por enquanto, qualquer usuário autenticado pode executar
    // const user = await findUserById(req.user.id);
    // if (user.userType !== 'administrador') {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Acesso negado. Apenas administradores podem executar match automático.'
    //   });
    // }

    // Busca calouros e veteranos disponíveis
    const calouros = await getCalourosDisponiveis();
    const veteranos = await getVeteranosDisponiveis();

    if (calouros.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhum calouro disponível para match',
        matches: [],
        statistics: {
          totalCalouros: 0,
          totalVeteranos: veteranos.length,
          matchesCreated: 0
        }
      });
    }

    if (veteranos.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhum veterano disponível para match',
        matches: [],
        statistics: {
          totalCalouros: calouros.length,
          totalVeteranos: 0,
          matchesCreated: 0
        }
      });
    }

    // Processa o match automático usando IA (agora é async)
    const matchResult = await processAutomaticMatch(calouros, veteranos);

    if (!matchResult.success || matchResult.matches.length === 0) {
      return res.status(200).json({
        success: true,
        message: matchResult.message || 'Nenhum match compatível encontrado',
        matches: [],
        statistics: matchResult.statistics || {}
      });
    }

    // Cria os matches no banco de dados
    // Nota: As notificações de email são enviadas automaticamente pelo createMatchesBatch
    const createdMatches = await createMatchesBatch(matchResult.matches);

    // Prepara resultados dos emails (notificações enviadas automaticamente)
    const emailResults = createdMatches.map(match => ({
      calouroId: match.calouro.id,
      veteranoId: match.veterano.id,
      emailsSent: true // Notificações enviadas automaticamente pelo serviço
    }));

    // Log da ação crítica
    try {
      await addLogEntry({
        responsible: req.user.email || req.user.id,
        action: 'AUTOMATIC_MATCH_EXECUTION',
        target: `Matches criados: ${createdMatches.length}`,
        justification: 'Execução automática de match entre calouros e veteranos',
        metadata: {
          totalCalouros: calouros.length,
          totalVeteranos: veteranos.length,
          matchesCreated: createdMatches.length,
          averageScore: matchResult.statistics.averageScore
        }
      });
    } catch (logError) {
      console.error('Error logging match execution:', logError);
    }

    res.status(200).json({
      success: true,
      message: `Match automático executado com sucesso. ${createdMatches.length} matches criados.`,
      matches: createdMatches.map(m => ({
        matchId: m.match.id,
        calouro: {
          id: m.calouro.id,
          name: m.calouro.fullName,
          email: m.calouro.email
        },
        veterano: {
          id: m.veterano.id,
          name: m.veterano.fullName,
          email: m.veterano.email
        },
        score: m.score,
        createdAt: m.match.criado_em
      })),
      statistics: matchResult.statistics,
      emailResults
    });
  } catch (error) {
    console.error('Error executing automatic match:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao executar match automático',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/matches/generate
 * Gera matches baseados em similaridade de interesses
 * Executa a comparação entre todos os usuários e salva matches com score >= 0.7
 */
router.post('/generate', async (req, res) => {
  try {
    console.log('[API] Iniciando geração de matches por similaridade...');
    const result = await gerarMatches();

    res.status(200).json({
      success: true,
      message: result.message,
      statistics: {
        matchesFound: result.matchesFound,
        matchesSaved: result.matchesSaved,
        matchesSkipped: result.matchesSkipped || 0,
        comparisons: result.comparisons || 0
      }
    });
  } catch (error) {
    console.error('Error generating matches:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar matches',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/matches/list
 * Retorna a lista de matches de similaridade
 * Query params opcionais:
 * - limit: número máximo de resultados (padrão: 100)
 * - offset: número de resultados para pular (padrão: 0)
 * - minScore: score mínimo para filtrar (padrão: 0)
 * - userId: ID do usuário para filtrar matches específicos (opcional)
 * 
 * NOTA: Removida autenticação temporariamente para facilitar testes.
 * Para produção, adicione authenticateToken como middleware.
 */
router.get('/list', async (req, res) => {
  try {
    const {
      limit = 100,
      offset = 0,
      minScore = 0,
      userId = null
    } = req.query;

    // Validação de parâmetros
    const limitNum = Math.min(parseInt(limit) || 100, 1000); // Máximo 1000
    const offsetNum = Math.max(parseInt(offset) || 0, 0);
    const minScoreNum = Math.max(0, Math.min(1, parseFloat(minScore) || 0));
    const userIdNum = userId ? parseInt(userId) : null;

    // Busca matches
    const matches = await getMatches({
      limit: limitNum,
      offset: offsetNum,
      minScore: minScoreNum,
      userId: userIdNum
    });

    // Conta total de matches (para paginação)
    const total = await countMatches({
      minScore: minScoreNum,
      userId: userIdNum
    });

    res.status(200).json({
      success: true,
      matches,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: (offsetNum + limitNum) < total
      },
      filters: {
        minScore: minScoreNum,
        userId: userIdNum
      }
    });
  } catch (error) {
    console.error('Error fetching matches list:', error);
    
    // Verifica se é erro de tabela não existente
    if (error.message && error.message.includes('does not exist')) {
      return res.status(404).json({
        success: false,
        message: 'Tabela de matches não encontrada. Execute a geração de matches primeiro.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro ao buscar lista de matches',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/matches/user/:userId
 * Verifica se um usuário tem match e retorna as informações do match
 * Se não tiver match, retorna "match não encontrado"
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuário inválido'
      });
    }

    const matchInfo = await getUserMatch(userId);

    if (!matchInfo) {
      return res.status(404).json({
        success: false,
        message: 'Match não encontrado',
        hasMatch: false
      });
    }

    res.status(200).json({
      success: true,
      message: 'Match encontrado',
      hasMatch: true,
      data: matchInfo
    });
  } catch (error) {
    console.error('Error fetching user match:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar match do usuário',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/matches/status
 * Retorna estatísticas sobre o status do match
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const calouros = await getCalourosDisponiveis();
    const veteranos = await getVeteranosDisponiveis();

    res.status(200).json({
      success: true,
      status: {
        calourosDisponiveis: calouros.length,
        veteranosDisponiveis: veteranos.length,
        podeExecutarMatch: calouros.length > 0 && veteranos.length > 0
      }
    });
  } catch (error) {
    console.error('Error fetching match status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar status do match'
    });
  }
});

/**
 * POST /api/matches/:matchId/cancel
 * Permite solicitar o desfazimento de um match
 * 
 * Body:
 * {
 *   "justificativa": "Texto da justificativa (obrigatório)"
 * }
 */
router.post('/:matchId/cancel', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { justificativa } = req.body;

    // Valida parâmetros
    if (!matchId || isNaN(parseInt(matchId))) {
      return res.status(400).json({
        success: false,
        message: 'ID do match inválido'
      });
    }

    if (!justificativa || typeof justificativa !== 'string' || justificativa.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Justificativa é obrigatória'
      });
    }

    // Solicita o desfazimento do match
    const result = await requestMatchCancellation({
      matchId: parseInt(matchId),
      justificativa: justificativa.trim(),
      adminId: null,
      adminEmail: 'system@paduni.com',
      adminName: 'Sistema'
    });

    res.status(200).json({
      success: true,
      message: 'Solicitação de anulação registrada com sucesso.',
      data: {
        matchId: result.matchId
      }
    });

  } catch (error) {
    console.error('Error requesting match cancellation:', error);
    
    // Retorna erro específico conforme o tipo
    if (error.message === 'Match não encontrado') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('não está ativo')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.message === 'Justificativa é obrigatória') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Erro genérico
    res.status(500).json({
      success: false,
      message: 'Erro ao solicitar anulação do match',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

