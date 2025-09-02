import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button, Form, Alert, Spinner, Modal } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import './RecruiterStyles.css';

const InterviewDetails = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  
  const [application, setApplication] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [candidateAnswers, setCandidateAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [evaluationModal, setEvaluationModal] = useState({ show: false, answerId: null, currentScore: '', currentNotes: '' });
  const [savingEvaluation, setSavingEvaluation] = useState(false);

  useEffect(() => {
    fetchInterviewData();
  }, [applicationId]);

  const fetchInterviewData = async () => {
    try {
      setLoading(true);
      console.log('Fetching interview data for application:', applicationId);
      
      // 1. Récupérer les détails de la candidature
      const appResponse = await api.get(`/interviews/applications/${applicationId}/`);
      const applicationData = appResponse.data;
      console.log('Application data:', applicationData);
      setApplication(applicationData);

      // 2. Récupérer la campagne associée à l'offre
      try {
        const campaignResponse = await api.get(`/interviews/campaigns/`);
        console.log('All campaigns:', campaignResponse.data);
        
        // Filtrer les campagnes par job_offer
        const campaigns = campaignResponse.data.results || campaignResponse.data;
        console.log('All campaigns:', campaigns);
        console.log('Looking for job_offer ID:', applicationData.job_offer?.id || applicationData.job_offer);
        console.log('Application job_offer structure:', applicationData.job_offer);
        
        const campaignData = campaigns.find(campaign => {
          const targetJobOfferId = applicationData.job_offer?.id || applicationData.job_offer;
          console.log('Checking campaign:', campaign.id, 'job_offer:', campaign.job_offer, 'target:', targetJobOfferId);
          // Vérifier les deux formats possibles
          return campaign.job_offer === targetJobOfferId || 
                 campaign.job_offer === applicationData.job_offer ||
                 (typeof campaign.job_offer === 'object' && campaign.job_offer.id === targetJobOfferId);
        });
        
        console.log('Found campaign:', campaignData);
        setCampaign(campaignData);

        if (campaignData) {
          // 3. Récupérer les questions de la campagne
          let questionsResponse = null; // Déclarer ici pour une portée plus large
          try {
            questionsResponse = await api.get(`/interviews/campaigns/${campaignData.id}/questions/`);
            console.log('Questions:', questionsResponse.data);
          } catch (questionsErr) {
            console.error('Error fetching questions:', questionsErr);
          }

          // 4. Récupérer les réponses du candidat pour cette campagne avec le nouvel endpoint
          try {
            console.log('Fetching candidate evaluation data...');
            console.log('Campaign ID:', campaignData.id);
            console.log('Candidate ID:', applicationData.candidate.id);
            
            const evaluationResponse = await api.get(`/interviews/answers/candidate_evaluation/?campaign_id=${campaignData.id}&candidate_id=${applicationData.candidate.id}`);
            const evaluationData = evaluationResponse.data || [];
            
            console.log('Candidate evaluation data:', evaluationData);
            console.log('Number of answers found:', evaluationData.length);
            
            if (evaluationData.length === 0) {
              console.warn('No video answers found for this candidate in this campaign');
              console.log('Trying alternative endpoint...');
              
              // Essayer l'ancien endpoint comme fallback
              try {
                const fallbackResponse = await api.get(`/interviews/answers/by_campaign/?campaign_id=${campaignData.id}`);
                const allAnswers = fallbackResponse.data.results || fallbackResponse.data || [];
                console.log('Fallback - All answers in campaign:', allAnswers.length);
                
                const candidateAnswers = allAnswers.filter(answer => {
                  const candidateMatch = answer.candidate?.id === applicationData.candidate.id || 
                                       answer.candidate === applicationData.candidate.id;
                  if (candidateMatch) {
                    console.log('Found answer via fallback:', answer.id);
                  }
                  return candidateMatch;
                });
                
                console.log('Fallback - Candidate answers found:', candidateAnswers.length);
                setCandidateAnswers(candidateAnswers.map(answer => ({
                  id: answer.id,
                  question: answer.question_text || 'Question non disponible',
                  video_url: answer.cloudinary_secure_url || answer.cloudinary_url,
                  score: answer.score,
                  recruiter_notes: answer.recruiter_notes || '',
                  duration: answer.duration,
                  created_at: answer.created_at,
                  question_order: answer.question?.order || 1
                })));
              } catch (fallbackErr) {
                console.error('Fallback also failed:', fallbackErr);
                setCandidateAnswers([]);
              }
            } else {
              setCandidateAnswers(evaluationData);
            }
          } catch (answersErr) {
            console.error('Error fetching candidate evaluation:', answersErr);
            console.error('Error details:', {
              message: answersErr.message,
              status: answersErr.response?.status,
              data: answersErr.response?.data
            });
            setCandidateAnswers([]);
          }

        } else {
          console.warn('No campaign found for this job offer');
          setCandidateAnswers([]);
        }
      } catch (campaignErr) {
        console.error('Error fetching campaign:', campaignErr);
        console.error('Campaign error details:', {
          message: campaignErr.message,
          status: campaignErr.response?.status,
          data: campaignErr.response?.data
        });
        setCampaign(null);
        setCandidateAnswers([]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching interview data:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      let errorMessage = 'Erreur lors du chargement des données d\'entretien';
      
      if (err.response?.status === 404) {
        errorMessage = 'Candidature non trouvée';
      } else if (err.response?.status === 403) {
        errorMessage = 'Accès non autorisé à cette candidature';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Fonctions pour gérer l'évaluation des réponses
  const openEvaluationModal = (answer) => {
    setEvaluationModal({
      show: true,
      answerId: answer.id,
      currentScore: answer.score || '',
      currentNotes: answer.recruiter_notes || ''
    });
  };

  const closeEvaluationModal = () => {
    setEvaluationModal({ show: false, answerId: null, currentScore: '', currentNotes: '' });
  };

  const saveEvaluation = async () => {
    try {
      setSavingEvaluation(true);
      const { answerId, currentScore, currentNotes } = evaluationModal;
      
      await api.patch(`/interviews/answers/${answerId}/update_evaluation/`, {
        score: currentScore ? parseInt(currentScore) : null,
        recruiter_notes: currentNotes
      });
      
      // Mettre à jour les données locales
      setCandidateAnswers(prev => prev.map(answer => 
        answer.id === answerId 
          ? { ...answer, score: currentScore ? parseInt(currentScore) : null, recruiter_notes: currentNotes }
          : answer
      ));
      
      closeEvaluationModal();
    } catch (err) {
      console.error('Error saving evaluation:', err);
      alert('Erreur lors de la sauvegarde de l\'évaluation');
    } finally {
      setSavingEvaluation(false);
    }
  };

  const downloadVideo = (videoUrl, questionText) => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `reponse_${questionText.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { variant: 'warning', text: 'En attente' },
      'reviewed': { variant: 'info', text: 'Examiné' },
      'accepted': { variant: 'success', text: 'Accepté' },
      'rejected': { variant: 'danger', text: 'Rejeté' }
    };
    
    const config = statusConfig[status] || { variant: 'secondary', text: status };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };



  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Chargement...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Erreur</Alert.Heading>
        <p>{error}</p>
        <Button variant="outline-danger" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </Alert>
    );
  }

  if (!application) {
    return (
      <Alert variant="warning">
        <Alert.Heading>Candidature introuvable</Alert.Heading>
        <p>Impossible de charger les détails de la candidature.</p>
        <Button variant="outline-warning" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </Alert>
    );
  }

  if (!campaign) {
    return (
      <Alert variant="info">
        <Alert.Heading>Aucune campagne d'entretien</Alert.Heading>
        <p>Aucune campagne d'entretien n'a été créée pour cette offre d'emploi.</p>
        <div className="mt-3">
          <p><strong>Candidat:</strong> {application.candidate.username}</p>
          <p><strong>Offre:</strong> {application.job_offer.title}</p>
          <p><strong>Statut:</strong> {getStatusBadge(application.status)}</p>
        </div>
        <Button variant="outline-info" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </Alert>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* En-tête */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Évaluation d'entretien</h2>
              <p className="text-muted mb-0">
                Candidat: <strong>{application.candidate.username}</strong> • 
                Offre: <strong>{application.job_offer?.title || 'Titre non disponible'}</strong>
              </p>
            </div>
            <Button variant="outline-secondary" onClick={() => navigate(-1)}>
              <i className="bi bi-arrow-left me-2"></i>Retour
            </Button>
          </div>
        </Col>
      </Row>

      <Row>
        {/* Informations du candidat */}
        <Col lg={4} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">
                <i className="bi bi-person-circle me-2"></i>Informations du candidat
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <strong>Nom:</strong> {application.candidate.username}
              </div>
              <div className="mb-3">
                <strong>Email:</strong> {application.candidate.email}
              </div>
              <div className="mb-3">
                <strong>Date de candidature:</strong> {formatDate(application.created_at)}
              </div>
              <div className="mb-3">
                <strong>Statut actuel:</strong> {getStatusBadge(application.status)}
              </div>
              <div>
                <strong>Réponses soumises:</strong> {candidateAnswers.length}
              </div>
            </Card.Body>
          </Card>

          {/* Statistiques d'évaluation */}
          <Card className="mt-3">
            <Card.Header>
              <h5 className="mb-0">
                <i className="bi bi-bar-chart me-2"></i>Statistiques
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <strong>Score moyen:</strong> {
                  candidateAnswers.length > 0 
                    ? Math.round(candidateAnswers.filter(a => a.score).reduce((sum, a) => sum + a.score, 0) / candidateAnswers.filter(a => a.score).length) || 'N/A'
                    : 'N/A'
                }/100
              </div>
              <div className="mb-3">
                <strong>Réponses évaluées:</strong> {candidateAnswers.filter(a => a.score).length} / {candidateAnswers.length}
              </div>
              <div>
                <strong>Statut:</strong> {getStatusBadge(application.status)}
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Questions et réponses vidéo */}
        <Col lg={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <i className="bi bi-camera-video me-2"></i>Questions et réponses vidéo
              </h5>
            </Card.Header>
            <Card.Body>
              {candidateAnswers.length === 0 ? (
                <Alert variant="info">
                  <i className="bi bi-info-circle me-2"></i>
                  Aucune réponse vidéo trouvée pour ce candidat dans cette campagne.
                </Alert>
              ) : (
                <div className="evaluation-container">
                  {candidateAnswers.map((answer, index) => (
                    <div key={answer.id} className="answer-evaluation-block mb-4 p-4 border rounded">
                      {/* En-tête de la question */}
                      <div className="question-header mb-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="text-primary mb-2">
                              <i className="bi bi-question-circle me-2"></i>
                              Question {answer.question_order || index + 1}
                            </h6>
                            <p className="mb-2 fw-medium">{answer.question}</p>
                          </div>
                          <div className="text-end">
                            <small className="text-muted d-block">
                              Durée: {formatDuration(answer.duration)}
                            </small>
                            {answer.score && (
                              <Badge bg="primary" className="mt-1">
                                Score: {answer.score}/100
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Lecteur vidéo Cloudinary */}
                      <div className="video-section mb-3">
                        <div className="video-container" style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                          <video 
                            controls 
                            style={{ 
                              position: 'absolute', 
                              top: 0, 
                              left: 0, 
                              width: '100%', 
                              height: '100%',
                              borderRadius: '8px'
                            }}
                            preload="metadata"
                          >
                            <source src={answer.video_url} type="video/mp4" />
                            Votre navigateur ne supporte pas la lecture vidéo.
                          </video>
                        </div>
                      </div>

                      {/* Actions et évaluation */}
                      <div className="actions-section">
                        <Row>
                          <Col md={8}>
                            {answer.recruiter_notes && (
                              <div className="mb-2">
                                <small className="text-muted">Notes du recruteur:</small>
                                <p className="mb-0 fst-italic">{answer.recruiter_notes}</p>
                              </div>
                            )}
                          </Col>
                          <Col md={4} className="text-end">
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              className="me-2"
                              onClick={() => openEvaluationModal(answer)}
                            >
                              <i className="bi bi-star me-1"></i>
                              {answer.score ? 'Modifier' : 'Évaluer'}
                            </Button>
                            <Button 
                              variant="outline-success" 
                              size="sm"
                              onClick={() => downloadVideo(answer.video_url, answer.question)}
                            >
                              <i className="bi bi-download me-1"></i>
                              Télécharger
                            </Button>
                          </Col>
                        </Row>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal d'évaluation */}
      <Modal show={evaluationModal.show} onHide={closeEvaluationModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-star me-2"></i>
            Évaluer la réponse
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Score (0-100)</Form.Label>
              <Form.Control
                type="number"
                min="0"
                max="100"
                value={evaluationModal.currentScore}
                onChange={(e) => setEvaluationModal(prev => ({ ...prev, currentScore: e.target.value }))}
                placeholder="Entrez un score entre 0 et 100"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notes du recruteur</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={evaluationModal.currentNotes}
                onChange={(e) => setEvaluationModal(prev => ({ ...prev, currentNotes: e.target.value }))}
                placeholder="Vos commentaires sur cette réponse..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeEvaluationModal}>
            Annuler
          </Button>
          <Button 
            variant="primary" 
            onClick={saveEvaluation}
            disabled={savingEvaluation}
          >
            {savingEvaluation ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Sauvegarde...
              </>
            ) : (
              <>
                <i className="bi bi-save me-2"></i>
                Sauvegarder
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default InterviewDetails;