import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Testando conexão com o backend via proxy
    console.log('Tentando conectar ao backend via /api/test...');
    fetch('/api/test', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    })
      .then(res => {
        console.log('Resposta recebida:', res.status, res.statusText);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Dados recebidos:', data);
        setMessage(data.message);
      })
      .catch(err => {
        console.error('Erro ao conectar via proxy:', err);
        // Tentar conectar diretamente como fallback
        console.log('Tentando conexão direta...');
        fetch('http://localhost:3001/api/test')
          .then(res => res.json())
          .then(data => {
            console.log('Conexão direta funcionou!', data);
            setMessage(`Conexão direta OK: ${data.message}`);
          })
          .catch(e => {
            console.error('Erro na conexão direta também:', e);
            setMessage(`Erro: ${err.message}. Verifique o console para mais detalhes.`);
          });
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>FrontEnd React</h1>
        <p>{message || 'Carregando...'}</p>
      </header>
    </div>
  );
}

export default App;

