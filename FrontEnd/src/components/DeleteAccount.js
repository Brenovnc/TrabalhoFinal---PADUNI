import React, { useState } from 'react';
import { getToken } from '../utils/auth';
import './DeleteAccount.css';

const DeleteAccount = () => {
  const [step, setStep] = useState(1); // 1: Request code, 2: Confirm deletion
  const [formData, setFormData] = useState({
    currentPassword: '',
    confirmationCode: ''
  });

  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [debugCode, setDebugCode] = useState(''); // For development only
  const [confirmText, setConfirmText] = useState(''); // For final confirmation

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

  const handleRequestCode = async () => {
    setErrors([]);
    setLoading(true);
    setCodeSent(false);

    try {
      const token = getToken();
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/users/request-deletion-code`, {
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
      setCodeSent(true);
      
      // Show debug code if provided (always in development)
      if (data.debugCode) {
        setDebugCode(data.debugCode);
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

    // Final confirmation text validation
    if (confirmText.toLowerCase() !== 'excluir') {
      setErrors(['Para confirmar, digite "EXCLUIR" no campo de confirmação']);
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
      
      const response = await fetch(`${apiUrl}/users/account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          confirmationCode: formData.confirmationCode
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        setErrors([errorData.message || 'Erro ao excluir conta']);
        setLoading(false);
        return;
      }

      const data = await response.json();

      // Success
      setSuccess(true);
      setLoading(false);

      // Clear local storage and redirect to login after 3 seconds
      setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }, 3000);
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
    <div className="delete-account-container">
      <div className="delete-account-card">
        <div className="warning-header">
          <h1 className="delete-account-title">⚠️ Excluir Conta</h1>
          <p className="delete-account-warning">
            Esta é uma ação <strong>IRREVERSÍVEL</strong>
          </p>
        </div>
        
        <p className="delete-account-subtitle">
          Ao excluir sua conta, todos os seus dados serão permanentemente removidos do sistema, 
          em conformidade com a LGPD. Esta ação não pode ser desfeita.
        </p>

        {success && (
          <div className="success-message">
            Conta excluída com sucesso. Redirecionando para o login...
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
          <div className="deletion-request-section">
            <div className="warning-box">
              <h3>⚠️ Avisos Importantes</h3>
              <ul className="warning-list">
                <li>Todos os seus dados serão permanentemente removidos</li>
                <li>Esta ação não pode ser desfeita</li>
                <li>Você precisará se cadastrar novamente se quiser usar o sistema</li>
                <li>Você receberá um código de confirmação por email</li>
              </ul>
            </div>

            {debugCode && (
              <div className="debug-code">
                <strong>🔑 Modo Desenvolvimento - Código de Confirmação:</strong>
                <div className="code-display">
                  <code onClick={() => navigator.clipboard.writeText(debugCode)} title="Clique para copiar">{debugCode}</code>
                </div>
                <small>Este código também aparece no console do backend. Clique no código para copiar.</small>
              </div>
            )}

            <button
              onClick={handleRequestCode}
              className="request-code-button"
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Solicitar Código de Confirmação'}
            </button>

            {codeSent && (
              <div className="success-message" style={{ marginTop: '16px' }}>
                Código enviado! Verifique seu email e preencha o formulário abaixo.
              </div>
            )}

            <div className="cancel-section">
              <button
                onClick={() => window.location.href = '/profile'}
                className="cancel-button"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="delete-account-form">
            <div className="warning-box">
              <h3>⚠️ Confirmação Final</h3>
              <p>Para confirmar a exclusão permanente, preencha os campos abaixo:</p>
            </div>

            <div className="form-section">
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
              <div className="form-group">
                <label htmlFor="confirmationCode">
                  Código de Confirmação <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="confirmationCode"
                  name="confirmationCode"
                  value={formData.confirmationCode}
                  onChange={handleChange}
                  required
                  placeholder="Digite o código de 6 dígitos"
                  maxLength="6"
                  pattern="[0-9]{6}"
                />
                <p className="field-hint">Código de 6 dígitos enviado para seu email</p>
                {debugCode && (
                  <div className="field-hint" style={{ background: '#fee', padding: '8px', borderRadius: '6px', marginTop: '8px' }}>
                    <strong style={{ color: '#e74c3c' }}>Modo Dev:</strong>{' '}
                    <code style={{ 
                      background: 'white', 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontWeight: 'bold',
                      color: '#e74c3c',
                      cursor: 'pointer'
                    }} 
                    onClick={() => navigator.clipboard.writeText(debugCode)}
                    title="Clique para copiar">
                      {debugCode}
                    </code>
                  </div>
                )}
              </div>
            </div>

            <div className="form-section">
              <div className="form-group">
                <label htmlFor="confirmText">
                  Digite "EXCLUIR" para confirmar <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="confirmText"
                  name="confirmText"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  required
                  placeholder="Digite EXCLUIR"
                />
                <p className="field-hint">
                  Esta é uma medida de segurança adicional. Digite exatamente "EXCLUIR" para confirmar.
                </p>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setCodeSent(false);
                  setDebugCode('');
                }}
                className="cancel-button"
                disabled={loading}
              >
                Voltar
              </button>
              <button
                type="submit"
                className="delete-button"
                disabled={loading || confirmText.toLowerCase() !== 'excluir'}
              >
                {loading ? 'Excluindo...' : '⚠️ Excluir Conta Permanentemente'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default DeleteAccount;

