import React, { useState, useEffect } from 'react';
import { getToken, getUser, logout } from '../utils/auth';
import './ProfileView.css';

const ProfileView = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados para funcionalidades de matches
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesList, setMatchesList] = useState([]);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [showMatchesTable, setShowMatchesTable] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      // First check if user is authenticated
      const token = getToken();
      const cachedUser = getUser();

      if (!token) {
        // Not authenticated, redirect to login
        window.location.href = '/login';
        return;
      }

      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
        
        const response = await fetch(`${apiUrl}/users/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            // Token invalid, logout and redirect
            logout();
            return;
          }
          throw new Error('Erro ao carregar perfil');
        }

        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          // Update localStorage with fresh data
          localStorage.setItem('user', JSON.stringify(data.user));
        } else {
          // Fallback to cached user if API fails
          if (cachedUser) {
            setUser(cachedUser);
          } else {
            setError('Erro ao carregar dados do perfil');
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        // Fallback to cached user if API fails
        if (cachedUser) {
          setUser(cachedUser);
        } else {
          setError('Erro ao conectar com o servidor');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const calculateAge = (yearOfBirth) => {
    if (!yearOfBirth) return 'N/A';
    const currentYear = new Date().getFullYear();
    return currentYear - yearOfBirth;
  };

  /**
   * Função para gerar matches
   * Chama POST /api/matches/generate e depois GET /api/matches/user/{userId}
   * Se houver match, exibe notificação com as informações
   */
  const handleGenerateMatches = async () => {
    if (!user || !user.id) {
      alert('Erro: ID do usuário não encontrado');
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
        setMatchData(userMatchData.data.matchado);
        setShowMatchModal(true);
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
        setMatchesList(data.matches);
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

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-card">
          <div className="loading-message">Carregando perfil...</div>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="profile-container">
        <div className="profile-card">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h1 className="profile-title">Meu Perfil</h1>
        <p className="profile-subtitle">Visualize suas informações cadastrais</p>

        <div className="profile-content">
          <div className="profile-section">
            <h2 className="section-title">Informações Pessoais</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Nome Completo</span>
                <span className="info-value">{user.fullName || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">{user.email || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Ano de Nascimento</span>
                <span className="info-value">{user.yearOfBirth || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Idade</span>
                <span className="info-value">{calculateAge(user.yearOfBirth)} anos</span>
              </div>
              <div className="info-item">
                <span className="info-label">Gênero</span>
                <span className="info-value">{user.gender || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h2 className="section-title">Informações Acadêmicas</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Curso</span>
                <span className="info-value">{user.course || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Ano de Ingresso</span>
                <span className="info-value">{user.yearOfEntry || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Tipo de Usuário</span>
                <span className="info-value">
                  {user.userType === 'veterano' ? 'Veterano' : 'Calouro'}
                </span>
              </div>
            </div>
          </div>

          {user.interests && (typeof user.interests === 'string' ? user.interests.trim() : (Array.isArray(user.interests) ? user.interests.join(', ') : '')).length > 0 && (
            <div className="profile-section">
              <h2 className="section-title">Interesses</h2>
              <div className="interests-container">
                <p className="interests-text">
                  {typeof user.interests === 'string' ? user.interests : (Array.isArray(user.interests) ? user.interests.join(', ') : '')}
                </p>
              </div>
            </div>
          )}

          {/* Seção de Matches */}
          <div className="profile-section">
            <h2 className="section-title">Matches</h2>
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

          <div className="profile-section">
            <h2 className="section-title">Informações do Sistema</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Data de Cadastro</span>
                <span className="info-value">
                  {user.createdAt 
                    ? new Date(user.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <button 
            onClick={() => window.location.href = '/'} 
            className="back-button"
          >
            Voltar
          </button>
          <button 
            onClick={() => window.location.href = '/profile/edit'} 
            className="edit-button"
          >
            Editar Perfil
          </button>
          <button 
            onClick={() => window.location.href = '/change-credentials'} 
            className="change-credentials-button"
          >
            Alterar Email/Senha
          </button>
          <button 
            onClick={() => window.location.href = '/delete-account'} 
            className="delete-account-button"
          >
            Excluir Conta
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
    </div>
  );
};

export default ProfileView;

