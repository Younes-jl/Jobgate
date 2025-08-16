/**
 * Tableau de bord du recruteur
 * 
 * Ce composant affiche le tableau de bord principal pour les recruteurs,
 * leur permettant de voir et gérer leurs offres d'emploi.
 */
import React, { useState, useEffect } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import JobOfferList from './JobOfferList';
import ApplicationsOverview from '../jobs/ApplicationsOverview';
import { useAuth } from '../auth/useAuth';

// Style simple pour l'en-tête du dashboard
const dashboardHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2px solid #f0f0f0',
    paddingBottom: '10px',
    marginBottom: '20px'
};

/**
 * Composant RecruiterDashboard
 * 
 * Affiche la liste des offres d'emploi créées par le recruteur et
 * lui permet d'en créer de nouvelles.
 */
function RecruiterDashboard() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [activeMenu, setActiveMenu] = useState('dashboard');
    const location = useLocation();
    const { user, isTokenChecked } = useAuth();
    
    // Effet pour rafraîchir la liste des offres après une redirection
    useEffect(() => {
        // Si on vient de la page de création d'offre, on rafraîchit la liste
        if (location.state && location.state.offerCreated) {
            setRefreshTrigger(prev => prev + 1);
        }
    }, [location]);
    
    // Rafraîchir automatiquement les données au montage ou si l'utilisateur change
    useEffect(() => {
        if (user && user.role === 'RECRUTEUR') {
            // Léger délai pour permettre au composant de se monter complètement
            const timer = setTimeout(() => {
                setRefreshTrigger(prev => prev + 1);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [user]);
    
    // Si le token n'est pas encore vérifié, afficher un indicateur de chargement
    if (!isTokenChecked) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <p>Vérification de l'authentification...</p>
            </div>
        );
    }
    
    // Si l'utilisateur n'est pas connecté ou n'est pas un recruteur, rediriger vers la page de connexion
    if (!user) {
        return <Navigate to="/login" />;
    }
    
    if (user.role !== 'RECRUTEUR') {
        return <Navigate to="/" />;
    }

    // Fonction pour définir le menu actif
    const handleMenuClick = (menuName) => {
        setActiveMenu(menuName);
    };

    // Fonction pour afficher le contenu en fonction du menu actif
    const renderContent = () => {
        switch(activeMenu) {
            case 'dashboard':
                return (
                    <div>
                        <h2>Bienvenue sur votre tableau de bord</h2>
                        <div style={{ marginTop: '20px', marginBottom: '30px' }}>
                            <p>Bienvenue dans votre espace recruteur. Vous pouvez gérer vos offres d'emploi et candidatures depuis ce tableau de bord.</p>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginTop: '30px' }}>
                            <div style={{ 
                                border: '1px solid #eee', 
                                padding: '20px', 
                                borderRadius: '8px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                                <h3 style={{ borderBottom: '2px solid #4CAF50', paddingBottom: '10px', marginTop: 0 }}>Gérer les offres</h3>
                                <p>Créez et gérez vos offres d'emploi dans la section "Offres".</p>
                                <button 
                                    onClick={() => handleMenuClick('offers')}
                                    style={{ 
                                        backgroundColor: '#4CAF50', 
                                        color: 'white', 
                                        padding: '8px 12px', 
                                        border: 'none', 
                                        borderRadius: '4px', 
                                        cursor: 'pointer',
                                        marginTop: '10px'
                                    }}
                                >
                                    Voir mes offres
                                </button>
                            </div>
                            
                            <div style={{ 
                                border: '1px solid #eee', 
                                padding: '20px', 
                                borderRadius: '8px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                                <h3 style={{ borderBottom: '2px solid #e74c3c', paddingBottom: '10px', marginTop: 0 }}>Candidatures</h3>
                                <p>Consultez et gérez les candidatures reçues pour vos offres d'emploi.</p>
                                <button 
                                    onClick={() => handleMenuClick('candidates')}
                                    style={{ 
                                        backgroundColor: '#e74c3c', 
                                        color: 'white', 
                                        padding: '8px 12px', 
                                        border: 'none', 
                                        borderRadius: '4px', 
                                        cursor: 'pointer',
                                        marginTop: '10px'
                                    }}
                                >
                                    Voir les candidatures
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case 'offers':
                return <JobOfferList refreshTrigger={refreshTrigger} />;
            case 'candidates':
                return <ApplicationsOverview />;
            default:
                return <JobOfferList refreshTrigger={refreshTrigger} />;
        }
    };

    return (
        <div className="dashboard-container" style={{ padding: '0' }}>
            {/* En-tête du Dashboard avec le titre et le bouton d'action principal */}
            <header style={{
                ...dashboardHeaderStyle,
                padding: '15px 20px',
                backgroundColor: '#f8f9fa',
                marginBottom: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <h1 style={{ margin: 0 }}>Mon Tableau de Bord</h1>
                </div>
                <div>
                    <Link to="/create-offer">
                        <button style={{ 
                            backgroundColor: '#4CAF50', 
                            color: 'white', 
                            padding: '10px 15px', 
                            border: 'none', 
                            borderRadius: '4px', 
                            cursor: 'pointer'
                        }}>
                            + Créer une offre
                        </button>
                    </Link>
                </div>
            </header>

            {/* Conteneur principal avec sidebar et contenu */}
            <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)' }}>
                {/* Sidebar avec les options du menu */}
                <aside style={{
                    width: '250px',
                    backgroundColor: '#2c3e50',
                    color: 'white',
                    boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ padding: '20px 0' }}>
                        <div 
                            style={{
                                padding: '12px 20px',
                                cursor: 'pointer',
                                backgroundColor: activeMenu === 'dashboard' ? '#34495e' : 'transparent',
                                borderLeft: activeMenu === 'dashboard' ? '4px solid #3498db' : '4px solid transparent',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            onClick={() => handleMenuClick('dashboard')}
                        >
                            <span style={{ marginRight: '10px', fontSize: '18px' }}>📊</span> 
                            <span style={{ color: 'white', textDecoration: 'none' }}>Tableau de bord</span>
                        </div>
                        <div 
                            style={{
                                padding: '12px 20px',
                                cursor: 'pointer',
                                backgroundColor: activeMenu === 'offers' ? '#34495e' : 'transparent',
                                borderLeft: activeMenu === 'offers' ? '4px solid #3498db' : '4px solid transparent',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            onClick={() => handleMenuClick('offers')}
                        >
                            <span style={{ marginRight: '10px', fontSize: '18px' }}>📝</span> 
                            <span style={{ color: 'white', textDecoration: 'none' }}>Offres</span>
                        </div>
                        <div 
                            style={{
                                padding: '12px 20px',
                                cursor: 'pointer',
                                backgroundColor: activeMenu === 'candidates' ? '#34495e' : 'transparent',
                                borderLeft: activeMenu === 'candidates' ? '4px solid #3498db' : '4px solid transparent',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            onClick={() => handleMenuClick('candidates')}
                        >
                            <span style={{ marginRight: '10px', fontSize: '18px' }}>👥</span> 
                            <span style={{ color: 'white', textDecoration: 'none' }}>Candidats</span>
                        </div>
                    </div>
                </aside>

                {/* Section principale qui affiche le contenu */}
                <main style={{
                    flex: 1,
                    padding: '30px',
                    backgroundColor: '#fff'
                }}>
                    {renderContent()}
                </main>
            </div>
        </div>
    );
}

export default RecruiterDashboard;