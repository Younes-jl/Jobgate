import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner, Alert, Accordion } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import './RecruiterStyles.css';

/**
 * Page de détails complets d'une offre d'emploi avec campagne et questions
 * Affiche toutes les informations : offre, campagne associée, questions d'entretien
 */
const OfferCampaignDetails = () => {
  const { id } = useParams(); // ID de l'offre d'emploi
  const navigate = useNavigate();
  const [offerDetails, setOfferDetails] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOfferDetails = useCallback(async () => {
    try {
      setLoading(true);
      
      // Récupérer les détails de l'offre
      let offerData = null;
      try {
        const response = await api.get(`/jobs/${id}/`);
        offerData = response.data;
      } catch (error) {
        if (error.response?.status === 404) {
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
      
      // Récupérer la campagne associée à l'offre
      try {
        console.log('=== DIAGNOSTIC CAMPAGNE ===');
        console.log('Recherche de campagne pour l\'offre ID:', id);
        console.log('Type de l\'ID:', typeof id);
        console.log('URL de recherche:', `/interviews/campaigns/?job_offer=${id}`);
        
        const campaignResponse = await api.get(`/interviews/campaigns/?job_offer=${id}`);
        console.log('Réponse complète de l\'API:', campaignResponse);
        console.log('Campagnes trouvées:', campaignResponse.data);
        console.log('Nombre de campagnes:', campaignResponse.data?.length || 0);
        
        if (campaignResponse.data && campaignResponse.data.length > 0) {
          // Vérifier toutes les campagnes trouvées
          campaignResponse.data.forEach((camp, index) => {
            console.log(`Campagne ${index + 1}:`, {
              id: camp.id,
              title: camp.title,
              job_offer: camp.job_offer,
              job_offer_type: typeof camp.job_offer,
              matches: camp.job_offer == id || camp.job_offer === parseInt(id)
            });
          });
          
          // Filtrer pour trouver la bonne campagne
          const correctCampaign = campaignResponse.data.find(camp => 
            camp.job_offer == id || camp.job_offer === parseInt(id)
          );
          
          if (correctCampaign) {
            console.log('Campagne correcte trouvée:', correctCampaign);
            setCampaign(correctCampaign);
            
            // Récupérer les questions de la campagne
            const questionsResponse = await api.get(`/interviews/campaigns/${correctCampaign.id}/questions/`);
            setQuestions(questionsResponse.data || []);
          } else {
            console.log('Aucune campagne correspondante trouvée pour cette offre');
            setCampaign(null);
            setQuestions([]);
          }
        } else {
          console.log('Aucune campagne trouvée pour cette offre');
          setCampaign(null);
          setQuestions([]);
        }
      } catch (campaignError) {
        console.warn('Erreur lors de la recherche de campagne:', campaignError);
        setCampaign(null);
        setQuestions([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Erreur lors du chargement des détails:', err);
      setError('Impossible de charger les détails de l\'offre d\'emploi.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchOfferDetails();
    }
  }, [id, fetchOfferDetails]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'secondary';
      case 'draft': return 'warning';
      case 'closed': return 'danger';
      default: return 'primary';
    }
  };

  const getQuestionTypeColor = (type) => {
    switch (type) {
      case 'technique': return 'primary';
      case 'comportementale': return 'info';
      case 'generale': return 'secondary';
      default: return 'secondary';
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
                <h1 className="h3 mb-0 fw-bold text-primary">{offerDetails.title}</h1>
                <p className="text-muted mb-0">
                  <i className="bi bi-geo-alt me-1"></i>
                  {offerDetails.location}
                </p>
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

      <Row>
        {/* Détails de l'offre */}
        <Col lg={6} className="mb-4">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                <i className="bi bi-briefcase me-2"></i>
                Détails de l'Offre
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <h6 className="text-muted mb-2">Description</h6>
                <p className="mb-0">{offerDetails.description}</p>
              </div>
              
              {offerDetails.salary && (
                <div className="mb-3">
                  <h6 className="text-muted mb-2">Salaire</h6>
                  <p className="mb-0 fw-bold text-success">{offerDetails.salary}</p>
                </div>
              )}
              
              {offerDetails.contract_type && (
                <div className="mb-3">
                  <h6 className="text-muted mb-2">Type de contrat</h6>
                  <Badge bg="info" className="px-3 py-2">{offerDetails.contract_type}</Badge>
                </div>
              )}
              
              {offerDetails.prerequisites && (
                <div className="mb-3">
                  <h6 className="text-muted mb-2">Prérequis</h6>
                  <p className="mb-0">{offerDetails.prerequisites}</p>
                </div>
              )}
              
              <div className="mb-0">
                <h6 className="text-muted mb-2">Date de création</h6>
                <p className="mb-0">{formatDate(offerDetails.created_at)}</p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Détails de la campagne */}
        <Col lg={6} className="mb-4">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0">
                <i className="bi bi-camera-video me-2"></i>
                Campagne d'Entretien
              </h5>
            </Card.Header>
            <Card.Body>
              {campaign ? (
                <>
                  <div className="mb-3">
                    <h6 className="text-muted mb-2">Titre de la campagne</h6>
                    <p className="mb-0 fw-bold">{campaign.title}</p>
                  </div>
                  
                  <div className="mb-3">
                    <h6 className="text-muted mb-2">Description</h6>
                    <p className="mb-0">{campaign.description}</p>
                  </div>
                  
                  {campaign.start_date && (
                    <div className="mb-3">
                      <h6 className="text-muted mb-2">Date de début</h6>
                      <p className="mb-0">{formatDate(campaign.start_date)}</p>
                    </div>
                  )}
                  
                  {campaign.end_date && (
                    <div className="mb-3">
                      <h6 className="text-muted mb-2">Date de fin</h6>
                      <p className="mb-0">{formatDate(campaign.end_date)}</p>
                    </div>
                  )}
                  
                  <div className="mb-0">
                    <h6 className="text-muted mb-2">Statut</h6>
                    <Badge bg={campaign.active ? 'success' : 'secondary'} className="px-3 py-2">
                      {campaign.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <i className="bi bi-exclamation-circle text-muted mb-3" style={{ fontSize: '3rem' }}></i>
                  <h6 className="text-muted">Aucune campagne d'entretien</h6>
                  <p className="text-muted mb-0">Cette offre n'a pas encore de campagne d'entretien associée.</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Questions d'entretien */}
      {questions.length > 0 && (
        <Row>
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-warning text-dark">
                <h5 className="mb-0">
                  <i className="bi bi-question-circle me-2"></i>
                  Questions d'Entretien ({questions.length})
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                <Accordion defaultActiveKey="0" flush>
                  {questions.map((question, index) => (
                    <Accordion.Item eventKey={index.toString()} key={question.id}>
                      <Accordion.Header>
                        <div className="d-flex align-items-center justify-content-between w-100 me-3">
                          <div>
                            <span className="fw-bold">Question {question.order || index + 1}</span>
                            <Badge 
                              bg={getQuestionTypeColor(question.question_type)} 
                              className="ms-2 px-2 py-1"
                            >
                              {question.question_type || 'Générale'}
                            </Badge>
                          </div>
                          <div className="text-muted small">
                            <i className="bi bi-clock me-1"></i>
                            {question.time_limit || 60}s
                          </div>
                        </div>
                      </Accordion.Header>
                      <Accordion.Body>
                        <div className="p-3">
                          <h6 className="text-muted mb-2">Question :</h6>
                          <p className="mb-3">{question.text}</p>
                          
                          <div className="d-flex justify-content-between align-items-center text-muted small">
                            <div>
                              <i className="bi bi-tag me-1"></i>
                              Type: {question.question_type || 'Générale'}
                            </div>
                            <div>
                              <i className="bi bi-stopwatch me-1"></i>
                              Temps limite: {question.time_limit || 60} secondes
                            </div>
                            <div>
                              <i className="bi bi-calendar me-1"></i>
                              Créée le: {formatDate(question.created_at)}
                            </div>
                          </div>
                        </div>
                      </Accordion.Body>
                    </Accordion.Item>
                  ))}
                </Accordion>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Actions rapides */}
      <Row className="mt-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center py-4">
              <h5 className="mb-3">Actions rapides</h5>
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <Button 
                  variant="primary" 
                  onClick={() => navigate(`/offers/${id}`)}
                  className="rounded-pill px-4"
                >
                  <i className="bi bi-people me-2"></i>
                  Voir les candidatures
                </Button>
                
                {campaign && (
                  <Button 
                    variant="outline-success" 
                    onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}
                    className="rounded-pill px-4"
                  >
                    <i className="bi bi-pencil me-2"></i>
                    Modifier la campagne
                  </Button>
                )}
                
                <Button 
                  variant="outline-secondary" 
                  onClick={() => navigate('/recruiter-dashboard')}
                  className="rounded-pill px-4"
                >
                  <i className="bi bi-house me-2"></i>
                  Retour au dashboard
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default OfferCampaignDetails;
