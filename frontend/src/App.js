/**
 * Composant principal de l'application
 * 
 * Gère le routage et l'affichage des différents composants en fonction
 * de l'état d'authentification et du rôle de l'utilisateur.
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';

// Importer les composants
import LoginPage from './Components/auth/LoginPage';
import RecruiterDashboard from './Components/dashboard/RecruiterDashboard';
import CreateOfferWithCampaign from './Components/offer/CreateOfferWithCampaign';
import CandidateDashboard from './Components/candidate/CandidateDashboard';
import JobOfferDetails from './Components/candidate/JobOfferDetails';
import ApplicationDetail from './Components/jobs/ApplicationDetail';

// Importer les styles CSS
import './Components/candidate/CandidateStyles.css';

// Importer notre hook d'authentification
import { useAuth } from './Components/auth/useAuth';

/**
 * Page d'accueil de l'application
 * 
 * Affiche un message de bienvenue et des options différentes selon
 * que l'utilisateur est connecté ou non et selon son rôle.
 * Redirige automatiquement les recruteurs vers leur tableau de bord.
 */
const HomePage = () => {
    const { user } = useAuth();
    
    // Rediriger automatiquement les recruteurs vers leur tableau de bord
    if (user && user.role === 'RECRUTEUR') {
        return <Navigate to="/dashboard" replace />;
    }
    
    // Rediriger automatiquement les candidats vers leur dashboard
    if (user && user.role === 'CANDIDAT') {
        return <Navigate to="/candidate/dashboard" replace />;
    }
    
    return (
        <div>
            <h2>Bienvenue sur l'Application</h2>
            {user ? (
                <div>
                    <p>Vous êtes connecté en tant que: {user.username}</p>
                    <p>Votre rôle: {user.role}</p>
                </div>
            ) : (
                <p>Veuillez vous connecter pour accéder à votre espace.</p>
            )}
        </div>
    );
};



/**
 * Bouton de déconnexion
 * 
 * Permet à l'utilisateur de se déconnecter en supprimant les tokens
 * d'authentification et en déclenchant un événement de changement d'état.
 */
function LogoutButton() {
    const navigate = useNavigate();
    const handleLogout = () => {
        // Supprimer les tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        // Déclencher l'événement de changement d'authentification
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('auth-change'));
        
        // Attendre un peu pour permettre la mise à jour de l'état
        setTimeout(() => {
            navigate('/');  // Redirection vers la page d'accueil au lieu de la page de connexion
        }, 100);
    };
    return <button onClick={handleLogout} style={{ marginLeft: '15px', padding: '5px 10px' }}>Déconnexion</button>;
}

/**
 * Composant principal App
 * 
 * Configure le routeur et définit les routes de l'application.
 * Gère également l'affichage de la barre de navigation.
 */
function App() {
    const { user, isTokenChecked } = useAuth();

    // Si le token n'est pas encore vérifié, on peut afficher un indicateur de chargement
    if (!isTokenChecked) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <p>Chargement...</p>
            </div>
        );
    }

    return (
        <Router>
            <div>
                <nav style={{ background: '#f0f0f0', padding: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                        <Link to="/" style={{ marginRight: '15px', fontSize: '18px', fontWeight: 'bold' }}>Application</Link>
                        {user && user.role === 'RECRUTEUR' && (
                            <Link to="/dashboard" style={{ marginRight: '15px' }}>Tableau de bord</Link>
                        )}
                        {user && user.role === 'CANDIDAT' && (
                            <Link to="/candidate/dashboard" style={{ marginRight: '15px' }}>Offres d'emploi</Link>
                        )}
                    </div>
                    <div>
                        {user ? (
                            // Ce qui est affiché si l'utilisateur est connecté
                            <>
                                <span>Bonjour, {user.username} ({user.role})</span>
                                <LogoutButton />
                            </>
                        ) : (
                            // Ce qui est affiché si l'utilisateur n'est pas connecté
                            <Link to="/login" style={{ padding: '5px 10px', backgroundColor: '#4CAF50', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>Se Connecter</Link>
                        )}
                    </div>
                </nav>

                <hr />

                <div style={{ padding: '20px' }}>
                    <Routes>
                        {/* Page d'accueil */}
                        <Route path="/" element={<HomePage />} />
                        
                        {/* La page login */}
                        <Route path="/login" element={
                            user ? (
                                user.role === 'RECRUTEUR' ? 
                                <Navigate to="/dashboard" replace /> : 
                                <Navigate to="/candidate/dashboard" replace />
                            ) : 
                            <LoginPage />
                        } />
                        
                        {/* Tableau de bord recruteur (protégé) */}
                        <Route path="/dashboard" element={
                            user && user.role === 'RECRUTEUR' ? 
                            <RecruiterDashboard /> : 
                            <Navigate to="/" replace />
                        } />
                        
                        {/* Création d'offre avec campagne (protégé) */}
                        <Route path="/create-offer" element={
                            user && user.role === 'RECRUTEUR' ? 
                            <CreateOfferWithCampaign /> : 
                            <Navigate to="/" replace />
                        } />
                        
                        {/* Tableau de bord candidat (protégé) */}
                        <Route path="/candidate/dashboard" element={
                            user && user.role === 'CANDIDAT' ? 
                            <CandidateDashboard /> : 
                            <Navigate to="/" replace />
                        } />
                        
                        {/* Détails d'une offre d'emploi (protégé) */}
                        <Route path="/job-offers/:id" element={
                            user && user.role === 'CANDIDAT' ? 
                            <JobOfferDetails /> : 
                            <Navigate to="/" replace />
                        } />
                        
                        {/* Détails d'une candidature (protégé pour recruteur) */}
                        <Route path="/applications/:id" element={
                            user && user.role === 'RECRUTEUR' ? 
                            <ApplicationDetail /> : 
                            <Navigate to="/" replace />
                        } />
                        
                        {/* Redirection pour toute autre URL non trouvée */}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;
