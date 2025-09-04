import React, { useState, useEffect } from 'react';
import { fetchAllJobOffers } from './jobOffersApi';
import { Link } from 'react-router-dom';
import { Card, Container, Row, Col, Button, Badge } from 'react-bootstrap';
import { useAuth } from '../auth/useAuth';
import './CandidateStyles.css';

/**
 * Tableau de bord du candidat pour voir toutes les offres d'emploi disponibles
 */
const CandidateDashboard = () => {
  const [jobOffers, setJobOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [candidateInfo, setCandidateInfo] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Récupérer les offres d'emploi au chargement du composant
    const loadJobOffers = async () => {
      try {
        setLoading(true);
        const offers = await fetchAllJobOffers();
        setJobOffers(offers);
        setError(null);
      } catch (err) {
        setError('Erreur lors du chargement des offres d\'emploi. Veuillez réessayer plus tard.');
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    loadJobOffers();
  }, []);

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
    <Container fluid className="py-4">
      <Row>
        {/* Section informations candidat */}
        <Col md={4}>
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-person-circle me-2"></i>
                  Mon Profil
                </h5>
                <Button 
                  variant="outline-light" 
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                >
                  <i className="bi bi-pencil me-1"></i>
                  {editMode ? 'Annuler' : 'Modifier'}
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {user ? (
                <div>
                  <div className="text-center mb-3">
                    <i className="bi bi-person-circle" style={{ fontSize: '4rem', color: '#6c757d' }}></i>
                  </div>
                  
                  {editMode ? (
                    <div>
                      <div className="mb-3">
                        <label className="form-label">Prénom</label>
                        <input className="form-control" defaultValue={user.first_name} />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Nom</label>
                        <input className="form-control" defaultValue={user.last_name} />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Email</label>
                        <input className="form-control" defaultValue={user.email} />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Téléphone</label>
                        <input className="form-control" defaultValue={user.phone || ''} />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Ville</label>
                        <input className="form-control" defaultValue={user.city || ''} />
                      </div>
                      <Button variant="success" size="sm" className="w-100">
                        <i className="bi bi-check2 me-1"></i>
                        Sauvegarder
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-2">
                        <strong>Nom complet:</strong>
                        <div>{user.first_name} {user.last_name}</div>
                      </div>
                      <div className="mb-2">
                        <strong>Email:</strong>
                        <div>{user.email}</div>
                      </div>
                      <div className="mb-2">
                        <strong>Téléphone:</strong>
                        <div>{user.phone || 'Non renseigné'}</div>
                      </div>
                      <div className="mb-2">
                        <strong>Ville:</strong>
                        <div>{user.city || 'Non renseignée'}</div>
                      </div>
                      <div className="mb-2">
                        <strong>Membre depuis:</strong>
                        <div>{new Date(user.date_joined).toLocaleDateString()}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted">
                  <i className="bi bi-person-x" style={{ fontSize: '3rem' }}></i>
                  <p>Informations non disponibles</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Section offres d'emploi */}
        <Col md={8}>
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
                    <Col md={6} key={offer.id} className="mb-4">
                      <Card className="h-100 border-0 shadow-sm">
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="fw-bold text-primary mb-0">{offer.title}</h6>
                            <Badge bg="secondary" className="ms-2">Nouveau</Badge>
                          </div>
                          
                          <div className="mb-2">
                            <i className="bi bi-geo-alt me-1 text-muted"></i>
                            <small className="text-muted">{offer.location}</small>
                          </div>
                          
                          <p className="text-muted small mb-3">
                            {offer.description.length > 80 
                              ? `${offer.description.substring(0, 80)}...` 
                              : offer.description}
                          </p>
                          
                          <div className="mb-3">
                            <div className="d-flex justify-content-between text-muted small">
                              <span>
                                <i className="bi bi-calendar-plus me-1"></i>
                                Créé: {new Date(offer.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {offer.deadline && (
                              <div className="text-muted small">
                                <i className="bi bi-calendar-x me-1"></i>
                                Expire: {new Date(offer.deadline).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          
                          <Link to={`/job-offers/${offer.id}`} className="btn btn-primary btn-sm w-100">
                            <i className="bi bi-eye me-1"></i>
                            Voir les détails
                          </Link>
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
  );
};

export default CandidateDashboard;
