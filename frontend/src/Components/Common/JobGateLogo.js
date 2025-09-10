import React from 'react';
import './JobGateLogo.css';

const JobGateLogo = ({ size = 'medium', className = '', onClick = null }) => {
  const sizeStyles = {
    small: { width: '80px', height: '30px' },
    medium: { width: '120px', height: '45px' },
    large: { width: '160px', height: '60px' }
  };

  const logoStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    cursor: onClick ? 'pointer' : 'default',
    ...sizeStyles[size]
  };

  const imgStyle = {
    maxWidth: '100%',
    height: 'auto',
    objectFit: 'contain',
    height: sizeStyles[size].height
  };

  return (
    <div 
      className={`jobgate-logo ${className}`}
      onClick={onClick}
      style={logoStyle}
    >
      <img 
        src={process.env.PUBLIC_URL + '/logo-jobgate.png'} 
        alt="JobGate" 
        style={imgStyle}
        onError={(e) => {
          console.error('Erreur de chargement du logo:', e);
          e.target.style.display = 'none';
        }}
      />
    </div>
  );
};

export default JobGateLogo;
