import React, { useEffect, useState } from 'react';
import { getUser, logout } from '../utils/auth';
import './Home.css';

const Home = () => {
  const [user, setUser] = useState(null);

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
              <span className="info-value">{user.interests.join(', ')}</span>
            </div>
          </div>
        </div>

        <div className="home-actions">
          <button onClick={navigateToProfile} className="profile-button">
            Ver Meu Perfil
          </button>
          <button onClick={handleLogout} className="logout-button">
            Sair
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;

