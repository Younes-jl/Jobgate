import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import JobOfferList from './JobOfferList';
import OffresAvecCandidatures from './OffresAvecCandidatures';
import { useAuth } from '../auth/useAuth';
import api from '../../services/api';
import './RecruiterStyles.css';

/**
 * Tableau de bord du recruteur avec sidebar et cartes
 * Affiche un résumé des activités, les offres d'emploi et les candidatures
 */
const RecruiterDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    totalOffers: 0,
    totalApplications: 0,
    pendingApplications: 0,
    acceptedApplications: 0,
    rejectedApplications: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    fetchRealDashboardData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fonction pour récupérer les données réelles
  const fetchRealDashboardData = async () => {
    if (!loading) setRefreshing(true);
    
    try {
      // Récupérer les vraies données depuis plusieurs endpoints
      const [offersResponse, applicationsResponse] = await Promise.allSettled([
        api.get('/jobs/dashboard/'), // Offres du recruteur
        api.get('/interviews/applications/recruiter/') // Candidatures reçues
      ]);

      let realData = {
        totalOffers: 0,
        totalApplications: 0,
        pendingApplications: 0,
        acceptedApplications: 0,
        rejectedApplications: 0,
      };

      // Traiter les offres d'emploi
      if (offersResponse.status === 'fulfilled' && offersResponse.value.data) {
        realData.totalOffers = offersResponse.value.data.length;
        console.log(`Offres trouvées: ${realData.totalOffers}`);
      } else {
        console.warn('Impossible de récupérer les offres, tentative avec endpoint alternatif');
        try {
          const fallbackOffers = await api.get('/jobs/');
          realData.totalOffers = fallbackOffers.data.length || 0;
          console.log(`Offres trouvées (fallback): ${realData.totalOffers}`);
        } catch (fallbackError) {
          console.warn('Endpoint alternatif pour les offres échoué:', fallbackError);
          realData.totalOffers = 0;
        }
      }

      // Traiter les candidatures
      if (applicationsResponse.status === 'fulfilled' && applicationsResponse.value.data) {
        const applications = applicationsResponse.value.data;
        realData.totalApplications = applications.length;
        realData.pendingApplications = applications.filter(app => 
          app.status === 'pending' || app.status === 'submitted' || app.status === 'under_review'
        ).length;
        realData.acceptedApplications = applications.filter(app => 
          app.status === 'accepted' || app.status === 'approved'
        ).length;
        realData.rejectedApplications = applications.filter(app => 
          app.status === 'rejected' || app.status === 'declined'
        ).length;
        
        console.log(`Candidatures: Total=${realData.totalApplications}, En attente=${realData.pendingApplications}, Acceptées=${realData.acceptedApplications}`);
      } else {
        console.warn('Impossible de récupérer les candidatures directement, tentative par offre...');
        try {
          // Essayer de récupérer les candidatures par offre
          if (realData.totalOffers > 0) {
            const offersData = offersResponse.status === 'fulfilled' ? 
              offersResponse.value.data : [];
            
            let totalApps = 0, pendingApps = 0, acceptedApps = 0, rejectedApps = 0;
            
            for (const offer of offersData) {
              try {
                const appsByOffer = await api.get(`/interviews/applications/job/?job_offer_id=${offer.id}`);
                if (appsByOffer.data) {
                  const offerApps = appsByOffer.data;
                  totalApps += offerApps.length;
                  pendingApps += offerApps.filter(app => 
                    app.status === 'pending' || app.status === 'submitted' || app.status === 'under_review'
                  ).length;
                  acceptedApps += offerApps.filter(app => 
                    app.status === 'accepted' || app.status === 'approved'
                  ).length;
                  rejectedApps += offerApps.filter(app => 
                    app.status === 'rejected' || app.status === 'declined'
                  ).length;
                }
              } catch (offerAppError) {
                console.warn(`Erreur pour l'offre ${offer.id}:`, offerAppError);
              }
            }
            
            realData.totalApplications = totalApps;
            realData.pendingApplications = pendingApps;
            realData.acceptedApplications = acceptedApps;
            realData.rejectedApplications = rejectedApps;
          }
        } catch (fallbackError) {
          console.warn('Toutes les tentatives de récupération des candidatures ont échoué');
          realData.totalApplications = 0;
          realData.pendingApplications = 0;
          realData.acceptedApplications = 0;
          realData.rejectedApplications = 0;
        }
      }

      console.log('Données réelles récupérées:', realData);
      setDashboardData(realData);
      setLastUpdated(new Date());

    } catch (error) {
      console.error("Erreur lors du chargement des données réelles:", error);
      // En cas d'erreur totale, utiliser des valeurs par défaut
      setDashboardData({
        totalOffers: 0,
        totalApplications: 0,
        pendingApplications: 0,
        acceptedApplications: 0,
        rejectedApplications: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fonction pour rafraîchir manuellement les données
  const refreshData = async () => {
    console.log('Rafraîchissement manuel des données...');
    await fetchRealDashboardData();
  };

  if (loading) {
    return (
      <Container className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "80vh" }}>
        <div className="text-center p-5 rounded-4 shadow-sm bg-white" style={{ minWidth: "300px" }}>
          <div className="mb-4">
            <Spinner 
              animation="border" 
              variant="primary" 
              role="status" 
              style={{ width: "4rem", height: "4rem", borderWidth: "0.3em" }}
            >
              <span className="visually-hidden">Chargement...</span>
            </Spinner>
          </div>
          <h4 className="mb-3 fw-light text-primary">Chargement du tableau de bord</h4>
          <p className="text-muted mb-0">Récupération de vos données en cours...</p>
          <div className="progress mt-3" style={{ height: "4px" }}>
            <div 
              className="progress-bar progress-bar-striped progress-bar-animated" 
              role="progressbar" 
              style={{ width: "75%", background: "linear-gradient(90deg, #0d6efd, #6f42c1)" }}
            ></div>
          </div>
        </div>
      </Container>
    );
  }
  
  const renderContent = () => {
    switch(activeSection) {
      case 'offers':
        return (
          <div className="p-4">
            <div className="d-flex align-items-center mb-4">
              <div className="me-3 p-3 bg-success rounded-circle text-white shadow-sm">
                <i className="bi bi-briefcase" style={{ fontSize: '1.5rem' }}></i>
              </div>
              <div>
                <h2 className="mb-1 fw-bold">Mes Offres d'Emploi</h2>
                <p className="text-muted mb-0">Gérez et suivez vos offres d'emploi actives</p>
              </div>
            </div>
            <div className="dashboard-card">
              <Card.Body>
                <JobOfferList />
              </Card.Body>
            </div>
          </div>
        );
      case 'applications':
        return (
          <div className="p-4">
            <div className="d-flex align-items-center mb-4">
              <div className="me-3 p-3 bg-warning rounded-circle text-dark shadow-sm">
                <i className="bi bi-people" style={{ fontSize: '1.5rem' }}></i>
              </div>
              <div>
                <h2 className="mb-1 fw-bold">Candidatures Reçues</h2>
                <p className="text-muted mb-0">Consultez et gérez les candidatures à vos offres</p>
              </div>
            </div>
            <div className="dashboard-card">
              <Card.Body>
                <OffresAvecCandidatures />
              </Card.Body>
            </div>
          </div>
        );
      case 'createOffer':
        // Rediriger vers la page de création d'offre
        navigate('/create-offer');
        return null;
      case 'overview':
      default:
        return (
          <div className="p-4">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div className="d-flex align-items-center">
                <div className="me-3 p-3 bg-primary rounded-circle text-white shadow-sm">
                  <i className="bi bi-speedometer2" style={{ fontSize: '1.5rem' }}></i>
                </div>
                <div>
                  <h2 className="mb-1 fw-bold">Tableau de Bord</h2>
                  <p className="text-muted mb-0">Vue d'ensemble de votre activité de recrutement</p>
                </div>
              </div>
              <div className="d-flex align-items-center">
                {lastUpdated && (
                  <small className="text-muted me-3">
                    Dernière mise à jour: {lastUpdated.toLocaleTimeString()}
                  </small>
                )}
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={refreshData}
                  disabled={refreshing}
                  className="rounded-pill"
                >
                  {refreshing ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-1" />
                      Actualisation...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-arrow-clockwise me-1"></i>
                      Actualiser
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Statistiques */}
            <Row className="mb-4">
              <Col md={3}>
                <div className="stat-card primary">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <i className="bi bi-briefcase stat-icon"></i>
                      <div className="stat-value">{dashboardData.totalOffers}</div>
                      <div className="stat-label">Offres Actives</div>
                    </div>
                  </div>
                </div>
              </Col>
              <Col md={3}>
                <div className="stat-card success">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <i className="bi bi-people stat-icon"></i>
                      <div className="stat-value">{dashboardData.totalApplications}</div>
                      <div className="stat-label">Candidatures</div>
                    </div>
                  </div>
                </div>
              </Col>
              <Col md={3}>
                <div className="stat-card warning">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <i className="bi bi-clock stat-icon"></i>
                      <div className="stat-value">{dashboardData.pendingApplications}</div>
                      <div className="stat-label">En Attente</div>
                    </div>
                  </div>
                </div>
              </Col>
              <Col md={3}>
                <div className="stat-card info">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <i className="bi bi-check-circle stat-icon"></i>
                      <div className="stat-value">{dashboardData.acceptedApplications}</div>
                      <div className="stat-label">Acceptées</div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
  
            {/* Actions rapides */}
            <Row>
              <Col md={6}>
                <Card className="dashboard-card mb-4 h-100">
                  <Card.Body className="d-flex flex-column justify-content-center text-center p-4">
                    <div className="mb-3">
                      <div className="mx-auto mb-3 p-3 bg-success rounded-circle text-white shadow-sm" style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="bi bi-briefcase" style={{ fontSize: '2rem' }}></i>
                      </div>
                      <h4 className="fw-bold text-success mb-2">Mes Offres d'Emploi</h4>
                      <p className="text-muted mb-3">Gérez et consultez toutes vos offres d'emploi actives et archivées</p>
                      <div className="mb-3">
                        <Badge bg="success" pill className="fs-6 px-3 py-2">
                          {dashboardData.totalOffers} offre{dashboardData.totalOffers > 1 ? 's' : ''} active{dashboardData.totalOffers > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      variant="success" 
                      size="lg" 
                      onClick={() => setActiveSection('offers')}
                      className="rounded-pill px-4 py-2 fw-bold"
                    >
                      <i className="bi bi-briefcase me-2"></i>
                      Accéder aux Offres
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="dashboard-card mb-4 h-100">
                  <Card.Body className="d-flex flex-column justify-content-center text-center p-4">
                    <div className="mb-3">
                      <div className="mx-auto mb-3 p-3 bg-warning rounded-circle text-dark shadow-sm" style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="bi bi-people" style={{ fontSize: '2rem' }}></i>
                      </div>
                      <h4 className="fw-bold text-warning mb-2">Candidatures Reçues</h4>
                      <p className="text-muted mb-3">Consultez et gérez toutes les candidatures à vos offres d'emploi</p>
                      <div className="mb-3">
                        <Badge bg="warning" pill className="fs-6 px-3 py-2 text-dark">
                          {dashboardData.totalApplications} candidature{dashboardData.totalApplications > 1 ? 's' : ''} reçue{dashboardData.totalApplications > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      variant="warning" 
                      size="lg" 
                      onClick={() => setActiveSection('applications')}
                      className="rounded-pill px-4 py-2 fw-bold text-dark"
                    >
                      <i className="bi bi-people me-2"></i>
                      Accéder aux Candidatures
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>
        );
    }
  };

  return (
    <Container fluid className="p-0">
      <Row className="g-0">
        {/* Sidebar */}
        <Col md={2} className="sidebar">
          <div className="sidebar-sticky">
            <div className="p-3 mb-4 text-white rounded-3 shadow-sm" 
                 style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #6f42c1 100%)' }}>
              <div className="d-flex align-items-center mb-2">
                <i className="bi bi-building me-2" style={{ fontSize: '1.2rem' }}></i>
                <h3 className="h5 mb-0 fw-bold">JobGate</h3>
              </div>
              <p className="mb-1 small opacity-90">Plateforme de Recrutement</p>
              {user && (
                <div className="d-flex align-items-center mt-2">
                  <div className="rounded-circle bg-white bg-opacity-20 p-1 me-2">
                    <i className="bi bi-person-circle" style={{ fontSize: '1rem' }}></i>
                  </div>
                  <span className="small fw-medium">{user.username}</span>
                </div>
              )}
            </div>
            
            <nav className="sidebar-nav">
              <button 
                type="button"
                className={`nav-link ${activeSection === 'overview' ? 'active' : ''}`} 
                onClick={() => setActiveSection('overview')}
              >
                <i className="bi bi-speedometer2 me-2"></i>
                Tableau de bord
              </button>
              <button 
                type="button"
                className={`nav-link ${activeSection === 'offers' ? 'active' : ''}`} 
                onClick={() => setActiveSection('offers')}
              >
                <i className="bi bi-briefcase me-2"></i>
                Mes offres d'emploi
                <Badge bg="success" pill className="ms-auto">{dashboardData.totalOffers}</Badge>
              </button>
              <button 
                type="button"
                className={`nav-link ${activeSection === 'applications' ? 'active' : ''}`} 
                onClick={() => setActiveSection('applications')}
              >
                <i className="bi bi-people me-2"></i>
                Candidatures
                <Badge bg="warning" pill className="ms-auto">{dashboardData.pendingApplications}</Badge>
              </button>
            </nav>
            
            {/* Zone d'action rapide en bas de la sidebar */}
            <div className="mt-auto p-3">
              <div className="bg-light rounded-3 p-3 text-center">
                <i className="bi bi-plus-circle-fill text-primary mb-2" style={{ fontSize: '2rem' }}></i>
                <p className="small text-muted mb-2">Prêt pour une nouvelle offre ?</p>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => navigate('/create-offer')}
                  className="rounded-pill w-100"
                >
                  <i className="bi bi-plus me-1"></i>
                  Créer une offre
                </Button>
              </div>
            </div>
          </div>
        </Col>
        
        {/* Contenu principal */}
        <Col md={10}>
          {renderContent()}
        </Col>
      </Row>
    </Container>
  );

};

export default RecruiterDashboard;