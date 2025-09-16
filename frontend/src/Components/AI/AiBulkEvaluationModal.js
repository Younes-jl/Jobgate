import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, ProgressBar, ListGroup, Badge } from 'react-bootstrap';
import { FaRobot, FaUsers, FaPlay, FaCheck, FaTimes } from 'react-icons/fa';
import api from '../../services/api';

const AiBulkEvaluationModal = ({ 
  show, 
  onHide, 
  campaignId, 
  campaignTitle,
  onEvaluationComplete 
}) => {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [forceReevaluation, setForceReevaluation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show && campaignId) {
      fetchCandidates();
    }
  }, [show, campaignId]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      // Récupérer les candidats avec des réponses vidéo pour cette campagne
      const response = await api.get(`/interviews/answers/?campaign=${campaignId}&has_video=true`);
      
      // Grouper par candidat
      const candidateMap = new Map();
      response.data.results.forEach(answer => {
        const candidateId = answer.candidate.id;
        if (!candidateMap.has(candidateId)) {
          candidateMap.set(candidateId, {
            id: candidateId,
            name: answer.candidate_name || answer.candidate.username,
            email: answer.candidate.email,
            answers: []
          });
        }
        candidateMap.get(candidateId).answers.push(answer);
      });

      const candidatesList = Array.from(candidateMap.values());
      setCandidates(candidatesList);
      setSelectedCandidates(candidatesList.map(c => c.id)); // Sélectionner tous par défaut
    } catch (err) {
      setError('Erreur lors du chargement des candidats');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateToggle = (candidateId) => {
    setSelectedCandidates(prev => 
      prev.includes(candidateId) 
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const handleSelectAll = () => {
    setSelectedCandidates(candidates.map(c => c.id));
  };

  const handleSelectNone = () => {
    setSelectedCandidates([]);
  };

  const startBulkEvaluation = async () => {
    try {
      setEvaluating(true);
      setError(null);
      setResults(null);

      const response = await api.post('/interviews/ai-evaluations/bulk_evaluate/', {
        campaign_id: campaignId,
        candidate_ids: selectedCandidates,
        force_reevaluation: forceReevaluation
      });

      setResults(response.data);
      
      // Polling pour suivre le progrès
      pollBulkEvaluationProgress();
      
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du lancement de l\'évaluation en lot');
      setEvaluating(false);
    }
  };

  const pollBulkEvaluationProgress = async () => {
    const maxAttempts = 120; // 20 minutes max
    let attempts = 0;

    const checkProgress = async () => {
      try {
        // Vérifier le statut des évaluations pour cette campagne
        const response = await api.get(`/interviews/ai-evaluations/by_campaign/?campaign_id=${campaignId}`);
        const evaluations = response.data.evaluations;
        
        const relevantEvaluations = evaluations.filter(evaluation => 
          selectedCandidates.includes(evaluation.interview_answer.candidate)
        );

        const completed = relevantEvaluations.filter(evaluation => evaluation.status === 'completed').length;
        const failed = relevantEvaluations.filter(evaluation => evaluation.status === 'failed').length;
        const total = relevantEvaluations.length;

        if (completed + failed >= total) {
          setEvaluating(false);
          if (onEvaluationComplete) {
            onEvaluationComplete(relevantEvaluations);
          }
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkProgress, 10000); // Vérifier toutes les 10 secondes
        } else {
          setError('Timeout: certaines évaluations prennent trop de temps');
          setEvaluating(false);
        }
      } catch (err) {
        console.error('Erreur lors de la vérification du progrès:', err);
        setEvaluating(false);
      }
    };

    checkProgress();
  };

  const handleClose = () => {
    if (!evaluating) {
      setSelectedCandidates([]);
      setResults(null);
      setError(null);
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton={!evaluating}>
        <Modal.Title>
          <FaRobot className="me-2" />
          Évaluation IA en Lot
          {campaignTitle && <small className="text-muted ms-2">- {campaignTitle}</small>}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="mt-2">Chargement des candidats...</p>
          </div>
        ) : evaluating ? (
          <div className="text-center py-4">
            <div className="mb-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Évaluation en cours...</span>
              </div>
            </div>
            <h5>Évaluation IA en cours...</h5>
            <p className="text-muted">
              L'IA analyse les vidéos de {selectedCandidates.length} candidat{selectedCandidates.length > 1 ? 's' : ''}. 
              Cela peut prendre plusieurs minutes.
            </p>
            <ProgressBar animated now={100} variant="primary" className="mt-3" />
            {results && (
              <div className="mt-3">
                <small className="text-muted">
                  {results.statistics?.evaluations_created || 0} créées, 
                  {results.statistics?.evaluations_updated || 0} mises à jour, 
                  {results.statistics?.evaluations_skipped || 0} ignorées
                </small>
              </div>
            )}
          </div>
        ) : results ? (
          <div className="text-center py-4">
            <FaCheck size={48} className="text-success mb-3" />
            <h5>Évaluation terminée !</h5>
            <div className="mt-3">
              <Badge bg="success" className="me-2">
                {results.statistics?.evaluations_created || 0} créées
              </Badge>
              <Badge bg="info" className="me-2">
                {results.statistics?.evaluations_updated || 0} mises à jour
              </Badge>
              <Badge bg="secondary">
                {results.statistics?.evaluations_skipped || 0} ignorées
              </Badge>
            </div>
            {results.statistics?.errors?.length > 0 && (
              <Alert variant="warning" className="mt-3">
                <strong>Erreurs:</strong>
                <ul className="mb-0 mt-2">
                  {results.statistics.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </div>
        ) : (
          <>
            <div className="mb-3">
              <h6>
                <FaUsers className="me-2" />
                Candidats disponibles ({candidates.length})
              </h6>
              <div className="d-flex gap-2 mb-3">
                <Button variant="outline-primary" size="sm" onClick={handleSelectAll}>
                  Tout sélectionner
                </Button>
                <Button variant="outline-secondary" size="sm" onClick={handleSelectNone}>
                  Tout désélectionner
                </Button>
              </div>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <ListGroup>
                {candidates.map(candidate => (
                  <ListGroup.Item 
                    key={candidate.id}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <Form.Check
                      type="checkbox"
                      id={`candidate-${candidate.id}`}
                      checked={selectedCandidates.includes(candidate.id)}
                      onChange={() => handleCandidateToggle(candidate.id)}
                      label={
                        <div>
                          <strong>{candidate.name}</strong>
                          <br />
                          <small className="text-muted">
                            {candidate.answers.length} réponse{candidate.answers.length > 1 ? 's' : ''} vidéo
                          </small>
                        </div>
                      }
                    />
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </div>

            <div className="mt-3">
              <Form.Check
                type="checkbox"
                id="force-reevaluation"
                checked={forceReevaluation}
                onChange={(e) => setForceReevaluation(e.target.checked)}
                label="Forcer la réévaluation (remplacer les évaluations existantes)"
              />
            </div>

            {selectedCandidates.length > 0 && (
              <Alert variant="info" className="mt-3">
                <strong>Sélection:</strong> {selectedCandidates.length} candidat{selectedCandidates.length > 1 ? 's' : ''} 
                {' '}sera{selectedCandidates.length > 1 ? 'ont' : ''} évalué{selectedCandidates.length > 1 ? 's' : ''} par l'IA.
              </Alert>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        {!evaluating && !results && (
          <>
            <Button variant="secondary" onClick={handleClose}>
              Annuler
            </Button>
            <Button 
              variant="primary" 
              onClick={startBulkEvaluation}
              disabled={selectedCandidates.length === 0 || loading}
            >
              <FaPlay className="me-2" />
              Lancer l'évaluation IA ({selectedCandidates.length})
            </Button>
          </>
        )}
        
        {results && (
          <Button variant="success" onClick={handleClose}>
            <FaCheck className="me-2" />
            Terminé
          </Button>
        )}
        
        {evaluating && (
          <Button variant="outline-secondary" disabled>
            Évaluation en cours...
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default AiBulkEvaluationModal;
