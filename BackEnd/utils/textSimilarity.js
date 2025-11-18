/**
 * Utilitário para calcular similaridade entre textos usando Hugging Face API
 * Usa o modelo sentence-transformers/all-MiniLM-L6-v2
 */
const axios = require('axios');
require('dotenv').config();

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HUGGINGFACE_API_URL = 'https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2';

// Log informando sobre a nova rota
console.log('[Hugging Face] Usando novo endpoint oficial: router.huggingface.co');

/**
 * Calcula embeddings para dois textos usando Hugging Face API com o novo formato
 * @param {string} text1 - Primeiro texto (source_sentence)
 * @param {string} text2 - Segundo texto (sentences)
 * @returns {Promise<{embedding1: Array<number>, embedding2: Array<number>}>} - Objeto com os dois embeddings
 */
async function getEmbeddings(text1, text2) {
    if (!HUGGINGFACE_API_KEY) {
      throw new Error('HUGGINGFACE_API_KEY não configurada no .env');
    }
  
    if (!text1 || !text2 || typeof text1 !== 'string' || typeof text2 !== 'string') {
      throw new Error('Ambos os textos são obrigatórios e devem ser strings');
    }
  
    try {
      console.log(`[Hugging Face] Comparando textos:`);
      console.log(`  - Texto 1: "${text1.substring(0, 50)}..."`);
      console.log(`  - Texto 2: "${text2.substring(0, 50)}..."`);
  
      const response = await axios.post(
        HUGGINGFACE_API_URL,
        {
          inputs: {
            source_sentence: text1.trim(),
            sentences: [text2.trim()]
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
  
      // Log do status da resposta para debug
      console.log(`[Hugging Face] Status da resposta: ${response.status} ${response.statusText}`);
      console.log(`[Hugging Face] Tipo de resposta: ${typeof response.data}, É array: ${Array.isArray(response.data)}`);
      
      // NOVO FORMATO: A API retorna diretamente um array numérico com a similaridade (ex: [0.52])
      if (Array.isArray(response.data) && response.data.length > 0 && typeof response.data[0] === 'number') {
        const similarity = response.data[0];
        console.log(`[Hugging Face] Similaridade retornada diretamente pela API: ${similarity}`);
        return { similarity };
      }
  
      // FORMATO ANTIGO: Retorna embeddings (arrays de números)
      // Formato 1: Array com dois arrays (embeddings)
      if (Array.isArray(response.data) && response.data.length >= 2) {
        const embedding1 = Array.isArray(response.data[0]) ? response.data[0] : response.data[0];
        const embedding2 = Array.isArray(response.data[1]) ? response.data[1] : response.data[1];
        
        if (Array.isArray(embedding1) && Array.isArray(embedding2) && embedding1.length > 0 && embedding2.length > 0) {
          console.log(`[Hugging Face] Embeddings retornados, será calculado cosseno`);
          return { embedding1, embedding2 };
        }
      }

      // Formato 2: Objeto com embeddings
      if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        if (response.data.source_sentence && response.data.sentences && Array.isArray(response.data.sentences)) {
          const embedding1 = Array.isArray(response.data.source_sentence) ? response.data.source_sentence : [];
          const embedding2 = Array.isArray(response.data.sentences[0]) ? response.data.sentences[0] : [];
          
          if (embedding1.length > 0 && embedding2.length > 0) {
            console.log(`[Hugging Face] Embeddings retornados em formato objeto, será calculado cosseno`);
            return { embedding1, embedding2 };
          }
        }
      }
  
      // Se chegou aqui, não reconheceu nenhum formato conhecido
      // Retorna similaridade 0 como fallback seguro
      console.warn(`[Hugging Face] Formato de resposta não reconhecido, retornando similaridade 0`);
      console.warn(`[Hugging Face] Resposta recebida: ${JSON.stringify(response.data).substring(0, 200)}`);
      return { similarity: 0 };
    } catch (error) {
      if (error.response) {
        console.error(`[Hugging Face] Erro da API - Status: ${error.response.status}`);
        console.error(`[Hugging Face] Resposta: ${JSON.stringify(error.response.data)}`);
        throw new Error(`Erro da API Hugging Face: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('[Hugging Face] Erro de conexão');
        throw new Error('Erro de conexão com a API Hugging Face.');
      } else {
        console.error(`[Hugging Face] Erro: ${error.message}`);
        throw new Error(`Erro ao processar embeddings: ${error.message}`);
      }
    }
  }

/**
 * Calcula o embedding de um texto usando Hugging Face API
 * Mantida para compatibilidade, mas agora usa getEmbeddings internamente
 * @param {string} text - Texto para gerar embedding
 * @returns {Promise<Array<number>>} - Array de números representando o embedding
 */
async function getEmbedding(text) {
  // Para manter compatibilidade, fazemos uma requisição com o mesmo texto duas vezes
  // ou podemos fazer uma requisição única e retornar apenas o primeiro embedding
  const { embedding1 } = await getEmbeddings(text, text);
  return embedding1;
}

/**
 * Calcula a similaridade do cosseno entre dois vetores
 * @param {Array<number>} vector1 - Primeiro vetor
 * @param {Array<number>} vector2 - Segundo vetor
 * @returns {number} - Similaridade do cosseno (0 a 1)
 */
function cosineSimilarity(vector1, vector2) {
  if (!Array.isArray(vector1) || !Array.isArray(vector2)) {
    throw new Error('Vetores devem ser arrays');
  }

  if (vector1.length !== vector2.length) {
    throw new Error('Vetores devem ter o mesmo tamanho');
  }

  if (vector1.length === 0) {
    return 0;
  }

  // Calcula produto escalar
  let dotProduct = 0;
  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
  }

  // Calcula magnitudes
  let magnitude1 = 0;
  let magnitude2 = 0;
  for (let i = 0; i < vector1.length; i++) {
    magnitude1 += vector1[i] * vector1[i];
    magnitude2 += vector2[i] * vector2[i];
  }
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  // Evita divisão por zero
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  // Similaridade do cosseno
  const similarity = dotProduct / (magnitude1 * magnitude2);

  // Garante que está entre 0 e 1
  return Math.max(0, Math.min(1, similarity));
}

/**
 * Calcula a similaridade entre dois textos usando embeddings e similaridade do cosseno
 * @param {string} text1 - Primeiro texto
 * @param {string} text2 - Segundo texto
 * @returns {Promise<number>} - Similaridade entre 0 e 1
 */
async function compareTexts(text1, text2) {
    try {
      if (!text1 || !text2) {
        throw new Error('Ambos os textos são obrigatórios');
      }
  
      const result = await getEmbeddings(text1, text2);
  
      // Novo formato: a API já retornou a similaridade pronta
      if (result.similarity !== undefined) {
        console.log(`[Hugging Face] Similaridade retornada diretamente: ${result.similarity}`);
        return Math.round(result.similarity * 10000) / 10000;
      }
  
      // Formato antigo: precisamos calcular o cosseno
      const { embedding1, embedding2 } = result;
      const similarity = cosineSimilarity(embedding1, embedding2);
      return Math.round(similarity * 10000) / 10000;
    } catch (error) {
      console.error('Erro ao comparar textos:', error);
      throw error;
    }
  }

module.exports = {
  compareTexts,
  getEmbedding,
  getEmbeddings,
  cosineSimilarity
};

