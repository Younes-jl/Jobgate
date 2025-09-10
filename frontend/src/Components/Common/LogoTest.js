import React from 'react';
import JobGateLogo from './JobGateLogo';

const LogoTest = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1>Test d'affichage du logo JobGate</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Logo Small:</h3>
        <JobGateLogo size="small" />
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Logo Medium:</h3>
        <JobGateLogo size="medium" />
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Logo Large:</h3>
        <JobGateLogo size="large" />
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Logo avec classe header (position absolue):</h3>
        <div style={{ position: 'relative', height: '100px', border: '1px solid #ccc' }}>
          <JobGateLogo size="medium" className="jobgate-logo-header" />
        </div>
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Test image directe:</h3>
        <img src="/logo-jobgate.png" alt="Test direct" style={{ height: '50px' }} />
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Test avec chemin absolu:</h3>
        <img src={process.env.PUBLIC_URL + '/logo-jobgate.png'} alt="Test absolu" style={{ height: '50px' }} />
      </div>
    </div>
  );
};

export default LogoTest;
