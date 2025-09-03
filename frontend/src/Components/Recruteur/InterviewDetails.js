import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Badge, Button, Form, Alert, Spinner, Modal, Container } from 'react-bootstrap';
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentComments, setCurrentComments] = useState('');
  const [overallScore, setOverallScore] = useState(0);
  const [overallComments, setOverallComments] = useState('');
  const [savingEvaluation, setSavingEvaluation] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [evaluationModal, setEvaluationModal] = useState({ show: false, answerId: null, currentScore: '', currentNotes: '' });
  const videoRef = useRef(null);

  useEffect(() => {
    fetchInterviewData();
  }, [applicationId]);

  // Effect pour recharger la vidéo quand la question change
  useEffect(() => {
    if (videoRef.current && candidateAnswers.length > 0) {
      const currentAnswer = candidateAnswers[currentQuestionIndex];
      if (currentAnswer && currentAnswer.video_url) {
        videoRef.current.load(); // Force le rechargement de la vidéo
        setVideoPlaying(false); // Reset l'état de lecture
      }
    }
  }, [currentQuestionIndex, candidateAnswers]);

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

  // Video control functions
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setVideoPlaying(true);
    }
  };

  const handleVideoPlay = () => {
    setVideoPlaying(true);
  };

  const handleVideoPause = () => {
    setVideoPlaying(false);
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

  const StarRating = ({ rating, onRatingChange, readonly = false }) => {
    return (
      <div className="star-rating d-flex align-items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <i
            key={star}
            className={`bi ${star <= rating ? 'bi-star-fill' : 'bi-star'} text-warning me-1`}
            style={{ 
              fontSize: '1.2rem', 
              cursor: readonly ? 'default' : 'pointer' 
            }}
            onClick={() => !readonly && onRatingChange(star)}
          ></i>
        ))}
        <span className="ms-2 text-muted">({rating}/5)</span>
      </div>
    );
  };

  const currentAnswer = candidateAnswers[currentQuestionIndex];

  return (
    <Container fluid className="py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h2 className="fw-bold mb-1" style={{ color: '#2c3e50' }}>Reviewing: {application.candidate.username}</h2>
            <p className="text-muted mb-0">
              Campaign: <span className="fw-medium">{campaign?.title || application.job_offer?.title}</span> • Q2 2024
            </p>
          </div>
          <Button variant="outline-secondary" onClick={() => navigate(-1)} className="px-3">
            <i className="bi bi-arrow-left me-2"></i>Back
          </Button>
        </div>
      </div>

      <Row className="g-4">
        {/* Left Column - Video Player */}
        <Col lg={7}>
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body className="p-0">
              <div className="p-4 pb-3">
                <h5 className="fw-bold mb-1">Playing Video for Question {currentQuestionIndex + 1}</h5>
              </div>
              
              {candidateAnswers.length > 0 && currentAnswer ? (
                <div className="px-4 pb-4">
                  {/* Video Player */}
                  <div className="video-player-container mb-3" style={{ 
                    backgroundColor: '#000', 
                    borderRadius: '12px', 
                    position: 'relative',
                    paddingBottom: '56.25%',
                    height: 0,
                    overflow: 'hidden'
                  }}>
                    <video 
                      ref={videoRef}
                      key={`video-${currentQuestionIndex}-${currentAnswer.id}`}
                      controls 
                      style={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        borderRadius: '12px'
                      }}
                      onPlay={handleVideoPlay}
                      onPause={handleVideoPause}
                    >
                      <source src={currentAnswer.video_url} type="video/mp4" />
                    </video>
                  </div>
                  
                  {/* Video Controls */}
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-muted">Duration: {formatDuration(currentAnswer.duration)} / 2:00</small>
                    </div>
                    <div>
                      <Button 
                        variant="primary" 
                        className="me-2"
                        onClick={handlePlayPause}
                      >
                        <i className={`bi ${videoPlaying ? 'bi-pause' : 'bi-play'}`}></i>
                        {videoPlaying ? 'Pause' : 'Play'}
                      </Button>
                      <Button 
                        variant="outline-secondary"
                        onClick={handleReplay}
                      >
                        <i className="bi bi-arrow-clockwise"></i>
                        Replay
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-muted">
                  <i className="bi bi-camera-video-off" style={{ fontSize: '3rem' }}></i>
                  <p className="mt-3">No video responses available</p>
                </div>
              )}
            </Card.Body>
          </Card>
          
          {/* Interview Questions */}
          <Card className="shadow-sm border-0">
            <Card.Body>
              <h6 className="fw-bold mb-3">Interview Questions</h6>
              {candidateAnswers.map((answer, index) => (
                <Card 
                  key={answer.id} 
                  className={`mb-3 cursor-pointer ${index === currentQuestionIndex ? 'border-primary' : 'border-light'}`}
                  onClick={() => setCurrentQuestionIndex(index)}
                  style={{ cursor: 'pointer' }}
                >
                  <Card.Body className="py-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <h6 className="text-primary mb-1">Question {index + 1}</h6>
                        <p className="mb-0 text-muted small">{answer.question}</p>
                      </div>
                      {answer.score && (
                        <Badge bg="success" className="ms-2">
                          {Math.round(answer.score / 20)}/5 ⭐
                        </Badge>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </Card.Body>
          </Card>
        </Col>
        
        {/* Right Column - Scoring */}
        <Col lg={5}>
          {candidateAnswers.length > 0 && currentAnswer ? (
            <>
              {/* Current Question Score */}
              <Card className="shadow-sm border-0 mb-4">
                <Card.Body>
                  <h6 className="fw-bold mb-3">Score for Question {currentQuestionIndex + 1}</h6>
                  
                  <div className="mb-3">
                    <label className="form-label small text-muted">Rating (1-5 stars)</label>
                    <StarRating 
                      rating={currentScore} 
                      onRatingChange={setCurrentScore}
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label small text-muted">Comments</label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      placeholder="Add specific feedback for this answer..."
                      value={currentComments}
                      onChange={(e) => setCurrentComments(e.target.value)}
                      style={{ resize: 'none', fontSize: '0.9rem' }}
                    />
                    <div className="text-end mt-1">
                      <small className="text-muted">{currentComments.length}/500</small>
                    </div>
                  </div>
                  
                  <Button 
                    variant="primary" 
                    className="w-100"
                    onClick={() => {
                      // Save current question score
                      const updatedAnswers = [...candidateAnswers];
                      updatedAnswers[currentQuestionIndex] = {
                        ...updatedAnswers[currentQuestionIndex],
                        score: currentScore * 20, // Convert 1-5 to 0-100
                        recruiter_notes: currentComments
                      };
                      setCandidateAnswers(updatedAnswers);
                    }}
                  >
                    <i className="bi bi-save me-2"></i>
                    Save Score & Comment
                  </Button>
                </Card.Body>
              </Card>
              
              {/* Overall Evaluation */}
              <Card className="shadow-sm border-0 mb-4">
                <Card.Body>
                  <h6 className="fw-bold mb-3">Overall Interview Evaluation</h6>
                  
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small text-muted">Current Overall: {overallScore}/5</span>
                      <div className="d-flex">
                        <i className="bi bi-star-fill text-warning me-1"></i>
                        <span className="fw-bold">{overallScore}</span>
                      </div>
                    </div>
                    <StarRating 
                      rating={overallScore} 
                      onRatingChange={setOverallScore}
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label small text-muted">General Comments</label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      placeholder="Overall feedback and recommendations..."
                      value={overallComments}
                      onChange={(e) => setOverallComments(e.target.value)}
                      style={{ resize: 'none', fontSize: '0.9rem' }}
                    />
                  </div>
                  
                  <Button 
                    variant="success" 
                    className="w-100"
                    onClick={() => {
                      // Save overall evaluation
                      console.log('Saving overall evaluation:', { overallScore, overallComments });
                    }}
                  >
                    <i className="bi bi-check-circle me-2"></i>
                    Finalize Evaluation
                  </Button>
                </Card.Body>
              </Card>
              
              {/* AI Insights */}
              <Card className="shadow-sm border-0">
                <Card.Body>
                  <div className="d-flex align-items-center mb-3">
                    <i className="bi bi-robot text-primary me-2"></i>
                    <h6 className="fw-bold mb-0">AI Insights (Simulated)</h6>
                  </div>
                  
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <small className="text-muted">Sentiment Analysis</small>
                      <Badge bg="success">Positive</Badge>
                    </div>
                    <div className="progress" style={{ height: '4px' }}>
                      <div className="progress-bar bg-success" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <small className="text-muted">Communication Clarity</small>
                      <Badge bg="primary">High</Badge>
                    </div>
                    <div className="progress" style={{ height: '4px' }}>
                      <div className="progress-bar bg-primary" style={{ width: '90%' }}></div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <small className="text-muted">Confidence Level</small>
                      <Badge bg="warning">Moderate</Badge>
                    </div>
                    <div className="progress" style={{ height: '4px' }}>
                      <div className="progress-bar bg-warning" style={{ width: '70%' }}></div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    className="w-100"
                    disabled
                  >
                    <i className="bi bi-share me-2"></i>
                    Share with Hiring Manager
                  </Button>
                </Card.Body>
              </Card>
            </>
          ) : (
            <Card className="shadow-sm border-0">
              <Card.Body className="text-center text-muted py-5">
                <i className="bi bi-clipboard-x" style={{ fontSize: '3rem' }}></i>
                <p className="mt-3">No interview responses to evaluate</p>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

    </Container>
  );
};

export default InterviewDetails;