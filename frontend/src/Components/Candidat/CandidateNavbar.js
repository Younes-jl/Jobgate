import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import './CandidateNavbar.css';

const CandidateNavbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [openMenu, setOpenMenu] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('auth-change'));
    
    setTimeout(() => {
      navigate('/');
    }, 100);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="top-navbar">
      <div className="navbar-content">
        <div className="brand-section">
          <Link to="/candidate/offers" className="brand-logo">
            JOBGATE
          </Link>
        </div>
        
        <div className="top-nav-links">
    
          <Link 
            to="/candidate/offers" 
            className={`nav-link ${isActive('/candidate/offers') ? 'active' : ''}`}
          >
            Offres d'emploi
          </Link>
          <Link 
            to="/candidate/dashboard" 
            className={`nav-link ${isActive('/candidate/dashboard') ? 'active' : ''}`}
          >
            Tableau de bord
          </Link>
        </div>
        
        <div className="user-section">
          <button 
            className="user-avatar btn-reset" 
            onClick={() => setOpenMenu(prev => !prev)}
            aria-haspopup="true"
            aria-expanded={openMenu}
            title={`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Profil'}
          >
            <i className="bi bi-person-circle"></i>
          </button>

          {openMenu && (
            <div className="user-menu" role="menu">
              <div className="user-menu-header">
                <div className="user-menu-name">{user?.first_name} {user?.last_name}</div>
                <div className="user-menu-email">{user?.email}</div>
              </div>
              <hr className="user-menu-divider" />
              <Link className="user-menu-item" to="/candidate/infos-personnelles" onClick={() => setOpenMenu(false)}>
                <i className="bi bi-person me-2"></i>
                Mon profil
              </Link>
              <button className="user-menu-item danger" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-2"></i>
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default CandidateNavbar;
