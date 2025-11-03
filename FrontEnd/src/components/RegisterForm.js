import React, { useState } from 'react';
import './RegisterForm.css';

const RegisterForm = ({ navigateToLogin }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    yearOfBirth: '',
    gender: '',
    course: '',
    yearOfEntry: '',
    interests: []
  });

  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Common interests for university students
  const availableInterests = [
    'Esportes',
    'Música',
    'Arte',
    'Tecnologia',
    'Literatura',
    'Cinema',
    'Jogos',
    'Dança',
    'Teatro',
    'Voluntariado',
    'Academia',
    'Viagens',
    'Fotografia',
    'Culinária',
    'Idiomas'
  ];

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

  const handleInterestChange = (interest) => {
    setFormData(prev => {
      const interests = prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest];
      return { ...prev, interests };
    });
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
      // Try proxy first, fallback to direct backend URL
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/users/register`, {
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
        setErrors(errorData.errors || ['Erro ao cadastrar usuário']);
        setLoading(false);
        return;
      }

      const data = await response.json();

      // Success
      setSuccess(true);
      setLoading(false);
      
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        yearOfBirth: '',
        gender: '',
        course: '',
        yearOfEntry: '',
        interests: []
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        // Redirect to login page after successful registration
        if (navigateToLogin) {
          navigateToLogin();
        } else {
          window.location.href = '/login';
        }
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      // Check if it's a network error or JSON parse error
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

  return (
    <div className="register-container">
      <div className="register-card">
        <h1 className="register-title">Cadastre-se</h1>
        <p className="register-subtitle">Preencha os campos abaixo para se cadastrar no PADUNI</p>

        {success && (
          <div className="success-message">
            Usuário cadastrado com sucesso! Redirecionando...
          </div>
        )}

        {errors.length > 0 && (
          <div className="error-messages">
            {errors.map((error, index) => (
              <div key={index} className="error-message">{error}</div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
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

          <div className="form-group">
            <label htmlFor="email">
              Email <span className="required">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="seu.email@exemplo.com"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">
                Senha <span className="required">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                Confirmar Senha <span className="required">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirme sua senha"
              />
            </div>
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
                <option value="Não-binário">Não-binário</option>
                <option value="Prefiro não informar">Prefiro não informar</option>
              </select>
            </div>
          </div>

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

          <div className="form-group">
            <label>
              Interesses <span className="required">*</span>
            </label>
            <div className="interests-grid">
              {availableInterests.map(interest => (
                <label key={interest} className="interest-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.interests.includes(interest)}
                    onChange={() => handleInterestChange(interest)}
                  />
                  <span>{interest}</span>
                </label>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>

        <div className="register-footer">
          <p>Já tem uma conta?{' '}
            <a 
              href="/login" 
              onClick={(e) => {
                e.preventDefault();
                if (navigateToLogin) {
                  navigateToLogin();
                } else {
                  window.location.href = '/login';
                }
              }}
            >
              Faça login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;

