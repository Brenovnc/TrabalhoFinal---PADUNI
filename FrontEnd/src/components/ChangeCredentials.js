import React, { useState } from 'react';
import { getToken } from '../utils/auth';
import './ChangeCredentials.css';

const ChangeCredentials = () => {
  const [step, setStep] = useState(1); // 1: Request MFA, 2: Confirm Change
  const [formData, setFormData] = useState({
    currentPassword: '',
    mfaCode: '',
    newEmail: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mfaCodeSent, setMfaCodeSent] = useState(false);
  const [mfaCodeDebug, setMfaCodeDebug] = useState(''); // For development only

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleRequestMFACode = async () => {
    setErrors([]);
    setLoading(true);
    setMfaCodeSent(false);

    try {
      const token = getToken();
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/users/request-mfa-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrors([errorData.message || 'Erro ao solicitar código']);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setMfaCodeSent(true);
      
      // Show debug code if provided (always in development)
      if (data.debugCode) {
        setMfaCodeDebug(data.debugCode);
      }
      
      setStep(2);
      
      // Scroll to show the code if it's available
      if (data.debugCode) {
        setTimeout(() => {
          const debugElement = document.querySelector('.debug-code');
          if (debugElement) {
            debugElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error:', error);
      setErrors(['Erro ao conectar com o servidor. Tente novamente mais tarde.']);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSuccess(false);
    setLoading(true);

    // Validate that at least one field is being changed
    if (!formData.newEmail && !formData.newPassword) {
      setErrors(['Informe pelo menos um campo para alterar (Novo Email ou Nova Senha)']);
      setLoading(false);
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/users/change-credentials`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          mfaCode: formData.mfaCode,
          newEmail: formData.newEmail || undefined,
          newPassword: formData.newPassword || undefined,
          confirmPassword: formData.newPassword ? formData.confirmPassword : undefined
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        if (errorData.errors && Array.isArray(errorData.errors)) {
          setErrors(errorData.errors);
        } else {
          setErrors([errorData.message || 'Erro ao atualizar credenciais']);
        }
        setLoading(false);
        return;
      }

      const data = await response.json();

      // Success
      setSuccess(true);
      setLoading(false);

      // Redirect to login after 2 seconds (user needs to login again)
      setTimeout(() => {
        // Clear token and redirect
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      if (error.message && error.message.includes('JSON')) {
        setErrors(['Erro na comunicação com o servidor. Verifique se o backend está rodando na porta 3001.']);
      } else {
        setErrors([error.message || 'Erro ao conectar com o servidor. Tente novamente mais tarde.']);
      }
      setLoading(false);
    }
  };

  return (
    <div className="change-credentials-container">
      <div className="change-credentials-card">
        <h1 className="change-credentials-title">Alterar Email ou Senha</h1>
        <p className="change-credentials-subtitle">
          Para alterar suas credenciais, você precisará de um código de verificação enviado por email
        </p>

        {success && (
          <div className="success-message">
            Dados atualizados com sucesso. Redirecionando para o login...
          </div>
        )}

        {errors.length > 0 && (
          <div className="error-messages">
            {errors.map((error, index) => (
              <div key={index} className="error-message">{error}</div>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="mfa-request-section">
            <p className="info-text">
              Clique no botão abaixo para receber um código de verificação no seu email cadastrado.
            </p>
            {mfaCodeDebug && (
              <div className="debug-code">
                <strong>🔑 Modo Desenvolvimento - Código MFA:</strong>
                <div className="code-display">
                  <code onClick={() => navigator.clipboard.writeText(mfaCodeDebug)} title="Clique para copiar">{mfaCodeDebug}</code>
                </div>
                <small>Este código também aparece no console do backend. Clique no código para copiar.</small>
              </div>
            )}
            <button
              onClick={handleRequestMFACode}
              className="request-code-button"
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar Código para Email'}
            </button>
            {mfaCodeSent && (
              <div className="success-message" style={{ marginTop: '16px' }}>
                Código enviado! Verifique seu email e preencha o formulário abaixo.
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="change-credentials-form">
            <div className="form-section">
              <h2 className="section-title">Senha Atual</h2>
              <div className="form-group">
                <label htmlFor="currentPassword">
                  Senha Atual <span className="required">*</span>
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  required
                  placeholder="Digite sua senha atual"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="form-section">
              <h2 className="section-title">Código de Verificação</h2>
              <div className="form-group">
                <label htmlFor="mfaCode">
                  Código MFA <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="mfaCode"
                  name="mfaCode"
                  value={formData.mfaCode}
                  onChange={handleChange}
                  required
                  placeholder="Digite o código de 6 dígitos"
                  maxLength="6"
                  pattern="[0-9]{6}"
                />
                <p className="field-hint">Código de 6 dígitos enviado para seu email</p>
                {mfaCodeDebug && (
                  <div className="field-hint" style={{ background: '#e7f3ff', padding: '8px', borderRadius: '6px', marginTop: '8px' }}>
                    <strong style={{ color: '#19528d' }}>Modo Dev:</strong>{' '}
                    <code style={{ 
                      background: 'white', 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontWeight: 'bold',
                      color: '#19528d',
                      cursor: 'pointer'
                    }} 
                    onClick={() => navigator.clipboard.writeText(mfaCodeDebug)}
                    title="Clique para copiar">
                      {mfaCodeDebug}
                    </code>
                  </div>
                )}
              </div>
            </div>

            <div className="form-section">
              <h2 className="section-title">Novos Dados</h2>
              <p className="info-text">Preencha pelo menos um dos campos abaixo:</p>
              
              <div className="form-group">
                <label htmlFor="newEmail">
                  Novo Email
                </label>
                <input
                  type="email"
                  id="newEmail"
                  name="newEmail"
                  value={formData.newEmail}
                  onChange={handleChange}
                  placeholder="seu.novo.email@exemplo.com"
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">
                  Nova Senha
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Mínimo 8 caracteres, letra e número"
                  autoComplete="new-password"
                />
              </div>

              {formData.newPassword && (
                <div className="form-group">
                  <label htmlFor="confirmPassword">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirme a nova senha"
                    autoComplete="new-password"
                  />
                </div>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setMfaCodeSent(false);
                  setMfaCodeDebug('');
                }}
                className="cancel-button"
                disabled={loading}
              >
                Voltar
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Alterar Credenciais'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChangeCredentials;

