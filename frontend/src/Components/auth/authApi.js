import axios from 'axios';

// L'URL de base de notre API
const API_URL = 'http://localhost:8000/api/token/';

/**
 * Fonction qui gère l'appel API pour la connexion.
 * @param {string} username - Le nom d'utilisateur.
 * @param {string} password - Le mot de passe.
 * @returns {Promise<Object>} La réponse de l'API contenant les jetons.
 */
const login = async (username, password) => {
    try {
        // Configuration des en-têtes pour la requête
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        // Envoi de la requête POST avec les identifiants
        const response = await axios.post(API_URL, {
            username,
            password,
        }, { headers });
        
        return response.data;
    } catch (error) {
        // Gestion des différents types d'erreurs
        if (error.response) {
            // Erreur avec réponse du serveur (ex: 400, 401, 500)
            throw new Error(error.response.data?.detail || 'Échec de la connexion');
        } else if (error.request) {
            // Erreur sans réponse du serveur (ex: problème réseau)
            throw new Error('Pas de réponse du serveur. Vérifiez votre connexion internet.');
        } else {
            // Erreur inattendue
            throw new Error('Erreur lors de la configuration de la requête');
        }
    }
};

const authService = {
    login,
};

export default authService;