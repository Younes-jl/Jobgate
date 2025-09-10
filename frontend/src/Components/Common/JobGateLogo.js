import React from 'react';
import './JobGateLogo.css';

const JobGateLogo = ({ size = 'medium', className = '', onClick = null }) => {
  const sizeStyles = {
    small:  { width: '120px', height: '45px' },   // +20px largeur, +7px hauteur
    medium: { width: '170px', height: '65px' },   // +20px largeur, +9px hauteur
    large:  { width: '230px', height: '85px' }    // +30px largeur, +10px hauteur
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
