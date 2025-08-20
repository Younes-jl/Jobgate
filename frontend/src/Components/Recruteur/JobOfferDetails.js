import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import JobApplicationsList from './JobApplicationsList';
import api from '../../services/api';
import './RecruiterStyles.css';

/**
 * Page de détails d'une offre d'emploi avec liste des candidatures
 * Affiche les informations de l'offre et tous les candidats qui ont postulé
 */
const JobOfferDetails = () => {
  const { id } = useParams(); // ID de l'offre d'emploi
  const navigate = useNavigate();
  const [offerDetails, setOfferDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applicationStats, setApplicationStats] = useState({
    total: 0,
    pending: 0,
    under_review: 0,
    accepted: 0,
    rejected: 0
  });

  const fetchOfferDetails = useCallback(async () => {
    try {
      setLoading(true);
      
      // Essayer de récupérer les détails de l'offre
      let offerData = null;
      
      try {
        // Tentative 1: Endpoint spécifique à l'offre
        const response = await api.get(`/jobs/${id}/`);
        offerData = response.data;
      } catch (error) {
        if (error.response?.status === 404) {
          // Tentative 2: Récupérer toutes les offres et filtrer
          const allOffersResponse = await api.get('/jobs/dashboard/');
          const offer = allOffersResponse.data.find(o => o.id === parseInt(id));
          if (offer) {
            offerData = offer;
          } else {
            throw new Error('Offre d\'emploi non trouvée');
          }
        } else {
          throw error;
        }
      }
      
      setOfferDetails(offerData);
      setError(null);
    } catch (err) {
      console.error('Erreur lors du chargement des détails de l\'offre:', err);
      setError('Impossible de charger les détails de l\'offre d\'emploi.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchApplicationStats = useCallback(async () => {
    try {
      const response = await api.get(`/interviews/applications/job/?job_offer_id=${id}`);
      const applications = response.data;
      
      const stats = {
        total: applications.length,
        pending: applications.filter(app => app.status === 'pending').length,
        under_review: applications.filter(app => app.status === 'under_review').length,
        accepted: applications.filter(app => app.status === 'accepted').length,
        rejected: applications.filter(app => app.status === 'rejected').length,
      };
      
      setApplicationStats(stats);
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchOfferDetails();
      fetchApplicationStats();
    }
  }, [id, fetchOfferDetails, fetchApplicationStats]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'secondary';
      case 'draft': return 'warning';
      case 'closed': return 'danger';
      default: return 'primary';
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" variant="primary" style={{ width: "3rem", height: "3rem" }}>
            <span className="visually-hidden">Chargement...</span>
          </Spinner>
          <h4 className="mt-3 fw-light">Chargement des détails de l'offre...</h4>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger" className="text-center">
          <Alert.Heading>
            <i className="bi bi-exclamation-triangle me-2"></i>
            Erreur de chargement
          </Alert.Heading>
          <p>{error}</p>
          <div className="d-flex gap-2 justify-content-center mt-3">
            <Button variant="outline-primary" onClick={() => navigate(-1)}>
              <i className="bi bi-arrow-left me-1"></i>
              Retour
            </Button>
            <Button variant="primary" onClick={fetchOfferDetails}>
              <i className="bi bi-arrow-clockwise me-1"></i>
              Réessayer
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  if (!offerDetails) {
    return (
      <Container className="py-5">
        <Alert variant="warning" className="text-center">
          <Alert.Heading>Offre non trouvée</Alert.Heading>
          <p>L'offre d'emploi demandée n'existe pas ou n'est plus disponible.</p>
          <Button variant="primary" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left me-1"></i>
            Retour au tableau de bord
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* En-tête avec navigation */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <Button 
                variant="outline-secondary" 
                onClick={() => navigate(-1)}
                className="me-3 rounded-pill"
              >
                <i className="bi bi-arrow-left me-1"></i>
                Retour
              </Button>
              <div>
                <h1 className="h3 mb-1 fw-bold">Détails de l'Offre d'Emploi</h1>
                <p className="text-muted mb-0">Gestion des candidatures reçues</p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <Badge bg={getStatusColor(offerDetails.status)} className="px-3 py-2">
                {offerDetails.status === 'active' ? 'Active' : 
                 offerDetails.status === 'inactive' ? 'Inactive' : 
                 offerDetails.status === 'draft' ? 'Brouillon' : 
                 offerDetails.status === 'closed' ? 'Fermée' : offerDetails.status}
              </Badge>
            </div>
          </div>
        </Col>
      </Row>

      {/* Statistiques rapides */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="stat-card success h-100 border-0">
            <Card.Body className="text-center">
              <i className="bi bi-people-fill text-success mb-2" style={{ fontSize: '2rem' }}></i>
              <h3 className="fw-bold mb-1">{applicationStats.total}</h3>
              <p className="text-muted small mb-0">Total Candidatures</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card warning h-100 border-0">
            <Card.Body className="text-center">
              <i className="bi bi-clock-fill text-warning mb-2" style={{ fontSize: '2rem' }}></i>
              <h3 className="fw-bold mb-1">{applicationStats.pending}</h3>
              <p className="text-muted small mb-0">En Attente</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card info h-100 border-0">
            <Card.Body className="text-center">
              <i className="bi bi-eye-fill text-info mb-2" style={{ fontSize: '2rem' }}></i>
              <h3 className="fw-bold mb-1">{applicationStats.under_review}</h3>
              <p className="text-muted small mb-0">En Examen</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card primary h-100 border-0">
            <Card.Body className="text-center">
              <i className="bi bi-check-circle-fill text-primary mb-2" style={{ fontSize: '2rem' }}></i>
              <h3 className="fw-bold mb-1">{applicationStats.accepted}</h3>
              <p className="text-muted small mb-0">Acceptées</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Détails de l'offre */}
        <Col lg={4} className="mb-4">
          <Card className="dashboard-card h-100 border-0">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-briefcase me-2"></i>
                Informations de l'Offre
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <h4 className="fw-bold text-primary">{offerDetails.title}</h4>
                <p className="text-muted mb-2">
                  <i className="bi bi-geo-alt me-1"></i>
                  {offerDetails.location || 'Lieu non spécifié'}
                </p>
                <p className="text-muted mb-3">
                  <i className="bi bi-calendar3 me-1"></i>
                  Publiée le {formatDate(offerDetails.created_at)}
                </p>
              </div>

              {offerDetails.description && (
                <div className="mb-3">
                  <h6 className="fw-bold">Description</h6>
                  <p className="text-muted small">
                    {offerDetails.description.length > 200 
                      ? `${offerDetails.description.substring(0, 200)}...` 
                      : offerDetails.description}
                  </p>
                </div>
              )}

              {offerDetails.salary && (
                <div className="mb-3">
                  <h6 className="fw-bold">Salaire</h6>
                  <p className="text-success fw-bold">{offerDetails.salary}</p>
                </div>
              )}

              {offerDetails.requirements && (
                <div className="mb-3">
                  <h6 className="fw-bold">Exigences</h6>
                  <p className="text-muted small">{offerDetails.requirements}</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Liste des candidatures */}
        <Col lg={8}>
          <Card className="dashboard-card border-0">
            <Card.Header className="bg-white">
              <div className="d-flex align-items-center justify-content-between">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-people me-2 text-primary"></i>
                  Candidatures Reçues
                </h5>
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={fetchApplicationStats}
                  className="rounded-pill"
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Actualiser
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <JobApplicationsList jobOfferId={id} />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default JobOfferDetails;
