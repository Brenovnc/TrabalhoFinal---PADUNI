import React, { useEffect, useState } from 'react';
import { getUser, logout } from '../utils/auth';
import './Home.css';

const Home = () => {
  const [user, setUser] = useState(null);

  // Estados para funcionalidades de matches
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesList, setMatchesList] = useState([]);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [showMatchesTable, setShowMatchesTable] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [justificativa, setJustificativa] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Verifica se o usuário é administrador
  useEffect(() => {
    const user = getUser();
    if (user && user.userType === 'administrador') {
      setIsAdmin(true);
    }
  }, []);


  useEffect(() => {
    const userData = getUser();
    if (userData) {
      setUser(userData);
    } else {
      // Not authenticated, redirect to login
      window.location.href = '/login';
    }
  }, []);

  const navigateToProfile = () => {
    window.location.href = '/profile';
  };

  const handleLogout = () => {
    logout();
  };

  /**
   * Função auxiliar para normalizar ID (converte para string para comparação)
   */
  const normalizeId = (id) => {
    if (id === null || id === undefined) return null;
    return String(id).trim();
  };

  /**
   * Função para gerar matches
   * Chama POST /api/matches/generate e depois GET /api/matches/user/{userId}
   * Se houver match, exibe notificação com as informações do usuário matchado (não do logado)
   */
  const handleGenerateMatches = async () => {
    if (!user || !user.id) {
      alert('Erro: ID do usuário não encontrado. Por favor, faça login novamente.');
      return;
    }

    setMatchesLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      
      // Primeiro, gera os matches
      const generateResponse = await fetch(`${apiUrl}/matches/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        throw new Error(errorData.message || 'Erro ao gerar matches');
      }

      const generateData = await generateResponse.json();
      console.log('Matches gerados:', generateData);

      // Aguarda um pouco para garantir que os matches foram salvos
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Depois, consulta se o usuário tem match
      const userId = user.id;
      const userMatchResponse = await fetch(`${apiUrl}/matches/user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!userMatchResponse.ok) {
        if (userMatchResponse.status === 404) {
          // Não há match ainda
          alert('Matches gerados com sucesso! Você ainda não tem um match. Tente novamente mais tarde.');
          return;
        }
        const errorData = await userMatchResponse.json();
        throw new Error(errorData.message || 'Erro ao verificar match');
      }

      const userMatchData = await userMatchResponse.json();
      
      // Se houver match, exibe a notificação
      if (userMatchData.success && userMatchData.hasMatch && userMatchData.data) {
        const matchInfo = userMatchData.data;
        
        // Normaliza o ID do usuário logado para comparação
        const loggedUserId = normalizeId(user.id);
        
        if (!loggedUserId) {
          console.error('Erro: ID do usuário logado não pôde ser normalizado');
          alert('Erro: Não foi possível identificar o usuário logado.');
          return;
        }
        
        // Normaliza os IDs retornados pela API
        const solicitanteId = normalizeId(matchInfo.solicitante?.id);
        const matchadoId = normalizeId(matchInfo.matchado?.id);
        
        // O backend retorna:
        // - solicitante: o usuário que fez a busca (deve ser o usuário logado)
        // - matchado: o outro usuário (deve ser diferente do logado)
        // Vamos garantir que sempre mostramos o usuário que NÃO é o logado
        let matchedUser = null;
        
        // Primeiro, tenta usar o matchado (que normalmente é o outro usuário)
        if (matchadoId && matchadoId !== loggedUserId) {
          matchedUser = matchInfo.matchado;
        } 
        // Se o matchado for igual ao logado (caso raro de erro), tenta o solicitante
        else if (solicitanteId && solicitanteId !== loggedUserId) {
          matchedUser = matchInfo.solicitante;
        }
        // Se nenhum funcionar, verifica ambos os objetos diretamente
        else {
          // Verifica qual objeto tem ID diferente do logado
          if (matchInfo.matchado && normalizeId(matchInfo.matchado.id) !== loggedUserId) {
            matchedUser = matchInfo.matchado;
          } else if (matchInfo.solicitante && normalizeId(matchInfo.solicitante.id) !== loggedUserId) {
            matchedUser = matchInfo.solicitante;
          }
        }
        
        // Validação final: garante que encontramos um usuário válido e diferente do logado
        if (matchedUser && matchedUser.id) {
          const matchedUserId = normalizeId(matchedUser.id);
          
          // Verifica se realmente é diferente do usuário logado
          if (matchedUserId && matchedUserId !== loggedUserId) {
            // Log para debug
            console.log('✅ Match encontrado corretamente:', {
              usuarioLogadoId: loggedUserId,
              usuarioLogadoNome: user.fullName,
              solicitanteId: solicitanteId,
              matchadoId: matchadoId,
              usuarioMatchadoId: matchedUserId,
              usuarioMatchadoNome: matchedUser.nome,
              usuarioExibido: 'matchado (diferente do logado)'
            });
            
            setMatchData(matchedUser);
            setShowMatchModal(true);
          } else {
            console.error('❌ Erro: O usuário matchado é o mesmo que o usuário logado', {
              loggedUserId,
              matchedUserId,
              solicitanteId,
              matchadoId
            });
            alert('Erro: O match encontrado é inválido (mesmo usuário).');
          }
        } else {
          console.error('❌ Erro: Não foi possível identificar o usuário matchado', {
            loggedUserId,
            solicitanteId,
            matchadoId,
            matchInfo: matchInfo
          });
          alert('Match encontrado, mas houve um erro ao identificar o usuário matchado.');
        }
      } else {
        alert('Matches gerados com sucesso! Você ainda não tem um match. Tente novamente mais tarde.');
      }
    } catch (error) {
      console.error('Erro ao gerar matches:', error);
      alert(`Erro ao gerar matches: ${error.message}`);
    } finally {
      setMatchesLoading(false);
    }
  };

  /**
   * Função para listar matches
   * Chama GET /api/matches/list e renderiza uma tabela
   */
  const handleListMatches = async () => {
    setMatchesLoading(true);
    setShowMatchesTable(false);
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/matches/list`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao listar matches');
      }

      const data = await response.json();
      
      if (data.success && data.matches) {
        // Preserva justificativas_anulacao dos matches cancelados que já estavam na lista
        setMatchesList(prevMatches => {
          const matchesMap = new Map();
          // Primeiro, adiciona os matches antigos com justificativa_anulacao
          prevMatches.forEach(match => {
            if (match.justificativa_anulacao) {
              matchesMap.set(match.id, match);
            }
          });
          // Depois, mescla com os novos matches do backend
          data.matches.forEach(match => {
            const existingMatch = matchesMap.get(match.id);
            if (existingMatch && existingMatch.justificativa_anulacao) {
              // Preserva a justificativa_anulacao se já existir
              matchesMap.set(match.id, { ...match, justificativa_anulacao: existingMatch.justificativa_anulacao });
            } else {
              matchesMap.set(match.id, match);
            }
          });
          return Array.from(matchesMap.values());
        });
        setShowMatchesTable(true);
      } else {
        alert('Nenhum match encontrado.');
      }
    } catch (error) {
      console.error('Erro ao listar matches:', error);
      alert(`Erro ao listar matches: ${error.message}`);
    } finally {
      setMatchesLoading(false);
    }
  };

  /**
   * Fecha o modal de notificação de match
   */
  const closeMatchModal = () => {
    setShowMatchModal(false);
    setMatchData(null);
  };

  /**
   * Abre o modal de cancelamento para um match
   * @param {Object} match - Objeto do match a ser cancelado
   */
  const handleCancelClick = (match) => {
    if (match.status === 'cancelado') {
      alert('Este match já está cancelado.');
      return;
    }
    setSelectedMatch(match);
    setShowCancelModal(true);
  };

  /**
   * Fecha o modal de cancelamento
   */
  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setSelectedMatch(null);
    setJustificativa('');
  };

  /**
   * Confirma o cancelamento do match após validação
   */
  const handleConfirmCancel = () => {
    if (selectedMatch && justificativa.trim()) {
      handleCancelMatch(selectedMatch.id, justificativa);
    } else {
      alert('Por favor, informe uma justificativa.');
    }
  };

  /**
   * Função para cancelar um match
   * Chama POST /api/matches/{id}/cancel e atualiza o status na tabela
   * @param {number} matchId - ID do match a ser cancelado
   * @param {string} justificativa - Justificativa para o cancelamento
   */
  const handleCancelMatch = async (matchId, justificativa) => {
    if (!justificativa || justificativa.trim().length === 0) {
      alert('Justificativa é obrigatória para cancelar um match.');
      return;
    }

    setCancellingId(matchId);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/matches/${matchId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          justificativa: justificativa.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao cancelar match');
      }

      const data = await response.json();
      
      if (data.success) {
        // Atualiza o status do match na lista local sem recarregar a página
        // Inclui a justificativa_anulacao no match cancelado
        setMatchesList(prevMatches => 
          prevMatches.map(match => 
            match.id === matchId 
              ? { ...match, status: 'cancelado', justificativa_anulacao: justificativa.trim() }
              : match
          )
        );
        
        alert('Match cancelado com sucesso!');
        setShowCancelModal(false);
        setSelectedMatch(null);
        setJustificativa('');
      }
    } catch (error) {
      console.error('Erro ao cancelar match:', error);
      alert(`Erro ao cancelar match: ${error.message}`);
    } finally {
      setCancellingId(null);
    }
  };

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="home-container">
      <div className="home-card">
        <h1 className="home-title">Bem-vindo ao PADUNI!</h1>
        <p className="home-subtitle">Sistema de Padrinho Universitário - Unifei</p>

        <div className="user-info">
          <h2>Informações do Usuário</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Nome:</span>
              <span className="info-value">{user.fullName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email:</span>
              <span className="info-value">{user.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Tipo:</span>
              <span className="info-value">{user.userType === 'veterano' ? 'Veterano' : 'Calouro'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Curso:</span>
              <span className="info-value">{user.course}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Ano de Ingresso:</span>
              <span className="info-value">{user.yearOfEntry}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Interesses:</span>
              <span className="info-value">
                {typeof user.interests === 'string' ? user.interests : (Array.isArray(user.interests) ? user.interests.join(', ') : 'N/A')}
              </span>
            </div>
          </div>
        </div>

        {isAdmin && (
        
          <div className="matches-section">
            <h2 className="matches-section-title">Matches</h2>
            <div className="matches-actions">
              <button 
                onClick={handleGenerateMatches}
                className="generate-matches-button"
                disabled={matchesLoading}
              >
                {matchesLoading ? 'Processando...' : 'Gerar Matches'}
              </button>
              <button 
                onClick={handleListMatches}
                className="list-matches-button"
                disabled={matchesLoading}
              >
                {matchesLoading ? 'Carregando...' : 'Listar Matches'}
              </button>
            </div>

            {/* Tabela de Matches */}
            {showMatchesTable && matchesList.length > 0 && (
              <div className="matches-table-container">
                <h3 className="matches-table-title">Lista de Matches</h3>
                <div className="table-wrapper">
                  <table className="matches-table">
                    <thead>
                      <tr>
                        <th>Veterano</th>
                        <th>Calouro</th>
                        <th>Score</th>
                        <th>Status</th>
                        <th>Data</th>
                        <th>Justificativa</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchesList.map((match) => (
                        <tr key={match.id}>
                          <td>{match.user1.nome || 'N/A'}</td>
                          <td>{match.user2.nome || 'N/A'}</td>
                          <td>{match.score !== null && match.score !== undefined 
                            ? `${(match.score * 100).toFixed(1)}%` 
                            : 'N/A'}</td>
                          <td>{match.status || 'N/A'}</td>
                          <td>
                            {match.dataCriacao 
                              ? new Date(match.dataCriacao).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })
                              : 'N/A'}
                          </td>
                          <td>
                            {match.justificativa_anulacao 
                              ? <span className="justificativa-text">{match.justificativa_anulacao}</span>
                              : <span className="justificativa-empty">-</span>}
                          </td>
                          <td>
                            <button
                              onClick={() => handleCancelClick(match)}
                              className={`cancel-match-button ${match.status === 'cancelado' ? 'disabled' : ''}`}
                              disabled={match.status === 'cancelado' || cancellingId === match.id}
                            >
                              {cancellingId === match.id ? 'Cancelando...' : 'Cancelar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {showMatchesTable && matchesList.length === 0 && (
              <div className="no-matches-message">
                Nenhum match encontrado.
              </div>
            )}
          </div>
        )}
        <div className="home-actions">
          <button onClick={navigateToProfile} className="profile-button">
            Ver Meu Perfil
          </button>
          
          <button 
            onClick={() => window.location.href = '/matches'} 
            className="matches-table-button"
          >
            {isAdmin ? 'Gerenciar Matches' : 'Ver meu match' }
          </button>
          <button onClick={handleLogout} className="logout-button">
            Sair
          </button>
        </div>
      </div>

      {/* Modal de Notificação de Match */}
      {showMatchModal && matchData && (
        <div className="modal-overlay" onClick={closeMatchModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🎉 Match Encontrado!</h2>
              <button className="modal-close" onClick={closeMatchModal}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ 
                textAlign: 'center', 
                marginBottom: '20px', 
                color: '#666', 
                fontSize: '0.95rem',
                fontStyle: 'italic'
              }}>
                Você encontrou um match! Confira as informações da pessoa abaixo:
              </p>
              <div className="match-info">
                <div className="match-info-item">
                  <span className="match-info-label">Nome:</span>
                  <span className="match-info-value">{matchData.nome || 'N/A'}</span>
                </div>
                <div className="match-info-item">
                  <span className="match-info-label">Curso:</span>
                  <span className="match-info-value">{matchData.curso || 'N/A'}</span>
                </div>
                <div className="match-info-item">
                  <span className="match-info-label">E-mail:</span>
                  <span className="match-info-value">{matchData.email || 'N/A'}</span>
                </div>
                <div className="match-info-item">
                  <span className="match-info-label">Ano de Entrada:</span>
                  <span className="match-info-value">{matchData.anoEntrada || 'N/A'}</span>
                </div>
                {matchData.genero && (
                  <div className="match-info-item">
                    <span className="match-info-label">Gênero:</span>
                    <span className="match-info-value">{matchData.genero}</span>
                  </div>
                )}
                {matchData.interesses && (
                  <div className="match-info-item">
                    <span className="match-info-label">Interesses:</span>
                    <span className="match-info-value">{matchData.interesses}</span>
                  </div>
                )}
                {matchData.tipoUsuario && (
                  <div className="match-info-item">
                    <span className="match-info-label">Tipo de Usuário:</span>
                    <span className="match-info-value">
                      {matchData.tipoUsuario === 'veterano' ? 'Veterano' : 'Calouro'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-button" onClick={closeMatchModal}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Cancelamento */}
      {showCancelModal && selectedMatch && (
        <div className="modal-overlay" onClick={handleCloseCancelModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Cancelar Match</h2>
              <button 
                className="modal-close" 
                onClick={handleCloseCancelModal}
                disabled={cancellingId !== null}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-question">
                Tem certeza que deseja cancelar o match <strong>#{selectedMatch.id}</strong>?
              </p>
              <p className="modal-info">
                <strong>Veterano:</strong> {selectedMatch.user1?.nome || 'N/A'}<br />
                <strong>Calouro:</strong> {selectedMatch.user2?.nome || 'N/A'}
              </p>
              <div className="form-group">
                <label htmlFor="justificativa" className="form-label">
                  Motivo do Cancelamento <span className="required">*</span>
                </label>
                <textarea
                  id="justificativa"
                  className="form-textarea"
                  rows="4"
                  placeholder="Digite o motivo do cancelamento..."
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  required
                  disabled={cancellingId !== null}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="modal-button-cancel"
                onClick={handleCloseCancelModal}
                disabled={cancellingId !== null}
              >
                Voltar
              </button>
              <button
                className="modal-button-confirm"
                onClick={handleConfirmCancel}
                disabled={!justificativa.trim() || cancellingId !== null}
              >
                {cancellingId === selectedMatch.id ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;

