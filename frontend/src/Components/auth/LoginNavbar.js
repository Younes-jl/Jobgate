import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './LoginNavbar.css';

const LoginNavbar = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <nav className="top-navbar">
      <div className="navbar-content">
        <div className="brand-section">
          <Link to="/" className="brand-logo">
            JOBGATE
          </Link>
        </div>
        
        {!isLoginPage && (
          <div className="login-section">
            <Link to="/login" className="login-button">
              Se Connecter
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default LoginNavbar;
