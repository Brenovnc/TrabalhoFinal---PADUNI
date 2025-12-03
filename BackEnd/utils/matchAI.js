/**
 * Módulo de IA para cálculo de compatibilidade entre calouros e veteranos
 * Implementa o algoritmo de match automático baseado em:
 * 1. Mesmo curso (essencial)
 * 2. Mesmo gênero
 * 3. Mesma idade
 * 4. Mesmos interesses (usando Hugging Face API)
 */

const { compareTexts } = require('./textSimilarity');

/**
 * Calcula a idade a partir do ano de nascimento
 */
function calculateAge(yearOfBirth) {
  const currentYear = new Date().getFullYear();
  return currentYear - parseInt(yearOfBirth);
}

/**
 * Compara interesses usando Hugging Face API para calcular similaridade semântica
 * Retorna um valor de 0 a 100 (porcentagem) para manter compatibilidade com o código existente
 * 
 * @param {string} interests1 - Primeiro texto de interesses
 * @param {string} interests2 - Segundo texto de interesses
 * @returns {Promise<number>} - Score de similaridade de 0 a 100
 */
async function compareInterests(interests1, interests2) {
  if (!interests1 || !interests2) return 0;
  
  // Se os textos estão vazios após trim, retorna 0
  const text1 = interests1.trim();
  const text2 = interests2.trim();
  
  if (text1.length === 0 || text2.length === 0) {
    return 0;
  }
  
  try {
    // Usa Hugging Face API para calcular similaridade semântica
    // Retorna valor entre 0 e 1, convertemos para 0-100
    const similarity = await compareTexts(text1, text2);
    const score = similarity * 100; // Converte de 0-1 para 0-100
    
    return Math.round(score * 100) / 100; // Arredonda para 2 casas decimais
  } catch (error) {
    console.error('Erro ao comparar interesses com Hugging Face:', error);
    // Em caso de erro, retorna 0 para não quebrar o processo de match
    // Pode ser melhorado para usar fallback para comparação simples
    return 0;
  }
}

/**
 * Calcula score de compatibilidade entre um calouro e um veterano
 * Retorna um objeto com o score total e detalhes
 * 
 * @param {Object} calouro - Objeto do calouro
 * @param {Object} veterano - Objeto do veterano
 * @returns {Promise<Object>} - { score: number, details: Object, compatible: boolean }
 */
async function calculateCompatibilityScore(calouro, veterano) {
  const details = {
    sameCourse: false,
    sameGender: false,
    sameAge: false,
    interestsScore: 0
  };
  
  let totalScore = 0;
  
  // 1. MESMO CURSO (ESSENCIAL - 50 pontos)
  // Se não for do mesmo curso, retorna score 0 (incompatível)
  if (calouro.course && veterano.course && 
      calouro.course.toLowerCase().trim() === veterano.course.toLowerCase().trim()) {
    details.sameCourse = true;
    totalScore += 50; // Peso alto para curso
  } else {
    // Não é compatível se não for do mesmo curso
    return {
      score: 0,
      details,
      compatible: false,
      reason: 'Cursos diferentes'
    };
  }
  
  // 2. MESMO GÊNERO (20 pontos)
  if (calouro.gender && veterano.gender && 
      calouro.gender.toLowerCase() === veterano.gender.toLowerCase()) {
    details.sameGender = true;
    totalScore += 20;
  }
  
  // 3. MESMA IDADE (15 pontos)
  // Considera mesma idade se a diferença for <= 1 ano
  const ageCalouro = calculateAge(calouro.yearOfBirth);
  const ageVeterano = calculateAge(veterano.yearOfBirth);
  const ageDifference = Math.abs(ageCalouro - ageVeterano);
  
  if (ageDifference <= 1) {
    details.sameAge = true;
    totalScore += 15;
  } else if (ageDifference <= 2) {
    // Idade próxima (diferença de 2 anos) - 7.5 pontos
    totalScore += 7.5;
  }
  
  // 4. INTERESSES (15 pontos) - Usa Hugging Face API
  const interestsScore = await compareInterests(calouro.interests, veterano.interests);
  details.interestsScore = interestsScore;
  totalScore += (interestsScore / 100) * 15; // Converte porcentagem para pontos
  
  return {
    score: Math.round(totalScore * 100) / 100, // Arredonda para 2 casas decimais
    details,
    compatible: true,
    ageDifference
  };
}

