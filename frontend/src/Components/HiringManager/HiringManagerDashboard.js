import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Alert, Modal, Button, Spinner } from 'react-bootstrap';
import axios from 'axios';

const HiringManagerDashboard = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [selectedCandidateForModal, setSelectedCandidateForModal] = useState(null);
  
  const videoRef = useRef(null);

  useEffect(() => {
    fetchCampaignData();
  }, [token]);

  // Get current candidate and answer for the video player
  const currentCandidate = data?.candidates?.[currentCandidateIndex];
  const currentAnswer = currentCandidate?.answers?.[currentQuestionIndex];

  // Debug: Log current candidate data
  useEffect(() => {
    if (currentCandidate) {
      console.log('Current candidate data:', currentCandidate);
      console.log('Global evaluation:', currentCandidate.global_evaluation);
    }
  }, [currentCandidate]);

  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      console.log('Token reçu:', token);
      console.log('URL appelée:', `http://localhost:8000/api/interviews/hiring-manager/${token}/`);
      
      const response = await axios.get(`http://localhost:8000/api/interviews/hiring-manager/${token}/`);
      console.log('Réponse reçue:', response.data);
      setData(response.data);
      setError(null);
    } catch (err) {
      console.error('Erreur complète:', err);
      console.error('Réponse d\'erreur:', err.response?.data);
      console.error('Status d\'erreur:', err.response?.status);
      
      if (err.response?.status === 403) {
        setError(err.response?.data?.detail || 'Lien d\'accès expiré ou invalide. Contactez le recruteur pour un nouveau lien.');
      } else {
        setError(err.response?.data?.detail || 'Erreur lors du chargement des données. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleShowCandidateDetails = (candidate) => {
    setSelectedCandidateForModal(candidate);
    setShowCandidateModal(true);
  };

  const handleCloseCandidateModal = () => {
    setShowCandidateModal(false);
    setSelectedCandidateForModal(null);
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
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert variant="warning">
        <Alert.Heading>Données introuvables</Alert.Heading>
        <p>Impossible de charger les données de la campagne.</p>
      </Alert>
    );
  }

  return (
    <div className="position-relative">
      <Container fluid className="py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        {/* Header */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h2 className="fw-bold mb-1" style={{ color: '#2c3e50' }}>Hiring Manager Dashboard</h2>
              <p className="text-muted mb-0">
                Campaign: <span className="fw-medium">{data?.campaign?.title || data?.campaign?.job_offer?.title}</span> • Q4 2024
              </p>
            </div>
          </div>
        </div>

        {/* Global Evaluation Display */}
        {(currentCandidate?.global_evaluation || (currentCandidate && process.env.NODE_ENV === 'development')) && (() => {
          // Use real data if available, otherwise use test data for development
          const evaluation = currentCandidate?.global_evaluation || {
            technical_skills: 85,
            communication_skills: 78,
            problem_solving: 92,
            cultural_fit: 88,
            motivation: 95,
            overall_score: 87,
            final_recommendation: 'hire_immediately',
            recruiter_name: 'Test Recruiter',
            updated_at: new Date().toISOString(),
            strengths: 'Excellent technical skills and problem-solving abilities.',
            weaknesses: 'Could improve communication clarity.',
            general_comments: 'Strong candidate with great potential.',
            next_steps: 'Proceed with final interview round.'
          };
          
          console.log('Evaluation object:', evaluation);
          console.log('Technical skills:', evaluation.technical_skills);
          console.log('Communication skills:', evaluation.communication_skills);
          
          return (
            <Card className="shadow-sm border-0 mb-4" style={{background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'}}>
              <Card.Body className="text-white">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-award me-2"></i>
                    <h5 className="mb-0 fw-bold">Global Interview Evaluation</h5>
                    {!currentCandidate?.global_evaluation && (
                      <Badge bg="warning" text="dark" className="ms-2">TEST DATA</Badge>
                    )}
                  </div>
                  <div className="d-flex align-items-center">
                    <Badge bg="light" text="dark" className="me-2">
                      Overall Score: {Math.round(evaluation.overall_score || 0)}/100
                    </Badge>
                    {evaluation.final_recommendation && (
                      <Badge 
                        bg={evaluation.final_recommendation === 'hire_immediately' ? 'success' : 
                            evaluation.final_recommendation === 'second_interview' ? 'primary' :
                            evaluation.final_recommendation === 'consider' ? 'warning' : 'danger'}
                        className="px-3 py-2"
                      >
                        {evaluation.final_recommendation.replace('_', ' ').toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <p className="mb-0 opacity-75">
                  Comprehensive evaluation by {evaluation.recruiter_name} • 
                  {new Date(evaluation.updated_at).toLocaleDateString('fr-FR')}
                </p>
              
              <div className="mt-3 pt-3 border-top border-light border-opacity-25">
                <Row className="g-3">
                  <Col xs={2} className="text-center">
                    <div className="bg-white rounded p-3 shadow-sm">
                      <div className="fw-bold fs-4 text-primary">
                        {Math.round(evaluation.technical_skills || 0)}
                      </div>
                      <small className="text-muted fw-medium">Technical Skills</small>
                    </div>
                  </Col>
                  <Col xs={2} className="text-center">
                    <div className="bg-white rounded p-3 shadow-sm">
                      <div className="fw-bold fs-4 text-info">
                        {Math.round(evaluation.communication_skills || 0)}
                      </div>
                      <small className="text-muted fw-medium">Communication</small>
                    </div>
                  </Col>
                  <Col xs={2} className="text-center">
                    <div className="bg-white rounded p-3 shadow-sm">
                      <div className="fw-bold fs-4 text-success">
                        {Math.round(evaluation.problem_solving || 0)}
                      </div>
                      <small className="text-muted fw-medium">Problem Solving</small>
                    </div>
                  </Col>
                  <Col xs={2} className="text-center">
                    <div className="bg-white rounded p-3 shadow-sm">
                      <div className="fw-bold fs-4 text-warning">
                        {Math.round(evaluation.cultural_fit || 0)}
                      </div>
                      <small className="text-muted fw-medium">Cultural Fit</small>
                    </div>
                  </Col>
                  <Col xs={2} className="text-center">
                    <div className="bg-white rounded p-3 shadow-sm">
                      <div className="fw-bold fs-4" style={{ color: '#6f42c1' }}>
                        {Math.round(evaluation.motivation || 0)}
                      </div>
                      <small className="text-muted fw-medium">Motivation</small>
                    </div>
                  </Col>
                  <Col xs={2} className="text-center">
                    <div className="bg-white rounded p-3 shadow-sm">
                      <div className="fw-bold fs-4 text-dark">
                        {Math.round(evaluation.overall_score || 0)}
                      </div>
                      <small className="text-muted fw-medium">Overall</small>
                    </div>
                  </Col>
                </Row>
                
                {/* Comments Section */}
                {(evaluation.strengths || evaluation.weaknesses || evaluation.general_comments) && (
                  <div className="mt-3 pt-3 border-top border-light border-opacity-25">
                    <Row className="g-3">
                      {evaluation.strengths && (
                        <Col md={4}>
                          <div className="bg-white bg-opacity-10 rounded p-3">
                            <h6 className="text-white mb-2">
                              <i className="bi bi-check-circle me-2"></i>
                              Strengths
                            </h6>
                            <p className="mb-0 small">{evaluation.strengths}</p>
                          </div>
                        </Col>
                      )}
                      {evaluation.weaknesses && (
                        <Col md={4}>
                          <div className="bg-white bg-opacity-10 rounded p-3">
                            <h6 className="text-white mb-2">
                              <i className="bi bi-exclamation-triangle me-2"></i>
                              Areas for Improvement
                            </h6>
                            <p className="mb-0 small">{evaluation.weaknesses}</p>
                          </div>
                        </Col>
                      )}
                      {evaluation.general_comments && (
                        <Col md={4}>
                          <div className="bg-white bg-opacity-10 rounded p-3">
                            <h6 className="text-white mb-2">
                              <i className="bi bi-chat-text me-2"></i>
                              General Comments
                            </h6>
                            <p className="mb-0 small">{evaluation.general_comments}</p>
                          </div>
                        </Col>
                      )}
                    </Row>
                  </div>
                )}
                
                {/* Next Steps */}
                {evaluation.next_steps && (
                  <div className="mt-3 pt-3 border-top border-light border-opacity-25">
                    <h6 className="text-white mb-2">
                      <i className="bi bi-arrow-right-circle me-2"></i>
                      Next Steps
                    </h6>
                    <div className="bg-white bg-opacity-10 rounded p-3">
                      <p className="mb-0">{evaluation.next_steps}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
          );
        })()}

        <Row className="g-4">
          {/* Left Column - Video Player */}
          <Col lg={7}>
            <Card className="shadow-sm border-0 mb-4">
              <Card.Body className="p-0">
                <div className="p-4 pb-3">
                  <h5 className="fw-bold mb-1">
                    {currentCandidate ? 
                      `Playing Video for ${currentCandidate.candidate.first_name} ${currentCandidate.candidate.last_name} - Question ${currentQuestionIndex + 1}` :
                      'Select a candidate to view videos'
                    }
                  </h5>
                </div>
                
                {currentAnswer ? (
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
                        key={`video-${currentCandidateIndex}-${currentQuestionIndex}-${currentAnswer.id}`}
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
            
            {/* Questions for Current Candidate */}
            {currentCandidate && (
              <Card className="shadow-sm border-0 mb-4">
                <Card.Body>
                  <h6 className="fw-bold mb-3">
                    Questions for {currentCandidate.candidate.first_name} {currentCandidate.candidate.last_name}
                  </h6>
                  {currentCandidate.answers.map((answer, index) => (
                    <Card 
                      key={answer.id} 
                      className={`mb-3 cursor-pointer ${index === currentQuestionIndex ? 'border-primary' : 'border-light'}`}
                      onClick={() => setCurrentQuestionIndex(index)}
                      style={{ cursor: 'pointer' }}
                    >
                      <Card.Body className="p-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h6 className="text-primary mb-1">Question {index + 1}</h6>
                          <div className="d-flex align-items-center">
                            <Badge bg="secondary" className="me-2">
                              {answer.question.question_type}
                            </Badge>
                            <small className="text-muted">
                              <i className="bi bi-clock me-1"></i>
                              {answer.duration ? `${Math.floor(answer.duration / 60)}:${(answer.duration % 60).toString().padStart(2, '0')}` : '0:00'}
                            </small>
                          </div>
                        </div>
                        <p className="mb-0 text-muted small">
                          {answer.question.text}
                        </p>
                      </Card.Body>
                    </Card>
                  ))}
                </Card.Body>
              </Card>
            )}
          </Col>
          
          {/* Right Column - Candidates List & Evaluations */}
          <Col lg={5}>
            {/* Candidates Selector */}
            <Card className="shadow-sm border-0 mb-4">
              <Card.Body>
                <h6 className="fw-bold mb-3">Candidates ({data?.candidates?.length || 0})</h6>
                {data?.candidates?.map((candidate, index) => (
                  <Card 
                    key={candidate.candidate.id} 
                    className={`mb-3 cursor-pointer ${index === currentCandidateIndex ? 'border-primary' : 'border-light'}`}
                    onClick={() => {
                      setCurrentCandidateIndex(index);
                      setCurrentQuestionIndex(0);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <Card.Body className="py-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                               style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                            {candidate.candidate.first_name?.charAt(0) || candidate.candidate.username?.charAt(0) || 'N'}
                          </div>
                          <div>
                            <h6 className="mb-0 fw-bold">
                              {candidate.candidate.first_name && candidate.candidate.last_name 
                                ? `${candidate.candidate.first_name} ${candidate.candidate.last_name}`
                                : candidate.candidate.username}
                            </h6>
                            <small className="text-muted">{candidate.candidate.email}</small>
                          </div>
                        </div>
                        <div className="d-flex align-items-center">
                          <Badge bg="info" className="me-2">
                            {candidate.answers.length} videos
                          </Badge>
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowCandidateDetails(candidate);
                            }}
                          >
                            <i className="bi bi-person-lines-fill me-1"></i>
                            Détails
                          </Button>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </Card.Body>
            </Card>



            {/* Enhanced AI Evaluation Display */}
            {currentAnswer?.ai_evaluation && (
              <Card className="shadow-sm border-0 mb-4" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                <Card.Body className="text-white">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-robot me-2"></i>
                      <h6 className="mb-0 fw-bold">AI Analysis Results</h6>
                    </div>
                    {currentAnswer.ai_evaluation.confidence_score && (
                      <Badge bg="light" text="dark">
                        Confidence: {Math.round((currentAnswer.ai_evaluation.confidence_score || 0) * 100)}%
                      </Badge>
                    )}
                  </div>
                  <p className="mb-0 opacity-75">Intelligent evaluation powered by AI</p>
                  
                  <div className="mt-3 pt-3 border-top border-light border-opacity-25">
                    <Row className="g-3">
                      <Col xs={3} className="text-center">
                        <div className="text-white-50 small mb-1">Communication</div>
                        <div className="fw-bold fs-5">{Math.round((currentAnswer.ai_evaluation.communication_score || 0) * 10)}/100</div>
                      </Col>
                      <Col xs={3} className="text-center">
                        <div className="text-white-50 small mb-1">Relevance</div>
                        <div className="fw-bold fs-5">{Math.round((currentAnswer.ai_evaluation.relevance_score || 0) * 10)}/100</div>
                      </Col>
                      <Col xs={3} className="text-center">
                        <div className="text-white-50 small mb-1">Confidence</div>
                        <div className="fw-bold fs-5">{Math.round((currentAnswer.ai_evaluation.confidence_score || 0) * 10)}/100</div>
                      </Col>
                      <Col xs={3} className="text-center">
                        <div className="text-white-50 small mb-1">Overall</div>
                        <div className="fw-bold fs-5">{Math.round((currentAnswer.ai_evaluation.overall_ai_score || 0) * 10)}/100</div>
                      </Col>
                    </Row>
                    
                    {/* AI Feedback */}
                    {currentAnswer.ai_evaluation.ai_feedback && (
                      <div className="mt-3 pt-3 border-top border-light border-opacity-25">
                        <h6 className="text-white mb-2">
                          <i className="bi bi-chat-square-text me-2"></i>
                          Detailed Analysis
                        </h6>
                        <div className="bg-white bg-opacity-10 rounded p-3">
                          <pre className="text-white-75 mb-0" style={{ 
                            whiteSpace: 'pre-wrap', 
                            fontFamily: 'inherit',
                            fontSize: '0.9rem',
                            lineHeight: '1.5'
                          }}>
                            {currentAnswer.ai_evaluation.ai_feedback}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {/* Recommendations */}
                    {currentAnswer.ai_evaluation.recommendations && (
                      <div className="mt-3 pt-3 border-top border-light border-opacity-25">
                        <h6 className="text-white mb-2">
                          <i className="bi bi-lightbulb me-2"></i>
                          AI Recommendations
                        </h6>
                        <div className="bg-white bg-opacity-10 rounded p-3">
                          <p className="text-white mb-0" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                            {currentAnswer.ai_evaluation.recommendations}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Strengths and Weaknesses */}
                    {(currentAnswer.ai_evaluation.strengths || currentAnswer.ai_evaluation.weaknesses) && (
                      <div className="mt-3">
                        <Row className="g-3">
                          {currentAnswer.ai_evaluation.strengths && (
                            <Col md={6}>
                              <div className="border border-2 border-success rounded p-3" style={{ 
                                backgroundColor: 'rgba(25, 135, 84, 0.8)',
                                boxShadow: '0 2px 8px rgba(25, 135, 84, 0.4)'
                              }}>
                                <h6 className="text-white mb-2 fw-bold" style={{ fontSize: '1rem' }}>
                                  <i className="bi bi-check-circle-fill me-2"></i>
                                  ✅ Strengths
                                </h6>
                                <p className="text-white mb-0" style={{ 
                                  fontSize: '0.95rem',
                                  lineHeight: '1.4',
                                  fontWeight: '500'
                                }}>{currentAnswer.ai_evaluation.strengths}</p>
                              </div>
                            </Col>
                          )}
                          {currentAnswer.ai_evaluation.weaknesses && (
                            <Col md={6}>
                              <div className="border border-2 border-danger rounded p-3" style={{ 
                                backgroundColor: 'rgba(220, 53, 69, 0.8)',
                                boxShadow: '0 2px 8px rgba(220, 53, 69, 0.4)'
                              }}>
                                <h6 className="text-white mb-2 fw-bold" style={{ fontSize: '1rem' }}>
                                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                  ⚠️ Areas for Improvement
                                </h6>
                                <p className="text-white mb-0" style={{ 
                                  fontSize: '0.95rem',
                                  lineHeight: '1.4',
                                  fontWeight: '500'
                                }}>{currentAnswer.ai_evaluation.weaknesses}</p>
                              </div>
                            </Col>
                          )}
                        </Row>
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Enhanced Recruiter Evaluations Display */}
            {currentAnswer?.recruiter_evaluations?.length > 0 && (
              <Card className="shadow-sm border-0 mb-4">
                <Card.Header className="bg-primary text-white">
                  <h6 className="mb-0 fw-bold">
                    <i className="bi bi-person-check me-2"></i>
                    Recruiter Evaluations ({currentAnswer.recruiter_evaluations.length})
                  </h6>
                </Card.Header>
                <Card.Body className="p-0">
                  {currentAnswer.recruiter_evaluations.map((evaluation, index) => (
                    <div key={evaluation.id} className={`p-4 ${index < currentAnswer.recruiter_evaluations.length - 1 ? 'border-bottom' : ''}`}>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="d-flex align-items-center">
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                               style={{ width: '35px', height: '35px', fontSize: '1rem' }}>
                            <i className="bi bi-person"></i>
                          </div>
                          <div>
                            <h6 className="mb-0 fw-bold">{evaluation.recruiter_name}</h6>
                            <small className="text-muted">
                              {evaluation.created_at ? new Date(evaluation.created_at).toLocaleDateString('fr-FR') : 'Date inconnue'}
                            </small>
                          </div>
                        </div>
                      </div>
                      
                      {/* Detailed Scores */}
                      <Row className="g-3 mb-3">
                        <Col xs={4}>
                          <div className="text-center p-3 bg-light rounded">
                            <div className="fw-bold text-primary fs-5">{evaluation.communication_score || 'N/A'}</div>
                            <small className="text-muted">Communication</small>
                          </div>
                        </Col>
                        <Col xs={4}>
                          <div className="text-center p-3 bg-light rounded">
                            <div className="fw-bold text-info fs-5">{evaluation.relevance_score || 'N/A'}</div>
                            <small className="text-muted">Relevance</small>
                          </div>
                        </Col>
                        <Col xs={4}>
                          <div className="text-center p-3 bg-light rounded">
                            <div className="fw-bold text-success fs-5">{evaluation.confidence_score || 'N/A'}</div>
                            <small className="text-muted">Confidence</small>
                          </div>
                        </Col>
                      </Row>
                      
                      {/* Individual Feedback Sections */}
                      {(evaluation.communication_feedback || evaluation.relevance_feedback || evaluation.confidence_feedback) && (
                        <div className="mb-3">
                          <h6 className="text-muted mb-2">
                            <i className="bi bi-chat-dots me-2"></i>
                            Detailed Feedback
                          </h6>
                          <Row className="g-3">
                            {evaluation.communication_feedback && (
                              <Col md={4}>
                                <div className="bg-primary bg-opacity-10 p-3 rounded">
                                  <h6 className="text-primary mb-2">
                                    <i className="bi bi-chat-dots me-1"></i>
                                    Communication
                                  </h6>
                                  <p className="mb-0 small">{evaluation.communication_feedback}</p>
                                </div>
                              </Col>
                            )}
                            {evaluation.relevance_feedback && (
                              <Col md={4}>
                                <div className="bg-info bg-opacity-10 p-3 rounded">
                                  <h6 className="text-info mb-2">
                                    <i className="bi bi-bullseye me-1"></i>
                                    Relevance
                                  </h6>
                                  <p className="mb-0 small">{evaluation.relevance_feedback}</p>
                                </div>
                              </Col>
                            )}
                            {evaluation.confidence_feedback && (
                              <Col md={4}>
                                <div className="bg-success bg-opacity-10 p-3 rounded">
                                  <h6 className="text-success mb-2">
                                    <i className="bi bi-shield-check me-1"></i>
                                    Confidence
                                  </h6>
                                  <p className="mb-0 small">{evaluation.confidence_feedback}</p>
                                </div>
                              </Col>
                            )}
                          </Row>
                        </div>
                      )}
                      
                      {/* Overall Feedback */}
                      {evaluation.overall_feedback && (
                        <div className="bg-light p-3 rounded">
                          <h6 className="text-dark mb-2">
                            <i className="bi bi-chat-text me-2"></i>
                            Overall Comments
                          </h6>
                          <p className="mb-0" style={{ lineHeight: '1.5' }}>
                            {evaluation.overall_feedback}
                          </p>
                        </div>
                      )}
                      
                      {/* Recommendation */}
                      {evaluation.recommendation && (
                        <div className="mt-3">
                          <Badge 
                            bg={evaluation.recommendation === 'excellent' ? 'success' : 
                                evaluation.recommendation === 'good' ? 'primary' :
                                evaluation.recommendation === 'average' ? 'warning' : 'danger'}
                            className="px-3 py-2"
                          >
                            <i className="bi bi-star me-1"></i>
                            {evaluation.recommendation.charAt(0).toUpperCase() + evaluation.recommendation.slice(1)} Response
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </Card.Body>
              </Card>
            )}

          </Col>
        </Row>

        {/* Footer */}
        <Row className="mt-4">
          <Col>
            <div className="text-center">
              <small className="text-muted">
                <i className="bi bi-shield-check me-2"></i>
                Secure read-only access | 
                Expires: {new Date(data?.access_info?.expires_at * 1000).toLocaleDateString('en-US')} |
                JobGate - Video Interview Platform
              </small>
            </div>
          </Col>
        </Row>

        {/* Modal des détails du candidat */}
        <Modal show={showCandidateModal} onHide={handleCloseCandidateModal} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="bi bi-person me-2"></i>
              Détails du candidat
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedCandidateForModal && (
              <div>
                {/* Informations personnelles */}
                <div className="mb-4">
                  <h6 className="text-primary mb-3">
                    <i className="bi bi-person me-2"></i>
                    Informations personnelles
                  </h6>
                  <Row className="g-3">
                    <Col md={6}>
                      <div className="mb-3">
                        <strong>Nom complet:</strong>
                        <div className="text-muted">
                          {selectedCandidateForModal.candidate.first_name && selectedCandidateForModal.candidate.last_name 
                            ? `${selectedCandidateForModal.candidate.first_name} ${selectedCandidateForModal.candidate.last_name}`
                            : selectedCandidateForModal.candidate.username || 'Non renseigné'}
                        </div>
                      </div>
                      <div className="mb-3">
                        <strong>Email:</strong>
                        <div className="text-muted">
                          {selectedCandidateForModal.candidate.email || 'Non renseigné'}
                        </div>
                      </div>
                      <div className="mb-3">
                        <strong>Téléphone:</strong>
                        <div className="text-muted">
                          {selectedCandidateForModal.candidate.phone || 'Non renseigné'}
                        </div>
                      </div>
                      <div className="mb-3">
                        <strong>Date de naissance:</strong>
                        <div className="text-muted">
                          {selectedCandidateForModal.candidate.date_of_birth 
                            ? new Date(selectedCandidateForModal.candidate.date_of_birth).toLocaleDateString('fr-FR')
                            : 'Non renseigné'}
                        </div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="mb-3">
                        <strong>Adresse:</strong>
                        <div className="text-muted">
                          {selectedCandidateForModal.candidate.address || 'Non renseignée'}
                          {selectedCandidateForModal.candidate.city && (
                            <div>{selectedCandidateForModal.candidate.city} {selectedCandidateForModal.candidate.postal_code}</div>
                          )}
                          {selectedCandidateForModal.candidate.country && (
                            <div>{selectedCandidateForModal.candidate.country}</div>
                          )}
                        </div>
                      </div>
                      <div className="mb-3">
                        <strong>Niveau d'éducation:</strong>
                        <div className="text-muted">
                          {selectedCandidateForModal.candidate.education_level || 'Non renseigné'}
                        </div>
                      </div>
                      <div className="mb-3">
                        <strong>Années d'expérience:</strong>
                        <div className="text-muted">
                          {selectedCandidateForModal.candidate.years_of_experience || 'Non renseigné'}
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>

                {/* Lettre de motivation */}
                <div className="mb-4">
                  <h6 className="text-primary mb-3">
                    <i className="bi bi-file-text me-2"></i>
                    Lettre de motivation
                  </h6>
                  <div className="mb-3">
                    <strong>Candidature pour: {data?.campaign?.job_offer?.title}</strong>
                    <div className="text-muted small">
                      Candidature envoyée le {new Date().toLocaleDateString('fr-FR')}
                      <Badge bg="warning" className="ms-2">En cours</Badge>
                    </div>
                  </div>
                  <div className="mb-3">
                    <strong>Filière:</strong>
                    <div className="text-muted">
                      {selectedCandidateForModal.candidate.specialization || 'software engineer'}
                    </div>
                  </div>
                  <div className="bg-light p-3 rounded">
                    <div className="text-muted">
                      {selectedCandidateForModal.candidate.bio || 'bonjour'}
                    </div>
                  </div>
                </div>

                {/* Statistiques d'entretien */}
                <div>
                  <h6 className="text-primary mb-3">
                    <i className="bi bi-camera-video me-2"></i>
                    Statistiques d'entretien
                  </h6>
                  <Row className="g-3">
                    <Col md={4}>
                      <div className="text-center p-3 bg-primary bg-opacity-10 rounded">
                        <div className="fw-bold fs-4 text-primary">
                          {selectedCandidateForModal.answers.length}
                        </div>
                        <small className="text-muted">Questions répondues</small>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="text-center p-3 bg-success bg-opacity-10 rounded">
                        <div className="fw-bold fs-4 text-success">
                          {selectedCandidateForModal.answers.filter(a => a.ai_evaluation).length}
                        </div>
                        <small className="text-muted">Évaluations IA</small>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="text-center p-3 bg-info bg-opacity-10 rounded">
                        <div className="fw-bold fs-4 text-info">
                          {selectedCandidateForModal.answers.filter(a => a.recruiter_evaluations?.length > 0).length}
                        </div>
                        <small className="text-muted">Évaluations recruteur</small>
                      </div>
                    </Col>
                  </Row>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseCandidateModal}>
              Fermer
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default HiringManagerDashboard;
