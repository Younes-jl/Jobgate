import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import api from '../../services/api';

const EntretienPage = () => {
  const { token } = useParams();
  const [linkData, setLinkData] = useState(null);
  const [campaignData, setCampaignData] = useState(null);
  const [jobOfferData, setJobOfferData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [interviewStarted, setInterviewStarted] = useState(false);

  useEffect(() => {
    const validateTokenAndFetchData = async () => {
      try {
        setLoading(true);
        
        // 1. Valider le token et récupérer les informations du lien
        const linkResponse = await api.get(`/interviews/campaign-links/${token}/`);
        
        if (!linkResponse.data.valid) {
          setError('Ce lien d\'invitation n\'est plus valide ou a expiré.');
          setLoading(false);
          return;
        }
        
        setLinkData(linkResponse.data);
        
        // 2. Récupérer les détails de la campagne (endpoint public)
        const campaignResponse = await api.get(`/interviews/campaigns/${linkResponse.data.campaign_id}/public/`);
        setCampaignData(campaignResponse.data);
        
        // 3. Récupérer les détails de l'offre d'emploi (endpoint public)
        const jobOfferResponse = await api.get(`/interviews/offers/${campaignResponse.data.job_offer}/public/`);
        setJobOfferData(jobOfferResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err);
        console.error('Détails de l\'erreur:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          message: err.message,
          config: err.config
        });
        
        if (err.response?.status === 404) {
          setError('Lien d\'invitation invalide ou introuvable.');
        } else if (err.response?.status === 403) {
          setError('Accès non autorisé à ce lien d\'invitation.');
        } else if (err.response?.status === 401) {
          setError('Erreur d\'authentification. Le lien pourrait être expiré.');
        } else {
          const errorDetail = err.response?.data?.detail || err.message || 'Erreur inconnue';
          setError(`Erreur lors du chargement des informations: ${errorDetail}. Veuillez réessayer.`);
        }
        setLoading(false);
      }
    };

    if (token) {
      validateTokenAndFetchData();
    }
  }, [token]);

  const handleStartInterview = () => {
    // Marquer le lien comme utilisé
    // Pour l'instant, on va juste changer l'état pour simuler le début de l'entretien
    setInterviewStarted(true);
    
    // Ici vous pourrez ajouter la logique pour:
    // - Marquer le lien comme utilisé dans la base de données
    // - Rediriger vers la page de questions d'entretien
    // - Commencer l'enregistrement vidéo
    console.log('Entretien commencé pour la campagne:', campaignData?.title);
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" role="status" variant="primary" />
        <h4 className="mt-3">Chargement de votre invitation...</h4>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Row className="justify-content-center">
          <Col md={8}>
            <Alert variant="danger">
              <Alert.Heading>Erreur</Alert.Heading>
              <p>{error}</p>
              <hr />
              <p className="mb-0">
                Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le recruteur.
              </p>
            </Alert>
          </Col>
        </Row>
      </Container>
    );
  }

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (interviewStarted) {
    return (
      <Container className="mt-5">
        <Row className="justify-content-center">
          <Col md={8}>
            <Card className="text-center">
              <Card.Body>
                <div className="mb-4">
                  <i className="bi bi-camera-video text-success" style={{ fontSize: '4rem' }}></i>
                </div>
                <Card.Title>Entretien en cours...</Card.Title>
                <Card.Text>
                  L'entretien pour <strong>{campaignData?.title}</strong> a commencé.
                </Card.Text>
                <Card.Text className="text-muted">
                  Cette page sera bientôt remplacée par l'interface d'entretien vidéo.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Container className="py-4">
        <Row className="justify-content-center">
          <Col md={10}>
            {/* Header avec logo/titre simple */}
            <div className="text-center mb-4">
              <h2 className="text-primary mb-0">
                <i className="bi bi-camera-video me-2"></i>
                Entretien Vidéo JobGate
              </h2>
              <hr className="w-50 mx-auto" />
            </div>

            {/* Header avec informations de l'invitation */}
            <Card className="mb-4 border-success shadow-sm">
              <Card.Header className="bg-success text-white">
                <h5 className="mb-0">
                  <i className="bi bi-check-circle me-2"></i>
                  Invitation Validée
                </h5>
              </Card.Header>
              <Card.Body className="bg-light">
                <Row className="text-center">
                  <Col md={4}>
                    <p className="mb-0">
                      <strong>Statut:</strong>{' '}
                      <Badge bg="success">
                        Lien valide
                      </Badge>
                    </p>
                  </Col>
                  <Col md={4}>
                    <p className="mb-0">
                      <strong>Expire le:</strong>{' '}
                      <small className="text-muted">
                        {new Date(linkData?.expires_at).toLocaleString('fr-FR')}
                      </small>
                    </p>
                  </Col>
                  <Col md={4}>
                    <p className="mb-0">
                      <strong>Utilisations:</strong>{' '}
                      <small className="text-muted">
                        {linkData?.uses_count || 0}/{linkData?.max_uses || 1}
                      </small>
                    </p>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Informations de la campagne */}
            <Card className="mb-4 shadow-sm">
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">
                  <i className="bi bi-megaphone me-2"></i>
                  Campagne d'Entretien
                </h5>
              </Card.Header>
              <Card.Body>
                <h3 className="text-primary mb-3">{campaignData?.title}</h3>
                <p className="lead mb-4">{campaignData?.description}</p>
                
                <Row>
                  <Col md={4}>
                    <div className="text-center p-3 bg-light rounded">
                      <i className="bi bi-calendar-event text-primary fs-4"></i>
                      <p className="mb-1 mt-2"><strong>Début</strong></p>
                      <small className="text-muted">
                        {new Date(campaignData?.start_date).toLocaleDateString('fr-FR')}
                      </small>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="text-center p-3 bg-light rounded">
                      <i className="bi bi-calendar-x text-primary fs-4"></i>
                      <p className="mb-1 mt-2"><strong>Fin</strong></p>
                      <small className="text-muted">
                        {new Date(campaignData?.end_date).toLocaleDateString('fr-FR')}
                      </small>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="text-center p-3 bg-light rounded">
                      <i className="bi bi-question-circle text-primary fs-4"></i>
                      <p className="mb-1 mt-2"><strong>Questions</strong></p>
                      <Badge bg="info" className="fs-6">
                        {campaignData?.questions?.length || 0}
                      </Badge>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Informations de l'offre d'emploi */}
            <Card className="mb-4 shadow-sm">
              <Card.Header className="bg-warning text-dark">
                <h5 className="mb-0">
                  <i className="bi bi-briefcase me-2"></i>
                  Offre d'Emploi
                </h5>
              </Card.Header>
              <Card.Body>
                <h3 className="text-warning mb-3">{jobOfferData?.title}</h3>
                <p className="mb-4">{jobOfferData?.description}</p>
                
                <Row className="mb-3">
                  <Col md={6}>
                    <div className="d-flex align-items-center mb-3">
                      <i className="bi bi-geo-alt text-warning me-2 fs-5"></i>
                      <div>
                        <strong>Lieu:</strong>
                        <p className="mb-0 text-muted">{jobOfferData?.location}</p>
                      </div>
                    </div>
                    
                    <div className="d-flex align-items-center mb-3">
                      <i className="bi bi-file-earmark-text text-warning me-2 fs-5"></i>
                      <div>
                        <strong>Type de contrat:</strong>
                        <p className="mb-0">
                          <Badge bg="secondary">{jobOfferData?.contract_type}</Badge>
                        </p>
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    {jobOfferData?.salary && (
                      <div className="d-flex align-items-center mb-3">
                        <i className="bi bi-currency-euro text-warning me-2 fs-5"></i>
                        <div>
                          <strong>Salaire:</strong>
                          <p className="mb-0 text-muted">{jobOfferData.salary}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="d-flex align-items-center mb-3">
                      <i className="bi bi-calendar-plus text-warning me-2 fs-5"></i>
                      <div>
                        <strong>Publié le:</strong>
                        <p className="mb-0 text-muted">
                          {new Date(jobOfferData?.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </Col>
                </Row>

                {jobOfferData?.prerequisites && (
                  <div className="mt-4 p-3 bg-light rounded">
                    <h6 className="text-warning">
                      <i className="bi bi-list-check me-2"></i>
                      Prérequis:
                    </h6>
                    <p className="mb-0 text-muted">{jobOfferData.prerequisites}</p>
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Bouton pour commencer l'entretien */}
            <Card className="text-center shadow-lg border-0" style={{ backgroundColor: '#e8f5e8' }}>
              <Card.Body className="py-5">
                <div className="mb-4">
                  <i className="bi bi-play-circle text-success" style={{ fontSize: '5rem' }}></i>
                </div>
                <h4 className="text-success mb-3">Prêt à commencer votre entretien ?</h4>
                <p className="text-muted mb-4 fs-6">
                  <i className="bi bi-info-circle me-2"></i>
                  Assurez-vous d'être dans un environnement calme avec une bonne connexion internet.<br/>
                  Une fois commencé, vous ne pourrez plus revenir en arrière.
                </p>
                
                <Button 
                  variant="success" 
                  size="lg"
                  onClick={handleStartInterview}
                  className="px-5 py-3 fs-5"
                  style={{ minWidth: '250px' }}
                >
                  <i className="bi bi-camera-video me-3"></i>
                  Commencer l'Entretien
                </Button>
                
                <div className="mt-4">
                  <small className="text-muted d-flex align-items-center justify-content-center">
                    <i className="bi bi-shield-check me-2 text-success"></i>
                    Votre entretien sera enregistré de manière sécurisée
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default EntretienPage;