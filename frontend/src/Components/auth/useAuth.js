import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

/**
 * Hook personnalisé pour gérer l'authentification des utilisateurs.
 * Gère la vérification du token, sa validité et les changements d'état de connexion.
 * @returns {Object} État d'authentification contenant l'utilisateur et l'état de vérification du token
 */
export const useAuth = () => {
    // État pour stocker les informations de l'utilisateur connecté
    const [user, setUser] = useState(null);
    // État pour indiquer si la vérification initiale du token est terminée
    const [isTokenChecked, setIsTokenChecked] = useState(false);

    /**
     * Vérifie la validité du token et met à jour l'état de l'utilisateur
     */
    const checkToken = () => {
        const token = localStorage.getItem('accessToken');
        
        if (token) {
            try {
                // Décoder le token pour obtenir les informations utilisateur
                const decodedUser = jwtDecode(token);
                
                // Vérifier si le token est expiré
                const isExpired = decodedUser.exp * 1000 < Date.now();
                if (isExpired) {
                    // Supprimer le token expiré et déconnecter l'utilisateur
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    setUser(null);
                } else {
                    // Token valide, mettre à jour l'état utilisateur
                    setUser(decodedUser);
                }
            } catch (e) {
                // En cas d'erreur de décodage, supprimer le token et déconnecter
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                setUser(null);
            }
        } else {
            // Aucun token trouvé, utilisateur non connecté
            setUser(null);
        }
        // Marquer la vérification comme terminée
        setIsTokenChecked(true);
    };

    useEffect(() => {
        // Vérifier le token immédiatement au montage du composant
        checkToken();

        // Gestionnaire pour les changements dans localStorage
        const handleStorageChange = () => {
            checkToken();
        };

        // Gestionnaire pour les changements de visibilité de la page
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkToken();
            }
        };

        // Ajouter les écouteurs d'événements
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('auth-change', handleStorageChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Vérifier périodiquement le token toutes les 15 secondes
        const interval = setInterval(checkToken, 15000);
        
        // Nettoyer les écouteurs lors du démontage
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('auth-change', handleStorageChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(interval);
        };
    }, []);

    return {
        user, 
        isTokenChecked,
        isAuthenticated: user !== null // Ajoute la propriété isAuthenticated basée sur la présence d'un utilisateur
    };
};