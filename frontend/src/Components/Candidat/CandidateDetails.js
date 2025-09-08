import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button } from 'react-bootstrap';
import { useAuth } from '../auth/useAuth';
import api from '../../services/api';
import './CandidateStyles.css';

const CandidateDetails = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0
  });

  // Fonction pour récupérer les candidatures de l'utilisateur
  const fetchUserApplications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/interviews/applications/my_applications/');
      const userApplications = response.data;
      
      setApplications(userApplications);
      
      // Calculer les statistiques
      const newStats = {
        total: userApplications.length,
        pending: userApplications.filter(app => app.status === 'EN_ATTENTE').length,
        accepted: userApplications.filter(app => app.status === 'ACCEPTE').length,
        rejected: userApplications.filter(app => app.status === 'REFUSE').length
      };
      setStats(newStats);
      
    } catch (error) {
      console.error('Erreur lors du chargement des candidatures:', error);
      setError('Impossible de charger vos candidatures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserApplications();
    }
  }, [user]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACCEPTE':
      case 'accepted':
        return { variant: 'success', text: 'Accepté' };
      case 'REFUSE':
      case 'rejected':
        return { variant: 'danger', text: 'Refusé' };
      case 'EN_ATTENTE':
      case 'pending':
        return { variant: 'warning', text: 'En attente' };
      case 'EN_COURS':
      case 'under_review':
        return { variant: 'warning', text: 'En cours' };
      default:
        return { variant: 'secondary', text: status || 'Inconnu' };
    }
  };

  // const getStatusText = (status) => {
  //   const statusMap = {
  //     "EN_ATTENTE": "En attente",
  //     "ACCEPTE": "Acceptées", 
  //     "REFUSE": "Refusées",
  //     "EN_COURS": "En cours"
  //   };
  //   return statusMap[status] || status;
  // };

  return (
    <Container fluid className="py-4">
      <Row>
        {/* Section Informations Personnelles */}
        <Col md={4}>
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  <i className="bi bi-person me-2"></i>
                  Informations Personnelles
                </h6>
                <Button variant="outline-primary" size="sm">
                  <i className="bi bi-pencil"></i>
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="text-center mb-3">
                <div className="user-avatar-large bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center">
                  <i className="bi bi-person" style={{ fontSize: '2rem' }}></i>
                </div>
                <h6 className="mt-2 mb-0">{user?.first_name} {user?.last_name}</h6>
                <small className="text-muted">Développeur Frontend React</small>
              </div>
              
              <div className="mb-2">
                <i className="bi bi-envelope me-2 text-muted"></i>
                <small>{user?.email}</small>
              </div>
              <div className="mb-2">
                <i className="bi bi-telephone me-2 text-muted"></i>
                <small>+33 6 12 34 56 78</small>
              </div>
              <div className="mb-2">
                <i className="bi bi-geo-alt me-2 text-muted"></i>
                <small>Casablanca, Maroc</small>
              </div>
              <div className="mb-3">
                <i className="bi bi-calendar me-2 text-muted"></i>
                <small>3 ans d'expérience</small>
              </div>
              
              <Button variant="outline-primary" size="sm" className="w-100">
                Mettre à jour le profil
              </Button>
            </Card.Body>
          </Card>

          {/* Section Notifications */}
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  <i className="bi bi-bell me-2"></i>
                  Notifications
                  <Badge bg="danger" className="ms-2">3</Badge>
                </h6>
                <Button variant="link" size="sm" className="text-decoration-none">
                  <i className="bi bi-gear"></i>
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="notification-item border-start border-success border-3 ps-3 mb-3">
                <div className="d-flex justify-content-between">
                  <strong className="text-success">Entretien programmé</strong>
                  <small className="text-muted">23/01/2024</small>
                </div>
                <small className="text-muted">
                  Votre entretien pour le poste de Designer UI/UX chez TechCorp est prévu pour le 25 janvier 2024.
                </small>
              </div>
              
              <div className="notification-item border-start border-info border-3 ps-3 mb-3">
                <div className="d-flex justify-content-between">
                  <strong className="text-info">Candidature acceptée</strong>
                  <small className="text-muted">18/01/2024</small>
                </div>
                <small className="text-muted">
                  Félicitations! Votre candidature pour Développeur Full Stack chez StartupTech a été acceptée.
                </small>
              </div>
              
              <div className="notification-item border-start border-warning border-3 ps-3">
                <div className="d-flex justify-content-between">
                  <strong className="text-warning">Nouvelle opportunité</strong>
                  <small className="text-muted">16/01/2024</small>
                </div>
                <small className="text-muted">
                  Une nouvelle offre correspond à votre profil: Développeur React Senior.
                </small>
              </div>
              
              <div className="text-center mt-3">
                <Button variant="link" size="sm" className="text-decoration-none">
                  Voir toutes les notifications
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Section Mes Candidatures */}
        <Col md={8}>
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-light">
              <h6 className="mb-0">
                <i className="bi bi-briefcase me-2"></i>
                Mes Candidatures
              </h6>
              <small className="text-muted">Suivez le statut de toutes vos candidatures en temps réel</small>
            </Card.Header>
            <Card.Body>
              {/* Statistiques */}
              <Row className="mb-4">
                <Col md={3}>
                  <div className="text-center p-3 bg-light rounded">
                    <div className="h4 mb-1 text-primary">{stats.total}</div>
                    <small className="text-muted">Total</small>
                    <div className="mt-1">
                      <i className="bi bi-eye text-muted"></i>
                    </div>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center p-3 bg-light rounded">
                    <div className="h4 mb-1 text-warning">{stats.pending}</div>
                    <small className="text-muted">En cours</small>
                    <div className="mt-1">
                      <i className="bi bi-clock text-warning"></i>
                    </div>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center p-3 bg-light rounded">
                    <div className="h4 mb-1 text-success">{stats.accepted}</div>
                    <small className="text-muted">Acceptées</small>
                    <div className="mt-1">
                      <i className="bi bi-check-circle text-success"></i>
                    </div>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center p-3 bg-light rounded">
                    <div className="h4 mb-1 text-danger">{stats.rejected}</div>
                    <small className="text-muted">Refusées</small>
                    <div className="mt-1">
                      <i className="bi bi-x-circle text-danger"></i>
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Historique des candidatures */}
              <h6 className="mb-3">Historique des candidatures</h6>
              
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                  <p className="mt-3 text-muted">Chargement de vos candidatures...</p>
                </div>
              ) : error ? (
                <div className="text-center py-5">
                  <i className="bi bi-exclamation-triangle" style={{ fontSize: '3rem', color: '#dc3545' }}></i>
                  <p className="mt-3 text-danger">{error}</p>
                  <Button variant="outline-primary" size="sm" onClick={fetchUserApplications}>
                    Réessayer
                  </Button>
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-inbox" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                  <p className="mt-3 text-muted">Aucune candidature pour le moment</p>
                  <Button variant="primary" size="sm" href="/candidate/offers">
                    Explorer les offres
                  </Button>
                </div>
              ) : (
                <div className="applications-list">
                  {applications.map((application) => (
                    <Card key={application.id} className="mb-3 border-0 shadow-sm job-offer-card-modern">
                      <Card.Body className="p-4">
                        <div className="d-flex align-items-center mb-4" style={{ padding: '1rem 0', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '1.25rem',
                            fontSize: '1.2rem',
                            fontWeight: '500',
                            flexShrink: 0,
                            backgroundColor: 
                              application.status === 'ACCEPTE' || application.status === 'accepted' ? '#ecfdf5' :
                              application.status === 'REFUSE' || application.status === 'rejected' ? '#fef2f2' :
                              application.status === 'EN_ATTENTE' || application.status === 'pending' ? '#fefce8' :
                              application.status === 'EN_COURS' || application.status === 'under_review' ? '#fefce8' : '#f8fafc',
                            color: 
                              application.status === 'ACCEPTE' || application.status === 'accepted' ? '#059669' :
                              application.status === 'REFUSE' || application.status === 'rejected' ? '#dc2626' :
                              application.status === 'EN_ATTENTE' || application.status === 'pending' ? '#ca8a04' :
                              application.status === 'EN_COURS' || application.status === 'under_review' ? '#ca8a04' : '#64748b',
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                          }}>
                            {application.status === 'ACCEPTE' || application.status === 'accepted' ? '✓' :
                             application.status === 'REFUSE' || application.status === 'rejected' ? '✕' :
                             application.status === 'EN_ATTENTE' || application.status === 'pending' ? '⏱' :
                             application.status === 'EN_COURS' || application.status === 'under_review' ? '↻' : '?'}
                          </div>
                          <div className="flex-grow-1">
                            <h5 className="job-title-colored mb-1">{application.job_offer?.title || 'Offre supprimée'}</h5>
                            <p className="company-name-colored mb-0">{application.job_offer?.recruiter_name || 'Entreprise'}</p>
                          </div>
                          <Badge bg={getStatusBadge(application.status).variant} className="ms-2 status-badge-large">
                            {getStatusBadge(application.status).text}
                          </Badge>
                        </div>
                        
                        <div className="job-meta-colored mb-3">
                          <div className="meta-item-colored">
                            <i className="bi bi-geo-alt me-2 text-primary"></i>
                            <span className="text-primary fw-medium">{application.job_offer?.location || 'Non spécifié'}</span>
                          </div>
                          <div className="meta-item-colored">
                            <i className="bi bi-calendar3 me-2 text-info"></i>
                            <span className="text-info fw-medium">Candidature: {new Date(application.created_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                        
                        {application.job_offer?.description && (
                          <p className="job-description mb-3">
                            {application.job_offer.description.length > 100 
                              ? `${application.job_offer.description.substring(0, 100)}...` 
                              : application.job_offer.description}
                          </p>
                        )}
                        
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="job-badges">
                            {application.job_offer?.contract_type && (
                              <Badge bg="primary" className="me-2 contract-badge">
                                {application.job_offer.contract_type}
                              </Badge>
                            )}
                          </div>
                          <small className="text-primary fw-bold">
                            ID: #{application.id}
                          </small>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CandidateDetails;