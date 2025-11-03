import React, { useEffect, useState } from 'react';
import RegisterForm from './components/RegisterForm';
import LoginForm from './components/LoginForm';
import Home from './components/Home';
import { isAuthenticated } from './utils/auth';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('login');

  useEffect(() => {
    // Check URL to determine which view to show
    const updateView = () => {
      const path = window.location.pathname;
      
      // If user is authenticated and on home, show home
      if (isAuthenticated() && (path === '/' || path === '/home')) {
        setCurrentView('home');
        return;
      }

      // Check other routes
      if (path === '/register' || path === '/cadastro') {
        setCurrentView('register');
      } else if (path === '/login') {
        setCurrentView('login');
      } else if (isAuthenticated()) {
        // Authenticated but on unknown route, redirect to home
        window.history.pushState({}, '', '/');
        setCurrentView('home');
      } else {
        // Not authenticated, show login
        setCurrentView('login');
      }
    };

    updateView();

    // Listen to browser back/forward buttons
    const handlePopState = () => {
      updateView();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (view) => {
    if (view === 'register') {
      window.history.pushState({}, '', '/register');
      setCurrentView('register');
    } else if (view === 'home') {
      window.history.pushState({}, '', '/');
      setCurrentView('home');
    } else {
      window.history.pushState({}, '', '/login');
      setCurrentView('login');
    }
  };

  // Render appropriate component based on current view
  if (currentView === 'home') {
    return (
      <div className="App">
        <Home />
      </div>
    );
  }

  if (currentView === 'register') {
    return (
      <div className="App">
        <RegisterForm navigateToLogin={() => navigateTo('login')} />
      </div>
    );
  }

  return (
    <div className="App">
      <LoginForm navigateToRegister={() => navigateTo('register')} />
    </div>
  );
}

export default App;

