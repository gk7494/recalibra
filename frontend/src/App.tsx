import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Outlet } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Models from './components/Models';
import Sync from './components/Sync';
import Logo from './components/Logo';
import { api } from './services/api';

function NavLinks() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (location.pathname === path) return true;
    return location.pathname.startsWith(`${path}/`);
  };

  return (
    <div className="nav-links">
      <Link 
        to="/app" 
        className={`nav-link ${isActive('/app') ? 'active' : ''}`}
      >
        Dashboard
      </Link>
      <Link 
        to="/app/models" 
        className={`nav-link ${isActive('/app/models') ? 'active' : ''}`}
      >
        Models
      </Link>
      <Link 
        to="/app/sync" 
        className={`nav-link ${isActive('/app/sync') ? 'active' : ''}`}
      >
        Sync Data
      </Link>
    </div>
  );
}

function PlatformLayout() {
  const [health, setHealth] = useState<string>('checking...');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await api.get('/health');
        if (response.status === 200) {
          setHealth('connected');
        } else {
          setHealth('disconnected');
        }
      } catch (error) {
        console.error('Health check failed:', error);
        setHealth('disconnected');
      }
    };
    
    checkHealth();
    // Check health every 5 seconds
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="App">
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Logo />
          </Link>
          <NavLinks />
          <div className="nav-status">
            <span className={health === 'connected' ? 'status-online' : 'status-offline'}>{health}</span>
          </div>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<PlatformLayout />}>
          <Route index element={<Home />} />
          <Route path="models" element={<Models />} />
          <Route path="sync" element={<Sync />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

