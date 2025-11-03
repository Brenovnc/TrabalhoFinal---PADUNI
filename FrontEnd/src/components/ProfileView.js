import React, { useState, useEffect } from 'react';
import { getToken, getUser, logout } from '../utils/auth';
import './ProfileView.css';

const ProfileView = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

          {user.interests && user.interests.length > 0 && (
            <div className="profile-section">
              <h2 className="section-title">Interesses</h2>
              <div className="interests-container">
                {user.interests.map((interest, index) => (
                  <span key={index} className="interest-badge">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

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
        </div>
      </div>
    </div>
  );
};

export default ProfileView;

