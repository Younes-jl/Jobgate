/**
 * Composant principal de l'application
 * 
 * Gère le routage et l'affichage des différents composants en fonction
 * de l'état d'authentification et du rôle de l'utilisateur.
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Importer les composants
import LoginPage from './Components/auth/LoginPage';
import RecruiterDashboard from './Components/Recruteur/RecruiterDashboard';
import CreateOfferWithCampaign from './Components/Recruteur/CreateOfferWithCampaign';
import RecruiterJobOfferDetails from './Components/Recruteur/JobOfferDetails';
import OfferCampaignDetails from './Components/Recruteur/OfferCampaignDetails';
import EditCampaign from './Components/Recruteur/EditCampaign';
import InterviewDetails from './Components/Recruteur/InterviewDetails';
import CandidateDashboard from './Components/Candidat/CandidateDashboard';
import CandidateDetails from './Components/Candidat/CandidateDetails';
import CandidateNotifications from './Components/Candidat/CandidateNotifications';
import InfosPersonnels from './Components/Candidat/InfosPersonnels';
import JobOfferDetails from './Components/Candidat/JobOfferDetails';
import CandidateNavbar from './Components/Candidat/CandidateNavbar';
import RecruiterNavbar from './Components/Recruteur/RecruiterNavbar';
import LoginNavbar from './Components/auth/LoginNavbar';
import EntretienPage from './Components/Entretien/entretienDetails';
import HiringManagerDashboard from './Components/HiringManager/HiringManagerDashboard';


// Importer les styles CSS
import './Components/Candidat/CandidateStyles.css';

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
    
    // Rediriger automatiquement les candidats vers les offres
    if (user && user.role === 'CANDIDAT') {
        return <Navigate to="/candidate/offers" replace />;
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
 * Composant pour gérer l'affichage conditionnel de la navbar
 */
function AppContent() {
    const { user, isTokenChecked } = useAuth();
    const location = useLocation();
    
    // Vérifier si on est sur la page d'entretien, hiring manager ou de login
    const isInterviewPage = location.pathname.startsWith('/interview/');
    const isHiringManagerPage = location.pathname.startsWith('/hiring-manager/');
    const isLoginPage = location.pathname === '/login';

    // Si le token n'est pas encore vérifié, on peut afficher un indicateur de chargement
    if (!isTokenChecked) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <p>Chargement...</p>
            </div>
        );
    }

    return (
        <div>
            {/* Afficher la navbar seulement si on n'est PAS sur la page d'entretien ou hiring manager */}
            {!isInterviewPage && !isHiringManagerPage && (
                <>
                    {/* Navbar pour la page de login */}
                    {isLoginPage && <LoginNavbar />}
                    
                    {/* Navbar pour les candidats */}
                    {user && user.role === 'CANDIDAT' && <CandidateNavbar />}
                    
                    {/* Navbar pour les recruteurs */}
                    {user && user.role === 'RECRUTEUR' && <RecruiterNavbar />}
                    
                    {/* Navbar pour les utilisateurs non connectés (sauf page login) */}
                    {!user && !isLoginPage && <LoginNavbar />}
                </>
            )}

            <div style={{ padding: (isInterviewPage || isHiringManagerPage) ? '0' : '20px', paddingTop: (user && (user.role === 'CANDIDAT' || user.role === 'RECRUTEUR')) || isLoginPage || (!user && !isLoginPage) ? '80px' : '0' }}>
                    <Routes>
                        {/* Page d'entretien via lien d'invitation (publique) - DOIT ÊTRE EN PREMIER */}
                        <Route path="/interview/start/:token" element={<EntretienPage />} />
                        
                        {/* Page Hiring Manager via token JWT (publique) */}
                        <Route path="/hiring-manager/:token" element={<HiringManagerDashboard />} />
                        
              
                        
                        {/* Page d'accueil */}
                        <Route path="/" element={<HomePage />} />
                        
                        {/* La page login */}
                        <Route path="/login" element={
                            user ? (
                                user.role === 'RECRUTEUR' ? 
                                <Navigate to="/dashboard" replace /> : 
                                <Navigate to="/candidate/offers" replace />
                            ) : 
                            <LoginPage />
                        } />
                        
                        {/* Tableau de bord recruteur (protégé) */}
                        <Route path="/dashboard" element={
                            user && user.role === 'RECRUTEUR' ? 
                            <RecruiterDashboard /> : 
                            user && user.role === 'CANDIDAT' ?
                            <Navigate to="/candidate/offers" replace /> :
                            <Navigate to="/" replace />
                        } />
                        
                        {/* Création d'offre avec campagne (protégé) */}
                        <Route path="/create-offer" element={
                            user && user.role === 'RECRUTEUR' ? 
                            <CreateOfferWithCampaign /> : 
                            <Navigate to="/" replace />
                        } />
                        
                        {/* Détails complets d'une offre avec campagne (protégé) */}
                        <Route path="/offers/:id/details" element={
                            user && user.role === 'RECRUTEUR' ? 
                            <OfferCampaignDetails /> : 
                            <Navigate to="/" replace />
                        } />
                        
                        {/* Modification d'une campagne (protégé) */}
                        <Route path="/campaigns/:id/edit" element={
                            user && user.role === 'RECRUTEUR' ? 
                            <EditCampaign /> : 
                            <Navigate to="/" replace />
                        } />
                        
                        {/* Détails d'une offre pour recruteur (protégé) */}
                        <Route path="/offers/:id" element={
                            user && user.role === 'RECRUTEUR' ? 
                            <RecruiterJobOfferDetails /> : 
                            <Navigate to="/" replace />
                        } />
                        
                        {/* Détails d'entretien pour évaluation (protégé) */}
                        <Route path="/recruiter/interview-details/:applicationId" element={
                            user && user.role === 'RECRUTEUR' ? 
                            <InterviewDetails /> : 
                            <Navigate to="/" replace />
                        } />
                        
                        {/* Tableau de bord candidat (protégé) */}
                        <Route path="/candidate/dashboard" element={
                            user && user.role === 'CANDIDAT' ? 
                            <CandidateDetails /> : 
                            <Navigate to="/" replace />
                        } />
                        
                        {/* Offres d'emploi candidat (protégé) */}
                        <Route path="/candidate/offers" element={
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
                        
                        {/* Informations personnelles candidat (protégé) */}
                        <Route path="/candidate/infos-personnelles" element={
                            user && user.role === 'CANDIDAT' ? 
                            <InfosPersonnels /> : 
                            <Navigate to="/" replace />
                        } />
                        
                        {/* Notifications candidat (protégé) */}
                        <Route path="/candidate/notifications" element={
                            user && user.role === 'CANDIDAT' ? 
                            <CandidateNotifications /> : 
                            <Navigate to="/" replace />
                        } />
                        
                        {/* Redirection pour toute autre URL non trouvée */}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </div>
            </div>
        );
    }

/**
 * Composant principal App
 */
function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;
