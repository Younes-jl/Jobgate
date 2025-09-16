import React from 'react';
import { Card, Row, Col, Badge, ProgressBar } from 'react-bootstrap';
import { FaRobot, FaChartLine, FaUsers, FaClock } from 'react-icons/fa';
import './AiEvaluationStyles.css';

const AiEvaluationSummary = ({ evaluations, campaignTitle }) => {
  if (!evaluations || evaluations.length === 0) {
    return (
      <Card className="ai-evaluation-summary">
        <Card.Body className="text-center">
          <FaRobot size={40} className="mb-3 opacity-50" />
          <h5>Aucune évaluation IA disponible</h5>
          <p className="mb-0">Les évaluations IA apparaîtront ici une fois générées.</p>
        </Card.Body>
      </Card>
    );
  }

  // Calculs des statistiques
  const completedEvaluations = evaluations.filter(evaluation => evaluation.status === 'completed');
  const averageScores = {
    communication: 0,
    relevance: 0,
    confidence: 0,
    overall: 0
  };

  if (completedEvaluations.length > 0) {
    averageScores.communication = completedEvaluations.reduce((sum, evaluation) => 
      sum + (evaluation.communication_score || 0), 0) / completedEvaluations.length;
    averageScores.relevance = completedEvaluations.reduce((sum, evaluation) => 
      sum + (evaluation.relevance_score || 0), 0) / completedEvaluations.length;
    averageScores.confidence = completedEvaluations.reduce((sum, evaluation) => 
      sum + (evaluation.confidence_score || 0), 0) / completedEvaluations.length;
    averageScores.overall = completedEvaluations.reduce((sum, evaluation) => 
      sum + (evaluation.overall_ai_score || 0), 0) / completedEvaluations.length;
  }

  const getScoreColor = (score) => {
    if (score >= 8) return 'success';
    if (score >= 6) return 'warning';
    return 'danger';
  };

  const statusCounts = {
    completed: evaluations.filter(e => e.status === 'completed').length,
    processing: evaluations.filter(e => e.status === 'processing').length,
    failed: evaluations.filter(e => e.status === 'failed').length,
    pending: evaluations.filter(e => e.status === 'pending').length
  };

  return (
    <div className="ai-evaluation-summary">
      <Card>
        <Card.Header className="bg-primary text-white">
          <Row className="align-items-center">
            <Col>
              <h5 className="mb-0">
                <FaChartLine className="me-2" />
                Résumé des Évaluations IA
                {campaignTitle && <small className="ms-2">- {campaignTitle}</small>}
              </h5>
            </Col>
            <Col xs="auto">
              <Badge bg="light" text="dark">
                {evaluations.length} réponse{evaluations.length > 1 ? 's' : ''}
              </Badge>
            </Col>
          </Row>
        </Card.Header>

        <Card.Body>
          {/* Statistiques générales */}
          <Row className="mb-4">
            <Col md={3}>
              <div className="text-center">
                <div className="ai-metric-value text-success">
                  {statusCounts.completed}
                </div>
                <div className="ai-metric-label">Terminées</div>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center">
                <div className="ai-metric-value text-warning">
                  {statusCounts.processing}
                </div>
                <div className="ai-metric-label">En cours</div>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center">
                <div className="ai-metric-value text-info">
                  {statusCounts.pending}
                </div>
                <div className="ai-metric-label">En attente</div>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center">
                <div className="ai-metric-value text-danger">
                  {statusCounts.failed}
                </div>
                <div className="ai-metric-label">Échecs</div>
              </div>
            </Col>
          </Row>

          {/* Scores moyens */}
          {completedEvaluations.length > 0 && (
            <>
              <h6 className="mb-3">
                <FaUsers className="me-2" />
                Scores Moyens ({completedEvaluations.length} évaluation{completedEvaluations.length > 1 ? 's' : ''})
              </h6>
              
              <Row className="mb-3">
                <Col md={6}>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Communication</span>
                      <span className="fw-bold">{averageScores.communication.toFixed(1)}/10</span>
                    </div>
                    <ProgressBar 
                      now={(averageScores.communication / 10) * 100} 
                      variant={getScoreColor(averageScores.communication)}
                      className="score-progress"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Pertinence</span>
                      <span className="fw-bold">{averageScores.relevance.toFixed(1)}/10</span>
                    </div>
                    <ProgressBar 
                      now={(averageScores.relevance / 10) * 100} 
                      variant={getScoreColor(averageScores.relevance)}
                      className="score-progress"
                    />
                  </div>
                </Col>
                
                <Col md={6}>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Confiance</span>
                      <span className="fw-bold">{averageScores.confidence.toFixed(1)}/10</span>
                    </div>
                    <ProgressBar 
                      now={(averageScores.confidence / 10) * 100} 
                      variant={getScoreColor(averageScores.confidence)}
                      className="score-progress"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="fw-bold">Score Global</span>
                      <span className="fw-bold">{averageScores.overall.toFixed(1)}/10</span>
                    </div>
                    <ProgressBar 
                      now={(averageScores.overall / 10) * 100} 
                      variant={getScoreColor(averageScores.overall)}
                      className="score-progress"
                      style={{ height: '12px' }}
                    />
                  </div>
                </Col>
              </Row>
            </>
          )}

          {/* Répartition des statuts */}
          <Row>
            <Col>
              <h6 className="mb-3">
                <FaClock className="me-2" />
                Statut des Évaluations
              </h6>
              <div className="d-flex flex-wrap gap-2">
                {statusCounts.completed > 0 && (
                  <Badge bg="success" className="evaluation-status-badge">
                    {statusCounts.completed} Terminée{statusCounts.completed > 1 ? 's' : ''}
                  </Badge>
                )}
                {statusCounts.processing > 0 && (
                  <Badge bg="warning" className="evaluation-status-badge">
                    {statusCounts.processing} En cours
                  </Badge>
                )}
                {statusCounts.pending > 0 && (
                  <Badge bg="info" className="evaluation-status-badge">
                    {statusCounts.pending} En attente
                  </Badge>
                )}
                {statusCounts.failed > 0 && (
                  <Badge bg="danger" className="evaluation-status-badge">
                    {statusCounts.failed} Échec{statusCounts.failed > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AiEvaluationSummary;
