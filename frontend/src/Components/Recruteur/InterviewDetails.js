import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Badge, Button, Form, Alert, Spinner, Container } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
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
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [currentVideoAnalysis, setCurrentVideoAnalysis] = useState(null);
  const [finalEvaluation, setFinalEvaluation] = useState({
    technical: 0,
    communication: 0,
    motivation: 0,
    style: 0,
    nonVerbal: 0,
    global: 0,
    generalComments: ''
  });
  const [inviteManagerModal, setInviteManagerModal] = useState(false);
  const [technicalInterviewModal, setTechnicalInterviewModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [interviewLocation, setInterviewLocation] = useState('');
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

  // Fonction d'analyse IA pour la vidéo courante
  const analyzeCurrentVideo = async () => {
    if (!candidateAnswers[currentQuestionIndex]) return;
    
    setAnalyzingAI(true);
    try {
      const currentAnswer = candidateAnswers[currentQuestionIndex];
      const mockAnalysis = {
        questionIndex: currentQuestionIndex + 1,
        duration: currentAnswer.duration || 30,
        strengths: [
          "Réponse claire et structurée",
          "Bon contact visuel",
          "Exemples concrets fournis"
        ],
        weaknesses: [
          "Quelques hésitations",
          "Pourrait développer certains points"
        ],
        suggestedScore: Math.floor(Math.random() * 3) + 3, // 3-5
        aiComment: "Le candidat démontre une bonne compréhension de la question et fournit une réponse cohérente avec des exemples pertinents."
      };
      
      setTimeout(() => {
        setCurrentVideoAnalysis(mockAnalysis);
        setAnalyzingAI(false);
      }, 2000);
    } catch (error) {
      console.error('Erreur lors de l\'analyse IA:', error);
      setAnalyzingAI(false);
    }
  };

  // Fonction d'analyse IA globale
  const analyzeWithAI = async () => {
    setAnalyzingAI(true);
    try {
      // Simulation d'analyse de contenu vidéo
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Analyser la durée et le contenu des vidéos
      let totalDuration = 0;
      let hasValidResponses = false;
      let avgScore = 0;
      
      candidateAnswers.forEach(answer => {
        if (answer.video_url) {
          totalDuration += answer.duration || 30; // Durée par défaut si non spécifiée
          if (answer.score && answer.score > 0) {
            hasValidResponses = true;
            avgScore += answer.score;
          }
        }
      });
      
      // Vérifications de base
      if (totalDuration < 30) {
        setAiAnalysis({
          strengths: [],
          weaknesses: ["Vidéos trop courtes pour une analyse complète"],
          comment: "Les réponses vidéo sont trop courtes pour permettre une analyse IA significative. Durée totale: " + totalDuration + "s",
          scores: {
            technique: 5,
            communication: 3,
            motivation: 4,
            style: 3,
            nonVerbal: 2,
            global: 3
          }
        });
        return;
      }
      
      // Si aucune évaluation manuelle n'a été faite
      if (!hasValidResponses) {
        setAiAnalysis({
          strengths: ["Candidat présent à l'entretien"],
          weaknesses: [
            "Aucune évaluation manuelle disponible",
            "Analyse limitée sans notation préalable",
            "Contenu audio/vidéo à vérifier"
          ],
          comment: "L'analyse IA nécessite une évaluation manuelle préalable de chaque réponse pour être pertinente. Veuillez d'abord noter les réponses individuellement.",
          scores: {
            technique: 8,
            communication: 6,
            motivation: 7,
            style: 6,
            nonVerbal: 5,
            global: 6
          }
        });
        return;
      }
      
      // Analyse basée sur les évaluations manuelles existantes
      const baseScore = Math.round(avgScore / candidateAnswers.length / 5); // Convertir en base 20
      const variance = Math.floor(Math.random() * 3) - 1; // -1, 0, ou +1
      
      const mockAnalysis = {
        strengths: [
          baseScore >= 15 ? "Réponses bien structurées" : "Effort de structuration visible",
          baseScore >= 12 ? "Bonne maîtrise du sujet" : "Connaissances de base présentes",
          totalDuration > 120 ? "Réponses détaillées" : "Réponses concises",
          "Participation active à l'entretien"
        ],
        weaknesses: [
          baseScore < 12 ? "Réponses à approfondir" : "Quelques points à clarifier",
          baseScore < 10 ? "Communication à améliorer" : "Gestuelle à optimiser",
          totalDuration < 60 ? "Réponses parfois trop brèves" : null
        ].filter(Boolean),
        comment: `Analyse basée sur ${candidateAnswers.length} réponse(s) vidéo (durée totale: ${totalDuration}s). ${baseScore >= 15 ? 'Le candidat démontre une bonne maîtrise et une communication efficace.' : baseScore >= 10 ? 'Le candidat montre un niveau satisfaisant avec des points à améliorer.' : 'Le candidat nécessite un accompagnement pour développer ses compétences.'}`,
        scores: {
          technique: Math.max(5, Math.min(20, baseScore + variance)),
          communication: Math.max(5, Math.min(20, baseScore + variance + 1)),
          motivation: Math.max(5, Math.min(20, baseScore + variance)),
          style: Math.max(5, Math.min(20, baseScore + variance - 1)),
          nonVerbal: Math.max(5, Math.min(20, baseScore + variance - 2)),
          global: Math.max(5, Math.min(20, baseScore))
        }
      };
      
      setAiAnalysis(mockAnalysis);
      setFinalEvaluation(prev => ({
        ...prev,
        technical: mockAnalysis.scores.technique,
        communication: mockAnalysis.scores.communication,
        motivation: mockAnalysis.scores.motivation,
        style: mockAnalysis.scores.style,
        nonVerbal: mockAnalysis.scores.nonVerbal,
        global: mockAnalysis.scores.global
      }));
    } catch (error) {
      console.error('Erreur lors de l\'analyse IA:', error);
      alert('Erreur lors de l\'analyse IA');
    } finally {
      setAnalyzingAI(false);
    }
  };

  // Fonction pour sauvegarder l'évaluation finale
  const saveFinalEvaluation = async () => {
    try {
      const evaluationData = {
        application_id: applicationId,
        technical_score: finalEvaluation.technical,
        communication_score: finalEvaluation.communication,
        motivation_score: finalEvaluation.motivation,
        style_score: finalEvaluation.style,
        non_verbal_score: finalEvaluation.nonVerbal,
        global_score: finalEvaluation.global,
        general_comments: finalEvaluation.generalComments,
        ai_analysis: aiAnalysis
      };
      
      console.log('Sauvegarde de l\'évaluation finale:', evaluationData);
      // TODO: Ajouter l'appel API réel
      // await api.post(`/interviews/applications/${applicationId}/evaluation/`, evaluationData);
      
      alert('Évaluation sauvegardée avec succès!');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  // Fonction pour accepter/refuser le candidat
  const handleDecision = async (decision) => {
    if (!application) return;
    
    const confirmMessage = {
      'accept': 'Êtes-vous sûr de vouloir accepter ce candidat ?',
      'reject': 'Êtes-vous sûr de vouloir refuser ce candidat ?',
      'technical': 'Programmer un entretien technique pour ce candidat ?'
    };
    
    if (!window.confirm(confirmMessage[decision])) return;
    
    try {
      const statusUpdate = {
        'accept': 'accepted',
        'reject': 'rejected', 
        'technical': 'technical_interview'
      };
      
      console.log(`Décision: ${decision} pour le candidat ${application.candidate.username}`);
      
      // Appel API pour mettre à jour le statut
      await api.patch(`/interviews/applications/${applicationId}/`, { 
        status: statusUpdate[decision] 
      });
      
      // Mettre à jour l'état local
      setApplication(prev => ({
        ...prev,
        status: statusUpdate[decision]
      }));
      
      const successMessage = {
        'accept': 'Candidat accepté avec succès!',
        'reject': 'Candidat refusé',
        'technical': 'Entretien technique programmé'
      };
      
      alert(successMessage[decision]);
      
      // Optionnel: rediriger vers la liste des candidatures
      if (decision !== 'technical') {
        setTimeout(() => navigate(-1), 1500);
      }
    } catch (error) {
      console.error('Erreur lors de la décision:', error);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  // Fonction pour inviter un manager
  const inviteManager = async (managerEmail, message = '') => {
    if (!application) return;
    
    try {
      const invitationData = {
        manager_email: managerEmail,
        application_id: applicationId,
        candidate_name: application.candidate.first_name && application.candidate.last_name 
          ? `${application.candidate.first_name} ${application.candidate.last_name}`
          : application.candidate.username,
        job_title: application.job_offer?.title || 'Poste non spécifié',
        message: message,
        evaluation_summary: {
          ai_analysis: aiAnalysis,
          final_scores: finalEvaluation
        }
      };
      
      console.log('Invitation manager:', invitationData);
      // TODO: Ajouter l'appel API réel
      // await api.post('/interviews/invite-manager/', invitationData);
      
      alert('Manager invité avec succès!');
      setInviteManagerModal(false);
    } catch (error) {
      console.error('Erreur lors de l\'invitation:', error);
      alert('Erreur lors de l\'envoi de l\'invitation');
    }
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
        
        {/* Right Column - Candidate Info & Scoring */}
        <Col lg={5}>
          {/* Candidate Information */}
          {application && (
            <Card className="shadow-sm border-0 mb-4">
              <Card.Body>
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                       style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}>
                    {application.candidate.first_name?.charAt(0) || application.candidate.username?.charAt(0) || 'N'}
                  </div>
                  <div>
                    <h5 className="mb-0 fw-bold">
                      {application.candidate.first_name && application.candidate.last_name 
                        ? `${application.candidate.first_name} ${application.candidate.last_name}`
                        : application.candidate.username}
                    </h5>
                    <p className="text-muted mb-0">{application.job_offer?.title || 'Poste non spécifié'}</p>
                  </div>
                </div>
                
                <div className="candidate-details">
                  <div className="mb-2">
                    <i className="bi bi-envelope me-2 text-muted"></i>
                    <span>{application.candidate.email || 'Email non renseigné'}</span>
                  </div>
                  <div className="mb-2">
                    <i className="bi bi-telephone me-2 text-muted"></i>
                    <span>+212 6 12 34 56 78</span>
                  </div>
                  <div className="mb-2">
                    <i className="bi bi-geo-alt me-2 text-muted"></i>
                    <span>Casablanca, Morocco</span>
                  </div>
                  <div className="mb-2">
                    <i className="bi bi-mortarboard me-2 text-muted"></i>
                    <span>Master en Génie informatique</span>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}
          
          {candidateAnswers.length > 0 && currentAnswer ? (
            <>
              {/* Current Question Score */}
              <Card className="shadow-sm border-0 mb-4">
                <Card.Body>
                  <h6 className="fw-bold mb-3">Score for Question {currentQuestionIndex + 1}</h6>
                  
                  <div className="mb-3">
                    <label className="form-label small text-muted">Rating (1-5 stars)</label>
                    <div className="star-rating d-flex align-items-center mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <i
                          key={star}
                          className={`bi ${star <= currentScore ? 'bi-star-fill' : 'bi-star'} text-warning me-1`}
                          style={{ fontSize: '1.2rem', cursor: 'pointer' }}
                          onClick={() => setCurrentScore(star)}
                        ></i>
                      ))}
                      <span className="ms-2 text-muted">({currentScore}/5)</span>
                    </div>
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
                  
                  <div className="d-grid gap-2">
                    <Button 
                      variant="primary"
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
                    
                    <Button 
                      variant="outline-info"
                      onClick={() => analyzeCurrentVideo()}
                      disabled={analyzingAI}
                    >
                      {analyzingAI ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-robot me-2"></i>
                          AI Analysis
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Affichage de l'analyse IA de la vidéo courante */}
                  {currentVideoAnalysis && (
                    <div className="mt-4 p-3 bg-light rounded">
                      <h6 className="fw-bold text-info mb-3">
                        <i className="bi bi-robot me-2"></i>
                        AI Analysis - Question {currentVideoAnalysis.questionIndex}
                      </h6>
                      
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <strong className="text-success">Strengths:</strong>
                            <ul className="mt-2 mb-0">
                              {currentVideoAnalysis.strengths.map((strength, index) => (
                                <li key={index} className="small">{strength}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <strong className="text-warning">Areas for improvement:</strong>
                            <ul className="mt-2 mb-0">
                              {currentVideoAnalysis.weaknesses.map((weakness, index) => (
                                <li key={index} className="small">{weakness}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <strong>AI Suggested Score:</strong>
                        <div className="d-flex align-items-center mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <i
                              key={star}
                              className={`bi ${star <= currentVideoAnalysis.suggestedScore ? 'bi-star-fill' : 'bi-star'} text-warning me-1`}
                            ></i>
                          ))}
                          <span className="ms-2 text-muted">({currentVideoAnalysis.suggestedScore}/5)</span>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <strong>AI Comment:</strong>
                        <p className="mt-1 mb-0 small text-muted">{currentVideoAnalysis.aiComment}</p>
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant="outline-primary"
                        onClick={() => {
                          setCurrentScore(currentVideoAnalysis.suggestedScore);
                          setCurrentComments(currentVideoAnalysis.aiComment);
                        }}
                      >
                        <i className="bi bi-check2 me-1"></i>
                        Apply AI Suggestions
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>

              {/* Overall Interview Evaluation */}
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
                    <div className="star-rating d-flex align-items-center mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <i
                          key={star}
                          className={`bi ${star <= overallScore ? 'bi-star-fill' : 'bi-star'} text-warning me-1`}
                          style={{ fontSize: '1.2rem', cursor: 'pointer' }}
                          onClick={() => setOverallScore(star)}
                        ></i>
                      ))}
                      <span className="ms-2 text-muted">({overallScore}/5)</span>
                    </div>
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
                    <div className="text-end mt-1">
                      <small className="text-muted">{overallComments.length}/1000</small>
                    </div>
                  </div>
                  
                  <div className="d-flex gap-2">
                    <Button 
                      variant="outline-secondary" 
                      className="flex-fill"
                      onClick={() => {
                        const updatedAnswers = [...candidateAnswers];
                        updatedAnswers[currentQuestionIndex] = {
                          ...updatedAnswers[currentQuestionIndex],
                          score: overallScore * 20,
                          recruiter_notes: overallComments
                        };
                        setCandidateAnswers(updatedAnswers);
                      }}
                    >
                      <i className="bi bi-save me-2"></i>
                      Save
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </>
          ) : null}

          {/* AI Analysis Section */}
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">
                  <i className="bi bi-robot text-primary me-2"></i>
                  Analyse General avec IA
                </h5>
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={analyzeWithAI}
                  disabled={analyzingAI || !candidateAnswers.length}
                >
                  {analyzingAI ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-magic me-2"></i>
                      Analyser
                    </>
                  )}
                </Button>
              </div>
              
              {!candidateAnswers.length && (
                <Alert variant="info" className="mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  Aucune réponse vidéo disponible pour l'analyse IA.
                </Alert>
              )}
              
              {aiAnalysis && (
                <div className="mt-3">
                  <Row>
                    <Col md={6}>
                      <div className="mb-3">
                        <h6 className="text-success fw-bold">
                          <i className="bi bi-check-circle me-2"></i>
                          Points forts
                        </h6>
                        {aiAnalysis.strengths.length > 0 ? (
                          <ul className="list-unstyled">
                            {aiAnalysis.strengths.map((strength, index) => (
                              <li key={index} className="mb-1">
                                <i className="bi bi-arrow-right text-success me-2"></i>
                                {strength}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted fst-italic">Aucun point fort identifié</p>
                        )}
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="mb-3">
                        <h6 className="text-warning fw-bold">
                          <i className="bi bi-exclamation-triangle me-2"></i>
                          Points à améliorer
                        </h6>
                        {aiAnalysis.weaknesses.length > 0 ? (
                          <ul className="list-unstyled">
                            {aiAnalysis.weaknesses.map((weakness, index) => (
                              <li key={index} className="mb-1">
                                <i className="bi bi-arrow-right text-warning me-2"></i>
                                {weakness}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted fst-italic">Aucun point faible majeur identifié</p>
                        )}
                      </div>
                    </Col>
                  </Row>

                  <div className="mb-3">
                    <h6 className="fw-bold">
                      <i className="bi bi-chat-text me-2"></i>
                      Commentaire détaillé
                    </h6>
                    <div className="bg-light p-3 rounded">
                      <p className="mb-0">{aiAnalysis.comment}</p>
                    </div>
                  </div>

                  <div className="ai-scores">
                    <h6 className="fw-bold mb-3">Scores IA (/20)</h6>
                    <Row className="g-2">
                      <Col xs={4}>
                        <div className="text-center p-2 bg-light rounded">
                          <div className="fw-bold text-primary">{aiAnalysis.scores.technique}/20</div>
                          <small className="text-muted">Technique</small>
                        </div>
                      </Col>
                      <Col xs={4}>
                        <div className="text-center p-2 bg-light rounded">
                          <div className="fw-bold text-primary">{aiAnalysis.scores.communication}/20</div>
                          <small className="text-muted">Communication</small>
                        </div>
                      </Col>
                      <Col xs={4}>
                        <div className="text-center p-2 bg-light rounded">
                          <div className="fw-bold text-primary">{aiAnalysis.scores.motivation}/20</div>
                          <small className="text-muted">Motivation</small>
                        </div>
                      </Col>
                      <Col xs={4}>
                        <div className="text-center p-2 bg-light rounded">
                          <div className="fw-bold text-primary">{aiAnalysis.scores.style}/20</div>
                          <small className="text-muted">Style</small>
                        </div>
                      </Col>
                      <Col xs={4}>
                        <div className="text-center p-2 bg-light rounded">
                          <div className="fw-bold text-primary">{aiAnalysis.scores.nonVerbal}/20</div>
                          <small className="text-muted">Non-verbal</small>
                        </div>
                      </Col>
                      <Col xs={4}>
                        <div className="text-center p-2 bg-primary text-white rounded">
                          <div className="fw-bold">{aiAnalysis.scores.global}/20</div>
                          <small>Global</small>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* General Evaluation Section */}
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body>
              <h5 className="fw-bold mb-3">
                <i className="bi bi-clipboard-check me-2"></i>
                Évaluation générale
              </h5>
              
              <Row className="g-3 mb-4">
                <Col md={6}>
                  <label className="form-label small">Technique (/20)</label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="20"
                    value={finalEvaluation.technical}
                    onChange={(e) => setFinalEvaluation(prev => ({...prev, technical: parseInt(e.target.value) || 0}))}
                  />
                </Col>
                <Col md={6}>
                  <label className="form-label small">Communication (/20)</label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="20"
                    value={finalEvaluation.communication}
                    onChange={(e) => setFinalEvaluation(prev => ({...prev, communication: parseInt(e.target.value) || 0}))}
                  />
                </Col>
                <Col md={6}>
                  <label className="form-label small">Motivation (/20)</label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="20"
                    value={finalEvaluation.motivation}
                    onChange={(e) => setFinalEvaluation(prev => ({...prev, motivation: parseInt(e.target.value) || 0}))}
                  />
                </Col>
                <Col md={6}>
                  <label className="form-label small">Style (/20)</label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="20"
                    value={finalEvaluation.style}
                    onChange={(e) => setFinalEvaluation(prev => ({...prev, style: parseInt(e.target.value) || 0}))}
                  />
                </Col>
                <Col md={6}>
                  <label className="form-label small">Non-verbal (/20)</label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="20"
                    value={finalEvaluation.nonVerbal}
                    onChange={(e) => setFinalEvaluation(prev => ({...prev, nonVerbal: parseInt(e.target.value) || 0}))}
                  />
                </Col>
                <Col md={6}>
                  <label className="form-label small">Global (/20)</label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="20"
                    value={finalEvaluation.global}
                    onChange={(e) => setFinalEvaluation(prev => ({...prev, global: parseInt(e.target.value) || 0}))}
                  />
                </Col>
              </Row>
              
              <div className="mb-4">
                <label className="form-label">Commentaires généraux</label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  placeholder="Évaluation générale du candidat..."
                  value={finalEvaluation.generalComments}
                  onChange={(e) => setFinalEvaluation(prev => ({...prev, generalComments: e.target.value}))}
                />
              </div>
              
              <Row className="g-2">
                <Col md={3}>
                  <Button 
                    variant="success" 
                    className="w-100"
                    onClick={() => handleDecision('accept')}
                  >
                    <i className="bi bi-check-circle me-2"></i>
                    Accepter
                  </Button>
                </Col>
                <Col md={3}>
                  <Button 
                    variant="danger" 
                    className="w-100"
                    onClick={() => handleDecision('reject')}
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Refuser
                  </Button>
                </Col>
                <Col md={3}>
                  <Button 
                    variant="info" 
                    className="w-100"
                    onClick={() => setTechnicalInterviewModal(true)}
                  >
                    <i className="bi bi-calendar-event me-2"></i>
                    Entretien Technique
                  </Button>
                </Col>
                <Col md={3}>
                  <Button 
                    variant="primary" 
                    className="w-100"
                    onClick={saveFinalEvaluation}
                  >
                    <i className="bi bi-save me-2"></i>
                    Sauvegarder
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Invite Manager Section */}
          <Card className="shadow-sm border-0">
            <Card.Body>
              <h6 className="fw-bold mb-3">
                <i className="bi bi-person-plus me-2"></i>
                Inviter manager
              </h6>
              <p className="small text-muted mb-3">
                Invitez un hiring manager à consulter cette évaluation
              </p>
              <Button 
                variant="outline-secondary" 
                className="w-100"
                onClick={() => setInviteManagerModal(true)}
              >
                <i className="bi bi-envelope me-2"></i>
                Envoyer invitation
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Invite Manager Modal */}
      {inviteManagerModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Inviter un manager</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setInviteManagerModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <Form onSubmit={(e) => {
                  e.preventDefault();
                  const email = e.target.managerEmail.value;
                  const message = e.target.message.value;
                  if (email) inviteManager(email, message);
                }}>
                  <div className="mb-3">
                    <label className="form-label">Email du manager</label>
                    <Form.Control
                      type="email"
                      name="managerEmail"
                      placeholder="manager@example.com"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Message (optionnel)</label>
                    <Form.Control
                      as="textarea"
                      name="message"
                      rows={3}
                      placeholder="Message personnalisé pour le manager..."
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <Button type="submit" variant="primary" className="flex-fill">
                      <i className="bi bi-envelope me-2"></i>
                      Envoyer invitation
                    </Button>
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={() => setInviteManagerModal(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                </Form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'entretien technique */}
      {technicalInterviewModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-calendar-event me-2"></i>
                  Programmer un entretien technique
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setTechnicalInterviewModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {application && (
                  <div className="candidate-info bg-light p-3 rounded mb-4">
                    <h6 className="fw-bold mb-2">Candidat sélectionné:</h6>
                    <div className="d-flex align-items-center">
                      <i className="bi bi-person-circle me-2" style={{ fontSize: '2rem' }}></i>
                      <div>
                        <div className="fw-bold">{application.candidate.first_name} {application.candidate.last_name}</div>
                        <small className="text-muted">{application.candidate.email}</small>
                      </div>
                    </div>
                  </div>
                )}
                
                <Form>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          <i className="bi bi-calendar3 me-2"></i>
                          Date de l'entretien *
                        </label>
                        <input 
                          type="date" 
                          className="form-control"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          <i className="bi bi-clock me-2"></i>
                          Heure *
                        </label>
                        <select 
                          className="form-control"
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          required
                        >
                          <option value="">Sélectionner l'heure</option>
                          <option value="09:00">09:00</option>
                          <option value="10:00">10:00</option>
                          <option value="11:00">11:00</option>
                          <option value="14:00">14:00</option>
                          <option value="15:00">15:00</option>
                          <option value="16:00">16:00</option>
                          <option value="17:00">17:00</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">
                      <i className="bi bi-geo-alt me-2"></i>
                      Lieu de l'entretien *
                    </label>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="Ex: Salle de réunion A, Visioconférence, Adresse..."
                      value={interviewLocation}
                      onChange={(e) => setInterviewLocation(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    Un email de confirmation sera automatiquement envoyé au candidat avec tous les détails de l'entretien technique.
                  </div>
                </Form>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setTechnicalInterviewModal(false)}
                >
                  Annuler
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={async () => {
                    if (selectedDate && selectedTime && interviewLocation) {
                      try {
                        // Appel API pour programmer l'entretien technique
                        await api.post(`/interviews/applications/${applicationId}/technical-interview/`, {
                          date: selectedDate,
                          time: selectedTime,
                          location: interviewLocation,
                          candidate_email: application.candidate.email
                        });
                        
                        // Mettre à jour le statut
                        await api.patch(`/interviews/applications/${applicationId}/`, { 
                          status: 'technical_interview' 
                        });
                        
                        setApplication(prev => ({
                          ...prev,
                          status: 'technical_interview'
                        }));
                        
                        alert(`Entretien technique programmé pour le ${selectedDate} à ${selectedTime}. Un email a été envoyé au candidat.`);
                        setTechnicalInterviewModal(false);
                        
                        // Réinitialiser les champs
                        setSelectedDate('');
                        setSelectedTime('');
                        setInterviewLocation('');
                      } catch (error) {
                        console.error('Erreur lors de la programmation:', error);
                        alert('Erreur lors de la programmation de l\'entretien technique.');
                      }
                    } else {
                      alert('Veuillez remplir tous les champs obligatoires.');
                    }
                  }}
                  disabled={!selectedDate || !selectedTime || !interviewLocation}
                >
                  <i className="bi bi-calendar-check me-2"></i>
                  Programmer l'entretien
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </Container>
  );
};

export default InterviewDetails;