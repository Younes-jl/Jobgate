import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button } from 'react-bootstrap';
import axios from 'axios';
import JobGateLogo from '../Common/JobGateLogo';

const HiringManagerDashboard = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  
  const videoRef = useRef(null);

  useEffect(() => {
    fetchCampaignData();
  }, [token]);

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

  // Get current candidate and answer for the video player
  const currentCandidate = data?.candidates?.[currentCandidateIndex];
  const currentAnswer = currentCandidate?.answers?.[currentQuestionIndex];

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
            
            {/* Campaign Information */}
            <Card className="shadow-sm border-0 mb-4">
              <Card.Body>
                <h6 className="fw-bold mb-3">Campaign Information</h6>
                <div className="mb-2">
                  <i className="bi bi-briefcase me-2 text-muted"></i>
                  <span className="fw-medium">{data?.campaign?.job_offer?.title}</span>
                </div>
                <div className="mb-2">
                  <i className="bi bi-building me-2 text-muted"></i>
                  <span>{data?.campaign?.job_offer?.company}</span>
                </div>
                <div className="mb-2">
                  <i className="bi bi-geo-alt me-2 text-muted"></i>
                  <span>{data?.campaign?.job_offer?.location}</span>
                </div>
                <div className="mb-2">
                  <i className="bi bi-person me-2 text-muted"></i>
                  <span>Recruiter: {data?.recruiter?.name}</span>
                </div>
                <div className="mb-0">
                  <i className="bi bi-people me-2 text-muted"></i>
                  <span>{data?.candidates?.length || 0} candidates</span>
                </div>
              </Card.Body>
            </Card>
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
                        <Badge bg="info" className="ms-2">
                          {candidate.answers.length} videos
                        </Badge>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </Card.Body>
            </Card>

            {/* Questions for Current Candidate */}
            {currentCandidate && (
              <Card className="shadow-sm border-0 mb-4">
                <Card.Body>
                  <h6 className="fw-bold mb-3">Questions for {currentCandidate.candidate.first_name}</h6>
                  {currentCandidate.answers.map((answer, index) => (
                    <Card 
                      key={answer.id} 
                      className={`mb-3 cursor-pointer ${index === currentQuestionIndex ? 'border-primary' : 'border-light'}`}
                      onClick={() => setCurrentQuestionIndex(index)}
                      style={{ cursor: 'pointer' }}
                    >
                      <Card.Body className="py-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <h6 className="text-primary mb-1">Question {answer.question.order}</h6>
                            <p className="mb-0 text-muted small">{answer.question.text}</p>
                            <div className="mt-2">
                              <Badge 
                                bg={answer.question.question_type === 'technique' ? 'warning' : 
                                    answer.question.question_type === 'comportementale' ? 'info' : 'secondary'}
                                className="me-2"
                              >
                                {answer.question.question_type}
                              </Badge>
                              <small className="text-muted">
                                <i className="bi bi-clock me-1"></i>
                                {formatDuration(answer.duration)}
                              </small>
                            </div>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </Card.Body>
              </Card>
            )}

            {/* AI Evaluation Display (Read-only) */}
            {currentAnswer?.ai_evaluation && (
              <Card className="shadow-sm border-0 mb-4" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                <Card.Body className="text-white">
                  <div className="d-flex align-items-center mb-3">
                    <i className="bi bi-robot me-2"></i>
                    <h6 className="mb-0 fw-bold">AI Analysis Results</h6>
                  </div>
                  <p className="mb-0 opacity-75">Intelligent evaluation powered by AI</p>
                  
                  <div className="mt-3 pt-3 border-top border-light border-opacity-25">
                    <Row className="g-3">
                      <Col xs={4} className="text-center">
                        <div className="text-white-50 small mb-1">Communication</div>
                        <div className="fw-bold fs-5">{Math.round(currentAnswer.ai_evaluation.communication_score * 10) || 0}</div>
                      </Col>
                      <Col xs={4} className="text-center">
                        <div className="text-white-50 small mb-1">Relevance</div>
                        <div className="fw-bold fs-5">{Math.round(currentAnswer.ai_evaluation.relevance_score * 10) || 0}</div>
                      </Col>
                      <Col xs={4} className="text-center">
                        <div className="text-white-50 small mb-1">Confidence</div>
                        <div className="fw-bold fs-5">{Math.round(currentAnswer.ai_evaluation.confidence_score * 10) || 0}</div>
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

            {/* Recruiter Evaluations Display (Read-only) */}
            {currentAnswer?.recruiter_evaluations?.length > 0 && (
              <Card className="shadow-sm border-0 mb-4">
                <Card.Body>
                  <h6 className="fw-bold mb-3">
                    <i className="bi bi-person-check me-2"></i>
                    Recruiter Evaluations ({currentAnswer.recruiter_evaluations.length})
                  </h6>
                  
                  {currentAnswer.recruiter_evaluations.map((evaluation) => (
                    <div key={evaluation.id} className="border rounded p-3 mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <small className="text-muted fw-bold">
                          <i className="bi bi-person me-1"></i>
                          {evaluation.recruiter_name}
                        </small>
                        <Badge 
                          bg={getScoreColor(evaluation.overall_score)} 
                          className="px-2 py-1"
                        >
                          {evaluation.overall_score}/100
                        </Badge>
                      </div>
                      
                      <Row className="mb-2">
                        <Col xs={4}>
                          <small>
                            <strong>Communication:</strong> {evaluation.communication_score}/100
                          </small>
                        </Col>
                        <Col xs={4}>
                          <small>
                            <strong>Relevance:</strong> {evaluation.relevance_score}/100
                          </small>
                        </Col>
                        <Col xs={4}>
                          <small>
                            <strong>Confidence:</strong> {evaluation.confidence_score}/100
                          </small>
                        </Col>
                      </Row>
                      
                      {evaluation.overall_feedback && (
                        <div className="bg-light p-2 rounded">
                          <small className="text-muted">
                            <i className="bi bi-chat-text me-1"></i>
                            <strong>Comments:</strong> {evaluation.overall_feedback}
                          </small>
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
      </Container>
    </div>
  );
};

export default HiringManagerDashboard;
                                            <Col xs={4} className="text-center">
                                              <div className="fw-bold text-info">{answer.ai_evaluation.communication_score}</div>
                                              <small className="text-muted">Communication</small>
                                            </Col>
                                            <Col xs={4} className="text-center">
                                              <div className="fw-bold text-warning">{answer.ai_evaluation.relevance_score}</div>
                                              <small className="text-muted">Pertinence</small>
                                            </Col>
                                          </Row>

                                          {/* Points forts et faibles */}
                                          {answer.ai_evaluation.strengths && (
                                            <div className="mb-2">
                                              <small className="text-success fw-bold">
                                                <i className="bi bi-check-circle me-1"></i>
                                                Points forts:
                                              </small>
                                              <br/>
                                              <small className="text-muted">{answer.ai_evaluation.strengths}</small>
                                            </div>
                                          )}
                                          {answer.ai_evaluation.weaknesses && (
                                            <div className="mb-2">
                                              <small className="text-warning fw-bold">
                                                <i className="bi bi-exclamation-triangle me-1"></i>
                                                Points faibles:
                                              </small>
                                              <br/>
                                              <small className="text-muted">{answer.ai_evaluation.weaknesses}</small>
                                            </div>
                                          )}
                                        </Card.Body>
                                      </Card>
                                    </Col>
                                  )}

                                  {/* Évaluations Recruteur */}
                                  <Col md={answer.ai_evaluation ? 6 : 12}>
                                    <Card className="h-100 border-primary">
                                      <Card.Header className="bg-primary text-white">
                                        <h6 className="mb-0">
                                          <i className="bi bi-person-check me-2"></i>
                                          Évaluations Recruteur ({answer.recruiter_evaluations.length})
                                        </h6>
                                      </Card.Header>
                                      <Card.Body>
                                        {answer.recruiter_evaluations.length > 0 ? (
                                          answer.recruiter_evaluations.map((evaluation) => (
                                            <div key={evaluation.id} className="border rounded p-3 mb-3">
                                              <div className="d-flex justify-content-between align-items-center mb-2">
                                                <small className="text-muted fw-bold">
                                                  <i className="bi bi-person me-1"></i>
                                                  {evaluation.recruiter_name}
                                                </small>
                                                <Badge 
                                                  bg={getScoreColor(evaluation.overall_score)} 
                                                  className="px-2 py-1"
                                                >
                                                  {evaluation.overall_score}/100
                                                </Badge>
                                              </div>
                                              
                                              <Row className="mb-2">
                                                <Col xs={6}>
                                                  <small>
                                                    <strong>Technique:</strong> {evaluation.technical_score}/100
                                                  </small>
                                                </Col>
                                                <Col xs={6}>
                                                  <small>
                                                    <strong>Communication:</strong> {evaluation.communication_score}/100
                                                  </small>
                                                </Col>
                                              </Row>
                                              
                                              {evaluation.comments && (
                                                <div className="bg-light p-2 rounded">
                                                  <small className="text-muted">
                                                    <i className="bi bi-chat-text me-1"></i>
                                                    <strong>Commentaires:</strong> {evaluation.comments}
                                                  </small>
                                                </div>
                                              )}
                                            </div>
                                          ))
                                        ) : (
                                          <div className="text-center py-3">
                                            <i className="bi bi-inbox" style={{ fontSize: '2rem', color: '#6c757d' }}></i>
                                            <p className="text-muted mt-2 mb-0">Aucune évaluation recruteur</p>
                                          </div>
                                        )}
                                      </Card.Body>
                                    </Card>
                                  </Col>
                                </Row>
                              </div>
                            </div>
                          ))}
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <i className="bi bi-inbox" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                    <p className="text-muted mt-3">Aucun candidat n'a encore passé l'entretien.</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Footer */}
        <Row className="mt-4">
          <Col>
            <div className="text-center">
              <small className="text-muted">
                <i className="bi bi-shield-check me-2"></i>
                Accès sécurisé en lecture seule | 
                Expire le: {new Date(data?.access_info?.expires_at * 1000).toLocaleDateString('fr-FR')} |
                JobGate - Plateforme de recrutement vidéo
              </small>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default HiringManagerDashboard;
