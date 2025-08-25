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
        if (err.response?.status === 404) {
          setError('Lien d\'invitation invalide ou introuvable.');
        } else {
          setError('Erreur lors du chargement des informations. Veuillez réessayer.');
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
    <Container className="mt-4">
      <Row className="justify-content-center">
        <Col md={10}>
          {/* Header avec informations de l'invitation */}
          <Card className="mb-4 border-primary">
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0">
                <i className="bi bi-envelope-open me-2"></i>
                Invitation à l'entretien vidéo
              </h4>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <p className="mb-2">
                    <strong>Statut:</strong>{' '}
                    <Badge bg="success" className="ms-1">
                      <i className="bi bi-check-circle me-1"></i>
                      Lien valide
                    </Badge>
                  </p>
                  <p className="mb-2">
                    <strong>Expire le:</strong>{' '}
                    <span className="text-muted">
                      {new Date(linkData?.expires_at).toLocaleString('fr-FR')}
                    </span>
                  </p>
                </Col>
                <Col md={6}>
                  <p className="mb-2">
                    <strong>Utilisations:</strong>{' '}
                    <span className="text-muted">
                      {linkData?.uses_count || 0}/{linkData?.max_uses || 1}
                    </span>
                  </p>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Informations de la campagne */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">
                <i className="bi bi-megaphone me-2"></i>
                Campagne d'entretien
              </h5>
            </Card.Header>
            <Card.Body>
              <h4 className="text-primary mb-3">{campaignData?.title}</h4>
              <p className="mb-3">{campaignData?.description}</p>
              
              <Row>
                <Col md={6}>
                  <p className="mb-2">
                    <strong>Date de début:</strong>{' '}
                    <span className="text-muted">
                      {new Date(campaignData?.start_date).toLocaleDateString('fr-FR')}
                    </span>
                  </p>
                </Col>
                <Col md={6}>
                  <p className="mb-2">
                    <strong>Date de fin:</strong>{' '}
                    <span className="text-muted">
                      {new Date(campaignData?.end_date).toLocaleDateString('fr-FR')}
                    </span>
                  </p>
                </Col>
              </Row>

              {campaignData?.questions && campaignData.questions.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2">
                    <strong>Nombre de questions:</strong>{' '}
                    <Badge bg="info">{campaignData.questions.length}</Badge>
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Informations de l'offre d'emploi */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">
                <i className="bi bi-briefcase me-2"></i>
                Offre d'emploi
              </h5>
            </Card.Header>
            <Card.Body>
              <h4 className="text-success mb-3">{jobOfferData?.title}</h4>
              <p className="mb-3">{jobOfferData?.description}</p>
              
              <Row className="mb-3">
                <Col md={6}>
                  <p className="mb-2">
                    <strong>Lieu:</strong>{' '}
                    <span className="text-muted">
                      <i className="bi bi-geo-alt me-1"></i>
                      {jobOfferData?.location}
                    </span>
                  </p>
                  <p className="mb-2">
                    <strong>Type de contrat:</strong>{' '}
                    <Badge bg="secondary">{jobOfferData?.contract_type}</Badge>
                  </p>
                </Col>
                <Col md={6}>
                  {jobOfferData?.salary && (
                    <p className="mb-2">
                      <strong>Salaire:</strong>{' '}
                      <span className="text-muted">{jobOfferData.salary}</span>
                    </p>
                  )}
                  <p className="mb-2">
                    <strong>Publié le:</strong>{' '}
                    <span className="text-muted">
                      {new Date(jobOfferData?.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </p>
                </Col>
              </Row>

              {jobOfferData?.prerequisites && (
                <div className="mt-3">
                  <h6>Prérequis:</h6>
                  <p className="text-muted">{jobOfferData.prerequisites}</p>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Bouton pour commencer l'entretien */}
          <Card className="text-center">
            <Card.Body>
              <h5 className="mb-3">Prêt à commencer votre entretien ?</h5>
              <p className="text-muted mb-4">
                Cliquez sur le bouton ci-dessous pour démarrer votre entretien vidéo différé.
                Assurez-vous d'être dans un environnement calme avec une bonne connexion internet.
              </p>
              
              <Button 
                variant="success" 
                size="lg"
                onClick={handleStartInterview}
                className="px-5"
              >
                <i className="bi bi-play-circle me-2"></i>
                Commencer l'entretien
              </Button>
              
              <div className="mt-3">
                <small className="text-muted">
                  <i className="bi bi-info-circle me-1"></i>
                  Une fois l'entretien commencé, vous ne pourrez plus revenir en arrière.
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EntretienPage;