import React, { useState, useEffect } from 'react';
import { fetchAllJobOffers } from './jobOffersApi';
import { Link } from 'react-router-dom';
import { Card, Container, Row, Col, Badge, Button } from 'react-bootstrap';
import { useAuth } from '../auth/useAuth';
import api from '../../services/api';
import JobGateLogo from '../Common/JobGateLogo';
import './CandidateStyles.css';

/**
 * Tableau de bord du candidat pour voir toutes les offres d'emploi disponibles
 */
const CandidateDashboard = () => {
  const [jobOffers, setJobOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userApplications, setUserApplications] = useState([]);
  const { user } = useAuth();

  // Fonction pour récupérer les candidatures de l'utilisateur
  const fetchUserApplications = async () => {
    try {
      const response = await api.get('/interviews/applications/my_applications/');
      setUserApplications(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des candidatures:', error);
    }
  };

  useEffect(() => {
    // Récupérer les offres d'emploi et les candidatures au chargement du composant
    const loadData = async () => {
      try {
        setLoading(true);
        const offers = await fetchAllJobOffers();
        setJobOffers(offers);
        
        // Récupérer les candidatures de l'utilisateur
        if (user) {
          await fetchUserApplications();
        }
        
        setError(null);
      } catch (err) {
        setError('Erreur lors du chargement des offres d\'emploi. Veuillez réessayer plus tard.');
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Fonction pour vérifier si l'utilisateur a déjà postulé à une offre
  const hasAppliedToOffer = (offerId) => {
    return userApplications.some(application => application.job_offer?.id === offerId);
  };

  if (loading) {
    return (
      <div className="candidate-dashboard loading">
        <h2>Chargement des offres d'emploi...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="candidate-dashboard error">
        <h2>Erreur</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Réessayer</button>
      </div>
    );
  }

  return (
    <div className="position-relative">
      <Container fluid className="py-4">
        <Row>
        {/* Section offres d'emploi - maintenant en pleine largeur */}
        <Col md={12}>
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <h5 className="mb-0">
                <i className="bi bi-briefcase me-2"></i>
                Offres d'emploi disponibles ({jobOffers.length})
              </h5>
            </Card.Header>
            <Card.Body>
              {jobOffers.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-briefcase" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                  <p className="mt-3 text-muted">Aucune offre d'emploi n'est disponible actuellement.</p>
                </div>
              ) : (
                <Row>
                  {jobOffers.map((offer) => (
                    <Col md={4} key={offer.id} className="mb-4">
                      <Card className="h-100 border-0 shadow-sm job-offer-card-modern">
                        <Card.Body className="p-4">
                          <div className="d-flex align-items-start mb-3">
                            <div className="job-icon me-3">
                              <i className="bi bi-briefcase"></i>
                            </div>
                            <div className="flex-grow-1">
                              <h5 className="job-title mb-1">{offer.title}</h5>
                              <p className="company-name mb-0">{offer.recruiter_name || 'Entreprise'}</p>
                            </div>
                          </div>
                          
                          <div className="job-meta mb-3">
                            <div className="meta-item">
                              <i className="bi bi-geo-alt me-2"></i>
                              <span>{offer.location}</span>
                            </div>
                            <div className="meta-item">
                              <i className="bi bi-calendar3 me-2"></i>
                              <span>Candidature: {new Date(offer.created_at).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </div>
                          
                          <p className="job-description mb-3">
                            {offer.description.length > 100 
                              ? `${offer.description.substring(0, 100)}...` 
                              : offer.description}
                          </p>
                          
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="job-badges">
                              {offer.contract_type && (
                                <Badge bg="light" text="dark" className="me-2">
                                  {offer.contract_type}
                                </Badge>
                              )}
                              {hasAppliedToOffer(offer.id) ? (
                                <Badge bg="success" className="me-2">Déjà postulé</Badge>
                              ) : (
                                <Badge bg="success" className="new-badge">Nouveau</Badge>
                              )}
                            </div>
                            {hasAppliedToOffer(offer.id) ? (
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                disabled
                                title="Vous avez déjà postulé à cette offre"
                              >
                                <i className="bi bi-check-circle me-1"></i>
                                Déjà postulé
                              </Button>
                            ) : (
                              <Link to={`/job-offers/${offer.id}`} className="btn btn-outline-primary btn-sm">
                                Voir détails
                              </Link>
                            )}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
    </div>
  );
};

export default CandidateDashboard;
