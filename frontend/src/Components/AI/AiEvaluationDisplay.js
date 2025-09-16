import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button, Spinner, Alert, ProgressBar } from 'react-bootstrap';
import { FaRobot, FaPlay, FaEye, FaChartLine, FaClock, FaLanguage } from 'react-icons/fa';
import api from '../../services/api';

const AiEvaluationDisplay = ({ interviewAnswerId, onEvaluationComplete }) => {
  const [aiEvaluation, setAiEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTranscription, setShowTranscription] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const fetchAiEvaluation = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/interviews/ai-evaluations/?interview_answer=${interviewAnswerId}`);
      if (response.data.results && response.data.results.length > 0) {
        setAiEvaluation(response.data.results[0]);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération de l\'évaluation IA:', err);
    } finally {
      setLoading(false);
    }
  }, [interviewAnswerId]);

  useEffect(() => {
    if (interviewAnswerId) {
      fetchAiEvaluation();
    }
  }, [interviewAnswerId, fetchAiEvaluation]);

  const triggerAiEvaluation = async (forceReevaluation = false) => {
    try {
      setEvaluating(true);
      setError(null);
      
      const response = await api.post('/interviews/ai-evaluations/evaluate_video/', {
        interview_answer_id: interviewAnswerId,
        force_reevaluation: forceReevaluation
      });

      if (response.data.evaluation_id) {
        // Polling pour vérifier le statut
        pollEvaluationStatus(response.data.evaluation_id);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du lancement de l\'évaluation IA');
      setEvaluating(false);
    }
  };

  const pollEvaluationStatus = async (evaluationId) => {
    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await api.get(`/interviews/ai-evaluations/${evaluationId}/`);
        const evaluation = response.data;

        if (evaluation.status === 'completed') {
          setAiEvaluation(evaluation);
          setEvaluating(false);
          if (onEvaluationComplete) {
            onEvaluationComplete(evaluation);
          }
          return;
        } else if (evaluation.status === 'failed') {
          setError(evaluation.error_message || 'Échec de l\'évaluation IA');
          setEvaluating(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000); // Vérifier toutes les 10 secondes
        } else {
          setError('Timeout: l\'évaluation prend trop de temps');
          setEvaluating(false);
        }
      } catch (err) {
        console.error('Erreur lors de la vérification du statut:', err);
        setEvaluating(false);
      }
    };

    checkStatus();
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'success';
    if (score >= 6) return 'warning';
    return 'danger';
  };

  const getGradeColor = (grade) => {
    const colors = {
      'A': 'success',
      'B': 'primary',
      'C': 'warning',
      'D': 'danger',
      'F': 'dark'
    };
    return colors[grade] || 'secondary';
  };

  if (loading) {
    return (
      <Card className="ai-evaluation-card">
        <Card.Body className="text-center">
          <Spinner animation="border" size="sm" />
          <span className="ms-2">Chargement de l'évaluation IA...</span>
        </Card.Body>
      </Card>
    );
  }

  if (!aiEvaluation && !evaluating) {
    return (
      <Card className="ai-evaluation-card border-info">
        <Card.Header className="bg-info text-white">
          <FaRobot className="me-2" />
          Évaluation IA
        </Card.Header>
        <Card.Body className="text-center">
          <p className="text-muted mb-3">
            Aucune évaluation IA disponible pour cette réponse.
          </p>
          <Button 
            variant="primary" 
            onClick={() => triggerAiEvaluation(false)}
            disabled={evaluating}
          >
            <FaPlay className="me-2" />
            Lancer l'évaluation IA
          </Button>
        </Card.Body>
      </Card>
    );
  }

  if (evaluating) {
    return (
      <Card className="ai-evaluation-card border-warning">
        <Card.Header className="bg-warning text-dark">
          <FaRobot className="me-2" />
          Évaluation IA en cours...
        </Card.Header>
        <Card.Body>
          <div className="text-center mb-3">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 mb-0">
              L'IA analyse la vidéo... Cela peut prendre quelques minutes.
            </p>
          </div>
          <ProgressBar animated now={100} variant="primary" />
          <small className="text-muted d-block mt-2">
            Étapes: Téléchargement → Transcription → Analyse → Génération du feedback
          </small>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="ai-evaluation-container">
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card className="ai-evaluation-card border-success">
        <Card.Header className="bg-success text-white d-flex justify-content-between align-items-center">
          <div>
            <FaRobot className="me-2" />
            Évaluation IA - {aiEvaluation.status_display}
          </div>
          <div>
            <Badge bg="light" text="dark" className="me-2">
              {aiEvaluation.ai_provider}
            </Badge>
            {aiEvaluation.processing_time_display && (
              <Badge bg="info">
                <FaClock className="me-1" />
                {aiEvaluation.processing_time_display}
              </Badge>
            )}
          </div>
        </Card.Header>

        <Card.Body>
          {/* Scores principaux */}
          <Row className="mb-4">
            <Col md={3}>
              <div className="score-card text-center">
                <h5 className="mb-1">Communication</h5>
                <div className={`score-circle bg-${getScoreColor(aiEvaluation.communication_score)}`}>
                  {aiEvaluation.communication_score?.toFixed(1) || 'N/A'}
                </div>
                <Badge bg={getGradeColor(aiEvaluation.communication_grade)} className="mt-2">
                  {aiEvaluation.communication_grade}
                </Badge>
              </div>
            </Col>
            <Col md={3}>
              <div className="score-card text-center">
                <h5 className="mb-1">Pertinence</h5>
                <div className={`score-circle bg-${getScoreColor(aiEvaluation.relevance_score)}`}>
                  {aiEvaluation.relevance_score?.toFixed(1) || 'N/A'}
                </div>
                <Badge bg={getGradeColor(aiEvaluation.relevance_grade)} className="mt-2">
                  {aiEvaluation.relevance_grade}
                </Badge>
              </div>
            </Col>
            <Col md={3}>
              <div className="score-card text-center">
                <h5 className="mb-1">Confiance</h5>
                <div className={`score-circle bg-${getScoreColor(aiEvaluation.confidence_score)}`}>
                  {aiEvaluation.confidence_score?.toFixed(1) || 'N/A'}
                </div>
                <Badge bg={getGradeColor(aiEvaluation.confidence_grade)} className="mt-2">
                  {aiEvaluation.confidence_grade}
                </Badge>
              </div>
            </Col>
            <Col md={3}>
              <div className="score-card text-center">
                <h5 className="mb-1">Score Global</h5>
                <div className={`score-circle bg-${getScoreColor(aiEvaluation.overall_ai_score)} score-global`}>
                  {aiEvaluation.overall_ai_score?.toFixed(1) || 'N/A'}
                </div>
                <Badge bg={getGradeColor(aiEvaluation.overall_grade)} className="mt-2">
                  {aiEvaluation.overall_grade}
                </Badge>
              </div>
            </Col>
          </Row>

          {/* Feedback IA */}
          {aiEvaluation.ai_feedback && (
            <Row className="mb-3">
              <Col>
                <Card className="feedback-card">
                  <Card.Header className="bg-light">
                    <FaChartLine className="me-2" />
                    Analyse IA
                  </Card.Header>
                  <Card.Body>
                    <p className="mb-0">{aiEvaluation.ai_feedback}</p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {/* Points forts et axes d'amélioration */}
          <Row className="mb-3">
            {aiEvaluation.strengths && (
              <Col md={6}>
                <Card className="h-100 border-success">
                  <Card.Header className="bg-success text-white">
                    ✅ Points forts
                  </Card.Header>
                  <Card.Body>
                    <p className="mb-0">{aiEvaluation.strengths}</p>
                  </Card.Body>
                </Card>
              </Col>
            )}
            {aiEvaluation.weaknesses && (
              <Col md={6}>
                <Card className="h-100 border-warning">
                  <Card.Header className="bg-warning text-dark">
                    ⚠️ Axes d'amélioration
                  </Card.Header>
                  <Card.Body>
                    <p className="mb-0">{aiEvaluation.weaknesses}</p>
                  </Card.Body>
                </Card>
              </Col>
            )}
          </Row>

          {/* Transcription */}
          {aiEvaluation.transcription && (
            <Row className="mb-3">
              <Col>
                <Card className="transcription-card">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <div>
                      <FaLanguage className="me-2" />
                      Transcription
                      {aiEvaluation.transcription_language && (
                        <Badge bg="secondary" className="ms-2">
                          {aiEvaluation.transcription_language}
                        </Badge>
                      )}
                    </div>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => setShowTranscription(!showTranscription)}
                    >
                      <FaEye className="me-1" />
                      {showTranscription ? 'Masquer' : 'Afficher'}
                    </Button>
                  </Card.Header>
                  {showTranscription && (
                    <Card.Body>
                      <p className="transcription-text">{aiEvaluation.transcription}</p>
                      {aiEvaluation.transcription_confidence && (
                        <small className="text-muted">
                          Confiance de transcription: {(aiEvaluation.transcription_confidence * 100).toFixed(1)}%
                        </small>
                      )}
                    </Card.Body>
                  )}
                </Card>
              </Col>
            </Row>
          )}

          {/* Actions */}
          <Row>
            <Col className="text-end">
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={() => triggerAiEvaluation(true)}
                disabled={evaluating}
                className="me-2"
              >
                🔄 Réévaluer
              </Button>
              <small className="text-muted">
                Évalué le {new Date(aiEvaluation.created_at).toLocaleString('fr-FR')}
              </small>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AiEvaluationDisplay;
