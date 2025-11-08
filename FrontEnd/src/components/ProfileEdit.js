import React, { useState, useEffect } from 'react';
import { getToken, getUser, setAuth } from '../utils/auth';
import './ProfileEdit.css';

const ProfileEdit = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    yearOfBirth: '',
    gender: '',
    course: '',
    yearOfEntry: '',
    interests: '',
    currentPassword: ''
  });

  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);


  // Common courses at Unifei
  const availableCourses = [
    'Engenharia de Computação',
    'Engenharia Elétrica',
    'Engenharia Mecânica',
    'Engenharia Química',
    'Engenharia Civil',
    'Engenharia de Produção',
    'Engenharia de Materiais',
    'Engenharia Física',
    'Administração',
    'Ciências da Computação',
    'Matemática',
    'Física'
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      const token = getToken();
      if (!token) {
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
            window.location.href = '/login';
            return;
          }
          throw new Error('Erro ao carregar perfil');
        }

        const data = await response.json();
        if (data.success && data.user) {
          // Pre-fill form with user data
          setFormData({
            fullName: data.user.fullName || '',
            yearOfBirth: data.user.yearOfBirth || '',
            gender: data.user.gender || '',
            course: data.user.course || '',
            yearOfEntry: data.user.yearOfEntry || '',
            interests: typeof data.user.interests === 'string' ? data.user.interests : (Array.isArray(data.user.interests) ? data.user.interests.join(', ') : ''),
            currentPassword: ''
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        // Fallback to cached user
        const cachedUser = getUser();
        if (cachedUser) {
          setFormData({
            fullName: cachedUser.fullName || '',
            yearOfBirth: cachedUser.yearOfBirth || '',
            gender: cachedUser.gender || '',
            course: cachedUser.course || '',
            yearOfEntry: cachedUser.yearOfEntry || '',
            interests: typeof cachedUser.interests === 'string' ? cachedUser.interests : (Array.isArray(cachedUser.interests) ? cachedUser.interests.join(', ') : ''),
            currentPassword: ''
          });
        }
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, []);

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


  const generateYearOptions = (startYear, endYear) => {
    const years = [];
    for (let year = endYear; year >= startYear; year--) {
      years.push(year);
    }
    return years;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSuccess(false);
    setLoading(true);

    try {
      const token = getToken();
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      
      // Prepare data to send (without currentPassword in the main object)
      const { currentPassword, ...updateData } = formData;
      
      const response = await fetch(`${apiUrl}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...updateData,
          currentPassword
        }),
      });

      if (!response.ok) {
        // Try to parse error response
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        if (errorData.errors && Array.isArray(errorData.errors)) {
          setErrors(errorData.errors);
        } else {
          setErrors([errorData.message || 'Erro ao atualizar perfil']);
        }
        setLoading(false);
        return;
      }

      const data = await response.json();

      // Success
      setSuccess(true);
      setLoading(false);
      
      // Update localStorage with fresh data
      if (data.user) {
        setAuth(token, data.user);
      }
      
      // Clear password field
      setFormData(prev => ({ ...prev, currentPassword: '' }));

      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/profile';
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

  const currentYear = new Date().getFullYear();
  const birthYears = generateYearOptions(1950, currentYear - 16);
  const entryYears = generateYearOptions(2000, currentYear);

  if (loadingProfile) {
    return (
      <div className="profile-edit-container">
        <div className="profile-edit-card">
          <div className="loading-message">Carregando perfil...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-edit-container">
      <div className="profile-edit-card">
        <h1 className="profile-edit-title">Editar Perfil</h1>
        <p className="profile-edit-subtitle">Atualize suas informações cadastrais</p>

        {success && (
          <div className="success-message">
            Perfil atualizado com sucesso! Redirecionando...
          </div>
        )}

        {errors.length > 0 && (
          <div className="error-messages">
            {errors.map((error, index) => (
              <div key={index} className="error-message">{error}</div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-edit-form">
          <div className="form-section">
            <h2 className="section-title">Informações Pessoais</h2>
            
            <div className="form-group">
              <label htmlFor="fullName">
                Nome Completo <span className="required">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="Digite seu nome completo"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="yearOfBirth">
                  Ano de Nascimento <span className="required">*</span>
                </label>
                <select
                  id="yearOfBirth"
                  name="yearOfBirth"
                  value={formData.yearOfBirth}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecione</option>
                  {birthYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="gender">
                  Gênero <span className="required">*</span>
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecione</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2 className="section-title">Informações Acadêmicas</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="course">
                  Curso <span className="required">*</span>
                </label>
                <select
                  id="course"
                  name="course"
                  value={formData.course}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecione seu curso</option>
                  {availableCourses.map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="yearOfEntry">
                  Ano de Ingresso <span className="required">*</span>
                </label>
                <select
                  id="yearOfEntry"
                  name="yearOfEntry"
                  value={formData.yearOfEntry}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecione</option>
                  {entryYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2 className="section-title">Interesses</h2>
            <div className="form-group">
              <label htmlFor="interests">
                Interesses <span className="required">*</span>
              </label>
              <textarea
                id="interests"
                name="interests"
                value={formData.interests}
                onChange={handleChange}
                required
                maxLength={600}
                placeholder="Descreva seus interesses (máximo 600 caracteres)"
                rows={4}
                className="interests-textarea"
              />
              <span className="char-count">{formData.interests.length}/600</span>
            </div>
          </div>

          <div className="form-section password-section">
            <h2 className="section-title">Confirmação</h2>
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
                placeholder="Digite sua senha atual para confirmar"
                autoComplete="current-password"
              />
              <p className="field-hint">É necessário informar sua senha atual para salvar as alterações</p>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button"
              onClick={() => window.location.href = '/profile'}
              className="cancel-button"
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEdit;

