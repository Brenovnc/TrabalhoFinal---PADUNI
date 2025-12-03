import React, { useState, useEffect } from 'react';
import { getToken, getUser } from '../utils/auth';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './MyMatchCard.css';

const MyMatchCard = () => {
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestingCancellation, setRequestingCancellation] = useState(false);

  useEffect(() => {
    fetchMyMatch();
  }, []);

  const fetchMyMatch = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/matches/my-match`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Não tem match, isso é normal
          setMatchData(null);
          return;
        }
        if (response.status === 401 || response.status === 403) {
          window.location.href = '/login';
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao buscar match');
      }

      const data = await response.json();
      
      if (data.success && data.hasMatch && data.data) {
        setMatchData(data.data);
      } else {
        setMatchData(null);
      }
    } catch (error) {
      console.error('Erro ao buscar match:', error);
      toast.error(`Erro ao buscar match: ${error.message}`);
      setMatchData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCancellation = async () => {
    if (!matchData || !matchData.match) {
      toast.error('Erro: Match não encontrado');
      return;
    }

    setRequestingCancellation(true);
    try {
      const token = getToken();
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      
      // O backend pode identificar pelo token, mas também pode precisar do match_id
      // Tentando primeiro sem body, se não funcionar, enviar match_id
      const response = await fetch(`${apiUrl}/matches/request-cancellation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          match_id: matchData.match.id,
          justificativa: 'Solicitação de cancelamento pelo usuário'
        })
        // Sem body - o backend identifica pelo token do usuário
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao solicitar cancelamento');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Solicitação de cancelamento enviada com sucesso!');
        
        // Atualiza o status do match no frontend
        setMatchData(prevData => ({
          ...prevData,
          match: {
            ...prevData.match,
            status: 'anulacao_pendente',
            solicitacaoAnulacao: true
          }
        }));
      }
    } catch (error) {
      console.error('Erro ao solicitar cancelamento:', error);
      toast.error(`Erro ao solicitar cancelamento: ${error.message}`);
    } finally {
      setRequestingCancellation(false);
    }
  };

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

  const getStatusText = (status) => {
    if (status === 'ativo') return 'Ativo';
    if (status === 'cancelado') return 'Cancelado';
    if (status === 'anulacao_pendente') return 'Cancelamento solicitado';
    return status || 'N/A';
  };

  const getStatusClass = (status) => {
    if (status === 'ativo') return 'status-ativo';
    if (status === 'cancelado') return 'status-cancelado';
    if (status === 'anulacao_pendente') return 'status-pendente';
    return '';
  };

  if (loading) {
    return (
      <div className="my-match-card-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Carregando match...</p>
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

  if (!matchData || !matchData.match) {
    return (
      <div className="my-match-card-container">
        <div className="my-match-card no-match">
          <h2 className="card-title">Meu Match</h2>
          <p className="no-match-message">Você ainda não possui um match ativo.</p>
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

  // Determina qual usuário é o matchado (o outro usuário, não o logado)
  const user = getUser();
  const loggedUserId = user ? parseInt(user.id) : null;
  const matchedUser = matchData.matchado && matchData.matchado.id !== loggedUserId 
    ? matchData.matchado 
    : matchData.solicitante && matchData.solicitante.id !== loggedUserId 
    ? matchData.solicitante 
    : matchData.matchado || matchData.solicitante;

  return (
    <div className="my-match-card-container">
      <div className="my-match-card">
        <h2 className="card-title">Meu Match</h2>
        
        <div className="match-info-section">
          <div className="match-info-item">
            <span className="match-info-label">Nome:</span>
            <span className="match-info-value">{matchedUser?.nome || 'N/A'}</span>
          </div>
          
          <div className="match-info-item">
            <span className="match-info-label">Email:</span>
            <span className="match-info-value">{matchedUser?.email || 'N/A'}</span>
          </div>
          
          <div className="match-info-item">
            <span className="match-info-label">Curso:</span>
            <span className="match-info-value">{matchedUser?.curso || 'N/A'}</span>
          </div>
          
          <div className="match-info-item">
            <span className="match-info-label">Ano de Entrada:</span>
            <span className="match-info-value">{matchedUser?.anoEntrada || 'N/A'}</span>
          </div>
          
          <div className="match-info-item">
            <span className="match-info-label">Status:</span>
            <span className={`match-info-value status-badge ${getStatusClass(matchData.match.status)}`}>
              {getStatusText(matchData.match.status)}
            </span>
          </div>
          
          {matchData.match.score !== null && matchData.match.score !== undefined && (
            <div className="match-info-item">
              <span className="match-info-label">Score:</span>
              <span className="match-info-value">{(matchData.match.score * 100).toFixed(1)}%</span>
            </div>
          )}
          
          {matchData.match.dataMatch && (
            <div className="match-info-item">
              <span className="match-info-label">Data do Match:</span>
              <span className="match-info-value">{formatDate(matchData.match.dataMatch)}</span>
            </div>
          )}
          
          {matchedUser?.genero && (
            <div className="match-info-item">
              <span className="match-info-label">Gênero:</span>
              <span className="match-info-value">{matchedUser.genero}</span>
            </div>
          )}
          
          {matchedUser?.interesses && (
            <div className="match-info-item">
              <span className="match-info-label">Interesses:</span>
              <span className="match-info-value">{matchedUser.interesses}</span>
            </div>
          )}
          
          {matchedUser?.tipoUsuario && (
            <div className="match-info-item">
              <span className="match-info-label">Tipo de Usuário:</span>
              <span className="match-info-value">
                {matchedUser.tipoUsuario === 'veterano' ? 'Veterano' : 
                 matchedUser.tipoUsuario === 'calouro' ? 'Calouro' : 
                 matchedUser.tipoUsuario}
              </span>
            </div>
          )}
        </div>

        {matchData.match.status === 'ativo' && !matchData.match.solicitacaoAnulacao && (
          <div className="match-actions">
            <button
              onClick={handleRequestCancellation}
              className="request-cancellation-button"
              disabled={requestingCancellation}
            >
              {requestingCancellation ? 'Enviando...' : 'Solicitar cancelamento'}
            </button>
          </div>
        )}
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
};

export default MyMatchCard;