/**
 * Encontra o melhor match garantindo 1:1 (um veterano para um calouro)
 * Usa algoritmo greedy otimizado: calcula todos os scores, ordena por similaridade
 * e faz match dos pares com maior score, garantindo que cada veterano e calouro
 * só sejam usados uma vez.
 * 
 * @param {Array} calouros - Lista de calouros disponíveis
 * @param {Array} veteranos - Lista de veteranos disponíveis
 * @returns {Promise<Array>} - Array de matches [{ calouro, veterano, score, details }]
 */
async function findBestMatches(calouros, veteranos) {
  console.log('[MATCH AI] Calculando compatibilidade entre todos os pares...');
  
  // Calcula compatibilidade entre todos os pares possíveis
  const allPairs = [];
  
  for (const calouro of calouros) {
    for (const veterano of veteranos) {
      const compatibility = await calculateCompatibilityScore(calouro, veterano);
      
      if (compatibility.compatible) {
        allPairs.push({
          calouro,
          veterano,
          score: compatibility.score,
          details: compatibility.details,
          ageDifference: compatibility.ageDifference
        });
      }
    }
  }
  
  console.log(`[MATCH AI] Total de pares compatíveis encontrados: ${allPairs.length}`);
  
  // Ordena todos os pares por score (maior primeiro)
  allPairs.sort((a, b) => b.score - a.score);
  
  // Faz matching 1:1 garantindo que cada veterano e calouro só sejam usados uma vez
  const matches = [];
  const usedVeteranos = new Set();
  const usedCalouros = new Set();
  
  for (const pair of allPairs) {
    // Pula se o calouro ou veterano já foram usados
    if (usedCalouros.has(pair.calouro.id) || usedVeteranos.has(pair.veterano.id)) {
      continue;
    }
    
    // Adiciona o match e marca ambos como usados
    matches.push(pair);
    usedCalouros.add(pair.calouro.id);
    usedVeteranos.add(pair.veterano.id);
    
    console.log(`[MATCH AI] Match criado: ${pair.calouro.fullName || pair.calouro.nome} <-> ${pair.veterano.fullName || pair.veterano.nome} (score: ${pair.score.toFixed(2)})`);
  }
  
  console.log(`[MATCH AI] Total de matches 1:1 criados: ${matches.length}`);
  
  return matches;
}

/**
 * Processa o match automático completo
 * 
 * @param {Array} calouros - Lista de calouros disponíveis
 * @param {Array} veteranos - Lista de veteranos disponíveis
 * @returns {Promise<Object>} - Resultado do processamento
 */
async function processAutomaticMatch(calouros, veteranos) {
  if (!calouros || calouros.length === 0) {
    return {
      success: false,
      message: 'Nenhum calouro disponível para match',
      matches: []
    };
  }
  
  if (!veteranos || veteranos.length === 0) {
    return {
      success: false,
      message: 'Nenhum veterano disponível para match',
      matches: []
    };
  }
  
  // Encontra os melhores matches (agora é async)
  const matches = await findBestMatches(calouros, veteranos);
  
  return {
    success: true,
    message: `Processados ${calouros.length} calouros e ${veteranos.length} veteranos. ${matches.length} matches encontrados.`,
    matches,
    statistics: {
      totalCalouros: calouros.length,
      totalVeteranos: veteranos.length,
      matchesCreated: matches.length,
      unmatchedCalouros: calouros.length - matches.length,
      averageScore: matches.length > 0 
        ? Math.round((matches.reduce((sum, m) => sum + m.score, 0) / matches.length) * 100) / 100
        : 0
    }
  };
}

module.exports = {
  calculateCompatibilityScore,
  findBestMatches,
  processAutomaticMatch,
  compareInterests,
  calculateAge
};

