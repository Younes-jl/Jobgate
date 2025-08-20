// Test des endpoints d'API pour les statistiques
// Ce fichier peut être supprimé après les tests

const API_BASE_URL = 'http://localhost:8000/api';

async function testEndpoints() {
  const token = localStorage.getItem('accessToken');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  console.log('🧪 Test des endpoints d\'API...');
  
  const endpoints = [
    '/jobs/dashboard/',
    '/jobs/',
    '/interviews/applications/recruiter/',
    '/interviews/applications/'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Test de ${endpoint}...`);
      const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${endpoint} - Réussi:`, {
          status: response.status,
          dataLength: Array.isArray(data) ? data.length : 'N/A',
          sampleData: Array.isArray(data) && data.length > 0 ? data[0] : data
        });
      } else {
        console.log(`❌ ${endpoint} - Erreur ${response.status}:`, response.statusText);
      }
    } catch (error) {
      console.log(`💥 ${endpoint} - Exception:`, error.message);
    }
  }
}

// Fonction à appeler depuis la console du navigateur
window.testAPIEndpoints = testEndpoints;

console.log('🔧 Script de test d\'API chargé. Tapez testAPIEndpoints() dans la console pour tester.');
