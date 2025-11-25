import React, { useState, useEffect } from 'react';
import { getToken, getUser } from '../utils/auth';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MyMatchCard from './MyMatchCard';
import './MatchesTable.css';

const MatchesTable = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
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

  /**
   * Busca a lista de matches do servidor
   * Função centralizada para requisições GET
   */
  const getMatches = async () => {
    setLoading(true);
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
        throw new Error(errorData.message || 'Erro ao buscar matches');
      }

      const data = await response.json();
      
      if (data.success && data.matches) {
        // Usa justificativa_anulacao do backend diretamente
        setMatches(data.matches);
      } else {
        setMatches([]);
        toast.warning('Nenhum match encontrado.');
      }
    } catch (error) {
      console.error('Erro ao buscar matches:', error);
      toast.error(`Erro ao buscar matches: ${error.message}`);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancela um match específico
   * Função centralizada para requisições POST de cancelamento
   * @param {number} matchId - ID do match a ser cancelado
   * @param {string} justificativa - Justificativa para o cancelamento
   */
  const cancelMatch = async (matchId, justificativa) => {
    if (!justificativa || justificativa.trim().length === 0) {
      toast.error('Justificativa é obrigatória para cancelar um match.');
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
        setMatches(prevMatches => 
          prevMatches.map(match => 
            match.id === matchId 
              ? { ...match, status: 'cancelado', justificativa_anulacao: justificativa.trim() }
              : match
          )
        );
        
        toast.success('Match cancelado com sucesso!');
        setShowCancelModal(false);
        setSelectedMatch(null);
        setJustificativa('');
      }
    } catch (error) {
      console.error('Erro ao cancelar match:', error);
      toast.error(`Erro ao cancelar match: ${error.message}`);
    } finally {
      setCancellingId(null);
    }
  };

  /**
   * Abre o modal de confirmação para cancelar match
   * @param {Object} match - Objeto do match a ser cancelado
   */
  const handleCancelClick = (match) => {
    if (match.status === 'cancelado') {
      toast.warning('Este match já está cancelado.');
      return;
    }
    setSelectedMatch(match);
    setShowCancelModal(true);
  };

  /**
   * Confirma o cancelamento do match após validação
   */
  const handleConfirmCancel = () => {
    if (selectedMatch && justificativa.trim()) {
      cancelMatch(selectedMatch.id, justificativa);
    } else {
      toast.error('Por favor, informe uma justificativa.');
    }
  };

  /**
   * Fecha o modal de cancelamento
   */
  const handleCloseModal = () => {
    setShowCancelModal(false);
    setSelectedMatch(null);
    setJustificativa('');
  };

  /**
   * Formata data para exibição (dd/mm/yyyy)
   * @param {string} dateString - Data em formato ISO ou string
   * @returns {string} Data formatada ou 'N/A'
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return 'N/A';
    }
  };

  /**
   * Formata o nome do usuário para exibição
   * @param {Object} user - Objeto do usuário
   * @returns {string} Nome do usuário ou 'N/A'
   */
  const formatUserName = (user) => {
    if (!user) return 'N/A';
    return user.nome || user.name || 'N/A';
  };

  /**
   * Retorna a classe CSS baseada no status do match
   * @param {string} status - Status do match
   * @returns {string} Classe CSS
   */
  const getStatusClass = (status) => {
    if (status === 'cancelado') {
      return 'status-cancelado';
    } else if (status === 'anulacao_pendente') {
      return 'status-anulacao-pendente';
    }
    return 'status-ativo';
  };

  /**
   * Retorna o texto do status formatado
   * @param {string} status - Status do match
   * @returns {string} Texto do status
   */
  const getStatusText = (status) => {
    if (status === 'cancelado') {
      return 'Cancelado';
    }else if (status === 'anulacao_pendente') {
      return 'Anulação Pendente';
    }
    return 'Ativo';
  };

  // Carrega matches ao montar o componente
  useEffect(() => {
    getMatches();
  }, []);

  // Se não for administrador, mostra apenas o card do match do usuário
  if (!isAdmin) {
    return <MyMatchCard />;
  }

  // Tela de loading (apenas para administradores)
  if (loading) {
    return (
      <div className="matches-table-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Carregando matches...</p>
        </div>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </div>
    );
  }

  return (
    <div className="matches-table-container">
      <div className="matches-table-header">
        <h1 className="matches-table-title">Lista de Matches</h1>
        <button 
          onClick={getMatches} 
          className="refresh-button"
          disabled={loading}
        >
          🔄 Atualizar
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="no-matches">
          <p>Nenhum match encontrado.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="matches-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuário A (Veterano)</th>
                <th>Usuário B (Calouro)</th>
                <th>Data de Criação</th>
                <th>Status</th>
                <th>Justificativa</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.id}>
                  <td>{match.id}</td>
                  <td>{formatUserName(match.user1)}</td>
                  <td>{formatUserName(match.user2)}</td>
                  <td>{formatDate(match.dataCriacao)}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(match.status || 'ativo')}`}>
                      {getStatusText(match.status || 'ativo')}
                    </span>
                  </td>
                  <td>
                    {match.justificativa_anulacao 
                      ? <span className="justificativa-text">{match.justificativa_anulacao}</span>
                      : <span className="justificativa-empty">-</span>}
                  </td>
                  <td>
                    <button
                      onClick={() => handleCancelClick(match)}
                      className={`cancel-button ${match.status === 'cancelado' ? 'disabled' : ''}`}
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
      )}

      {/* Modal de Confirmação de Cancelamento */}
      {showCancelModal && selectedMatch && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Cancelar Match</h2>
              <button 
                className="modal-close" 
                onClick={handleCloseModal}
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
                <strong>Veterano:</strong> {formatUserName(selectedMatch.user1)}<br />
                <strong>Calouro:</strong> {formatUserName(selectedMatch.user2)}
              </p>
              <div className="form-group">
                <label htmlFor="justificativa" className="form-label">
                  Justificativa <span className="required">*</span>
                </label>
                <textarea
                  id="justificativa"
                  className="form-textarea"
                  rows="4"
                  placeholder="Digite a justificativa para o cancelamento..."
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
                onClick={handleCloseModal}
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

      {/* Container de notificações Toast */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default MatchesTable;

