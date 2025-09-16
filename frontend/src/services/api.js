import axios from 'axios';

/**
 * Configuration de l'instance Axios pour communiquer avec l'API
 * 
 * Cette instance est préconfigurée avec l'URL de base de l'API, un timeout,
 * et les en-têtes par défaut pour les requêtes JSON.
 */
const api = axios.create({
    baseURL: 'http://localhost:8000/api', // URL de base de notre API Django
    timeout: 120000, // Timeout de 2 minutes pour l'évaluation IA
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

/**
 * Intercepteur de requêtes
 * 
 * S'exécute AVANT chaque requête pour ajouter le token d'authentification
 * si celui-ci est disponible dans le localStorage.
 */
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        
        if (token) {
            // Si un jeton existe, on l'ajoute à l'en-tête Authorization
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * Intercepteur de réponses
 * 
 * Gère les erreurs communes comme les problèmes d'authentification (401)
 * ou d'autorisation (403).
 */
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response) {
            // Possibilité d'implémenter un refresh token ici si 401
            if (error.response.status === 401) {
                // Token invalide ou expiré
                // À implémenter: logique de refresh token
            }
            
            // Accès refusé par manque de permissions
            if (error.response.status === 403) {
                // Redirection ou notification à l'utilisateur possible ici
            }
        }
        
        return Promise.reject(error);
    }
);

export default api;