import React, { useState } from 'react';
import './LoginForm.css';

const LoginForm = ({ navigateToRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        // Try to parse error response
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        setError(errorData.message || 'Erro ao fazer login');
        setLoading(false);
        return;
      }

      const data = await response.json();

      // Store token and user data in localStorage
      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect to home page
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error:', error);
      if (error.message && error.message.includes('JSON')) {
        setError('Erro na comunicação com o servidor. Verifique se o backend está rodando na porta 3001.');
      } else {
        setError(error.message || 'Erro ao conectar com o servidor. Tente novamente mais tarde.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Entrar</h1>
        <p className="login-subtitle">Faça login para acessar o PADUNI</p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="seu.email@exemplo.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Senha
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Digite sua senha"
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="login-footer">
          <p>Não tem uma conta?{' '}
            <a 
              href="/register" 
              onClick={(e) => {
                e.preventDefault();
                if (navigateToRegister) {
                  navigateToRegister();
                } else {
                  window.location.href = '/register';
                }
              }}
            >
              Cadastre-se
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;

