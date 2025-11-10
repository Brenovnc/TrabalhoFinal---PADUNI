const express = require('express');
const router = express.Router();
const { compareTexts } = require('../utils/textSimilarity');

/**
 * POST /api/compare-texts
 * Compara dois textos e retorna a similaridade (0 a 1)
 * 
 * Body:
 * {
 *   "text1": "string",
 *   "text2": "string"
 * }
 * 
 * Response:
 * {
 *   "similarity": 0.85,
 *   "text1": "string",
 *   "text2": "string"
 * }
 */
router.post('/compare-texts', async (req, res) => {
  try {
    const { text1, text2 } = req.body;

    // Validação de entrada
    if (!text1 || !text2) {
      return res.status(400).json({
        success: false,
        error: 'Ambos os campos text1 e text2 são obrigatórios'
      });
    }

    if (typeof text1 !== 'string' || typeof text2 !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'text1 e text2 devem ser strings'
      });
    }

    // Calcula similaridade
    const similarity = await compareTexts(text1, text2);

    res.status(200).json({
      success: true,
      similarity,
      text1: text1.trim(),
      text2: text2.trim()
    });
  } catch (error) {
    console.error('Erro ao comparar textos:', error);
    
    // Verifica se é erro de configuração
    if (error.message.includes('HUGGINGFACE_API_KEY')) {
      return res.status(500).json({
        success: false,
        error: 'Configuração da API Hugging Face não encontrada. Configure HUGGINGFACE_API_KEY no .env'
      });
    }

    // Verifica se é erro da API
    if (error.message.includes('API Hugging Face')) {
      return res.status(502).json({
        success: false,
        error: error.message
      });
    }

    // Outros erros
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno ao comparar textos'
    });
  }
});

module.exports = router;

/*
 * EXEMPLO DE CHAMADA VIA CURL:
 * 
 * curl -X POST http://localhost:3001/api/compare-texts \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "text1": "programação, jogos, música",
 *     "text2": "desenvolvimento de software, videogames, rock"
 *   }'
 * 
 * Resposta esperada:
 * {
 *   "success": true,
 *   "similarity": 0.7234,
 *   "text1": "programação, jogos, música",
 *   "text2": "desenvolvimento de software, videogames, rock"
 * }
 */

