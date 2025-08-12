import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import authService from './authApi';
import { useAuth } from './useAuth';

/**
 * Composant de page de connexion
 * Gère le formulaire de connexion et l'authentification de l'utilisateur
 */
function LoginPage() {
    // États pour gérer le formulaire et les erreurs
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Récupération de l'état d'authentification
    const { user } = useAuth();
    
    // Si l'utilisateur est déjà connecté, le rediriger vers la page appropriée
    if (user) {
        if (user.role === 'RECRUTEUR') {
            return <Navigate to="/dashboard" replace />;
        } else {
            return <Navigate to="/" replace />;
        }
    }

    /**
     * Gère la soumission du formulaire de connexion
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation côté client
        if (!username || !password) {
            setError('Veuillez remplir tous les champs');
            return;
        }
        
        // Activer l'état de chargement et réinitialiser les erreurs
        setLoading(true);
        setError(null);

        try {
            // Appeler le service d'authentification
            const data = await authService.login(username, password);

            // Extraire les tokens de la réponse
            const { access, refresh } = data;
            
            if (!access) {
                throw new Error("Token d'accès manquant dans la réponse");
            }
            
            // Stocker les tokens dans le localStorage
            localStorage.setItem('accessToken', access);
            localStorage.setItem('refreshToken', refresh || '');

                try {
                    // Décoder le token pour vérifier sa validité et extraire les informations
                    const decodedToken = jwtDecode(access);
                    
                    // Déclencher la mise à jour de l'état d'authentification
                    window.dispatchEvent(new Event('storage'));
                    window.dispatchEvent(new CustomEvent('auth-change'));
                    
                    // Attendre un peu pour permettre la mise à jour de l'état
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Redirection basée sur le rôle de l'utilisateur
                    if (decodedToken.role === 'RECRUTEUR') {
                        // Si c'est un recruteur, rediriger directement vers le tableau de bord
                        window.location.href = '/dashboard';
                    } else {
                        // Sinon, rediriger vers la page d'accueil
                        window.location.href = '/';
                    }
                    
                } catch (error) {
                    throw new Error("Token invalide");
                }        } catch (err) {
            setError(err.message || 'Le nom d\'utilisateur ou le mot de passe est incorrect.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
            <h2>Connexion</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Nom d'utilisateur:</label>
                    <input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        required 
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Mot de passe:</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        required 
                    />
                </div>
                {error && <p style={{ color: 'red', marginBottom: '15px' }}>{error}</p>}
                <button 
                    type="submit" 
                    disabled={loading}
                    style={{ 
                        backgroundColor: '#4CAF50', 
                        color: 'white', 
                        padding: '10px 15px', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? 'Connexion en cours...' : 'Se connecter'}
                </button>
            </form>
        </div>
    );
}

export default LoginPage;