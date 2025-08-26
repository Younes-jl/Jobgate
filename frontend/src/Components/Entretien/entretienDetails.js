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
  const [setupStage, setSetupStage] = useState(false); // Nouvelle étape de vérification
  const [cameraPermission, setCameraPermission] = useState(false);
  const [microphonePermission, setMicrophonePermission] = useState(false);
  const [videoStream, setVideoStream] = useState(null);

  // Fonction pour formater la description de l'offre
  const formatJobDescription = (description) => {
    if (!description) return '';
    
    // Diviser le texte en sections basées sur les patterns courants
    let formattedText = description
      // Remplacer les doubles astérisques par des titres
      .replace(/\*\*(.*?)\*\*/g, '<h6 class="text-primary mt-3 mb-2">$1</h6>')
      // Ajouter des tirets pour les listes (quand il y a des - au début de ligne)
      .replace(/^- /gm, '• ')
      // Séparer les phrases longues en paragraphes (après les points suivis de majuscules)
      .replace(/\. ([A-Z])/g, '.</p><p class="mb-2">$1')
      // Ajouter des retours à la ligne après certains patterns
      .replace(/\. - /g, '.</p><p class="mb-2">• ')
      .replace(/ - ([A-Z])/g, '</p><p class="mb-2">• $1');

    // Entourer le texte de paragraphes si pas déjà fait
    if (!formattedText.includes('<p>')) {
      formattedText = `<p class="mb-2">${formattedText}</p>`;
    }

    return formattedText;
  };

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
    // Passer à l'étape de vérification du micro et de la caméra
    setSetupStage(true);
  };

  // Fonction pour demander les permissions média
  const requestMediaPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setVideoStream(stream);
      setCameraPermission(true);
      setMicrophonePermission(true);
      
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'accès aux médias:', error);
      if (error.name === 'NotAllowedError') {
        setError('Accès à la caméra et au microphone refusé. Veuillez autoriser l\'accès pour continuer.');
      } else if (error.name === 'NotFoundError') {
        setError('Aucune caméra ou microphone trouvé. Vérifiez vos périphériques.');
      } else {
        setError('Erreur lors de l\'accès aux périphériques média. Veuillez réessayer.');
      }
      return false;
    }
  };

  // Fonction pour démarrer l'entretien après vérification
  const handleStartInterviewFinal = () => {
    // Arrêter le stream de test
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
    // Marquer l'entretien comme commencé
    setInterviewStarted(true);
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

  // Étape de vérification du micro et de la caméra
  if (setupStage && !interviewStarted) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <Container className="py-4">
          <Row className="justify-content-center">
            <Col md={8}>
              {/* Header */}
              <div className="text-center mb-4">
                <h2 className="text-primary mb-0">
                  <i className="bi bi-gear-fill me-2"></i>
                  Vérification Technique
                </h2>
                <hr className="w-50 mx-auto" />
              </div>

              {/* Card de vérification */}
              <Card className="mb-4 shadow-lg">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">
                    <i className="bi bi-camera-video me-2"></i>
                    Test de votre Caméra et Microphone
                  </h5>
                </Card.Header>
                <Card.Body className="text-center py-5">
                  <div className="mb-4">
                    {/* Zone de prévisualisation vidéo */}
                    <div className="position-relative d-inline-block">
                      <video
                        ref={(video) => {
                          if (video && videoStream) {
                            video.srcObject = videoStream;
                          }
                        }}
                        autoPlay
                        muted
                        className="rounded border"
                        style={{
                          width: '320px',
                          height: '240px',
                          backgroundColor: '#000',
                          transform: 'scaleX(-1)' // Effet miroir pour corriger l'inversion
                        }}
                      />
                      {!videoStream && (
                        <div
                          className="d-flex align-items-center justify-content-center rounded border"
                          style={{
                            width: '320px',
                            height: '240px',
                            backgroundColor: '#6c757d'
                          }}
                        >
                          <div className="text-white text-center">
                            <i className="bi bi-camera-video-off" style={{ fontSize: '2rem' }}></i>
                            <p className="mt-2 mb-0">Caméra non activée</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <Row>
                      <Col md={6}>
                        <div className={`p-3 rounded ${cameraPermission ? 'bg-success' : 'bg-warning'}`}>
                          <i className={`bi ${cameraPermission ? 'bi-camera-video text-white' : 'bi-camera-video-off text-dark'} me-2 fs-4`}></i>
                          <div className={cameraPermission ? 'text-white' : 'text-dark'}>
                            <strong>Caméra</strong>
                            <p className="mb-0 small">
                              {cameraPermission ? 'Fonctionnelle ✓' : 'En attente d\'autorisation'}
                            </p>
                          </div>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className={`p-3 rounded ${microphonePermission ? 'bg-success' : 'bg-warning'}`}>
                          <i className={`bi ${microphonePermission ? 'bi-mic text-white' : 'bi-mic-mute text-dark'} me-2 fs-4`}></i>
                          <div className={microphonePermission ? 'text-white' : 'text-dark'}>
                            <strong>Microphone</strong>
                            <p className="mb-0 small">
                              {microphonePermission ? 'Fonctionnel ✓' : 'En attente d\'autorisation'}
                            </p>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>

                  {/* Boutons d'action */}
                  <div className="d-flex gap-3 justify-content-center">
                    {!cameraPermission || !microphonePermission ? (
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={requestMediaPermissions}
                        className="px-4"
                      >
                        <i className="bi bi-camera-video me-2"></i>
                        Activer Caméra et Micro
                      </Button>
                    ) : (
                      <Button
                        variant="success"
                        size="lg"
                        onClick={handleStartInterviewFinal}
                        className="px-4"
                      >
                        <i className="bi bi-play-circle me-2"></i>
                        Je suis prêt à commencer !
                      </Button>
                    )}
                    
                    <Button
                      variant="outline-secondary"
                      size="lg"
                      onClick={() => setSetupStage(false)}
                      className="px-4"
                    >
                      <i className="bi bi-arrow-left me-2"></i>
                      Retour
                    </Button>
                  </div>

                  {(cameraPermission && microphonePermission) && (
                    <div className="mt-4">
                      <Alert variant="success" className="py-2">
                        <i className="bi bi-check-circle me-2"></i>
                        <strong>Parfait !</strong> Votre caméra et votre microphone fonctionnent correctement.
                      </Alert>
                    </div>
                  )}
                </Card.Body>
              </Card>

              {/* Informations complémentaires */}
              <Card className="border-info">
                <Card.Body>
                  <h6 className="text-info mb-3">
                    <i className="bi bi-info-circle me-2"></i>
                    Informations importantes
                  </h6>
                  <ul className="list-unstyled mb-0">
                    <li className="mb-2">
                      <i className="bi bi-shield-check text-success me-2"></i>
                      Vos données sont sécurisées et ne sont utilisées que pour l'entretien
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-eye text-info me-2"></i>
                      Vérifiez que vous êtes bien visible et que l'éclairage est suffisant
                    </li>
                    <li className="mb-0">
                      <i className="bi bi-volume-up text-warning me-2"></i>
                      Parlez normalement pour tester la qualité audio de votre microphone
                    </li>
                  </ul>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  // Interface de finalisation après avoir commencé l'entretien
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
                <Card.Title>Entretien Terminé</Card.Title>
                <Card.Text>
                  Merci d'avoir passé l'entretien pour <strong>{campaignData?.title}</strong>.
                </Card.Text>
                <Card.Text className="text-muted">
                  Vos réponses ont été enregistrées avec succès.
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
                
                {/* Description formatée */}
                <div className="mb-4 p-3 bg-light rounded">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: formatJobDescription(jobOfferData?.description) 
                    }} 
                  />
                </div>
                
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
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: formatJobDescription(jobOfferData.prerequisites) 
                      }} 
                    />
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Consignes pour l'entretien */}
            <Card className="mb-4 shadow-sm">
              <Card.Header className="bg-info text-white">
                <h5 className="mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  Consignes pour l'Entretien
                </h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <h6 className="text-info mb-3">
                      <i className="bi bi-gear me-2"></i>
                      Préparation Technique
                    </h6>
                    <ul className="list-unstyled">
                      <li className="mb-2">
                        <i className="bi bi-camera text-primary me-2"></i>
                        <strong>Vérifiez votre caméra</strong> - Assurez-vous qu'elle fonctionne correctement
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-mic text-primary me-2"></i>
                        <strong>Testez votre microphone</strong> - Vérifiez la qualité audio
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-wifi text-primary me-2"></i>
                        <strong>Connexion internet stable</strong> - Une bonne connexion est essentielle
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-volume-up text-primary me-2"></i>
                        <strong>Environnement calme</strong> - Choisissez un lieu sans bruit de fond
                      </li>
                    </ul>
                  </Col>
                  <Col md={6}>
                    <h6 className="text-info mb-3">
                      <i className="bi bi-clock me-2"></i>
                      Déroulement de l'Entretien
                    </h6>
                    <ul className="list-unstyled">
                      <li className="mb-2">
                        <i className="bi bi-question-circle text-success me-2"></i>
                        Une question s'affiche à l'écran
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-stopwatch text-warning me-2"></i>
                        <strong>30 secondes</strong> de préparation pour réfléchir
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-record-circle text-danger me-2"></i>
                        <strong>2 à 5 minutes</strong> pour enregistrer votre réponse
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-arrow-right text-info me-2"></i>
                        Passage automatique à la question suivante
                      </li>
                    </ul>
                  </Col>
                </Row>
                
                <hr className="my-4" />
                
                <div className="row">
                  <div className="col-12">
                    <h6 className="text-danger mb-3">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      Règles Importantes
                    </h6>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="alert alert-warning py-2 mb-2">
                          <i className="bi bi-ban me-2"></i>
                          <strong>Une seule prise</strong> autorisée par question
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="alert alert-info py-2 mb-2">
                          <i className="bi bi-arrow-clockwise me-2"></i>
                          <strong>Pas de retour en arrière</strong> possible
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-light rounded">
                  <div className="text-center">
                    <i className="bi bi-lightbulb text-warning me-2"></i>
                    <strong>Conseil :</strong> 
                    <span className="text-muted ms-2">
                      Prenez le temps de bien lire chaque question et utilisez les 30 secondes de préparation pour organiser vos idées.
                    </span>
                  </div>
                </div>
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
                  Vérifiez que vous avez bien lu toutes les consignes ci-dessus.<br/>
                  Une fois l'entretien commencé, vous ne pourrez plus revenir en arrière.
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