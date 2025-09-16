import React, { useState } from 'react';
import { Button, Spinner, Alert, Modal } from 'react-bootstrap';
import { FaRobot, FaRedo } from 'react-icons/fa';
import api from '../../services/api';

const AiEvaluationButton = ({ 
  interviewAnswerId, 
  hasExistingEvaluation = false, 
  onEvaluationStarted,
  onEvaluationComplete,
  variant = "primary",
  size = "sm",
  className = ""
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const triggerEvaluation = async (forceReevaluation = false) => {
    try {
      console.log('🔍 [FRONTEND DEBUG] Début triggerEvaluation');
      console.log('🔍 [FRONTEND DEBUG] interviewAnswerId:', interviewAnswerId);
      console.log('🔍 [FRONTEND DEBUG] forceReevaluation:', forceReevaluation);
      
      setLoading(true);
      setError(null);
      
      if (onEvaluationStarted) {
        onEvaluationStarted();
      }

      console.log('🔍 [FRONTEND DEBUG] Envoi requête POST vers /interviews/ai-evaluations/evaluate_video/');
      const response = await api.post('/interviews/ai-evaluations/evaluate_video/', {
        interview_answer_id: interviewAnswerId,
        force_reevaluation: forceReevaluation
      });
      
      console.log('🔍 [FRONTEND DEBUG] Réponse reçue:', response.data);

      if (response.data.evaluation_id) {
        // Démarrer le polling pour suivre le progrès
        pollEvaluationStatus(response.data.evaluation_id);
      } else if (response.data.evaluation) {
        // Évaluation déjà existante
        if (onEvaluationComplete) {
          onEvaluationComplete(response.data.evaluation);
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('❌ [FRONTEND DEBUG] Erreur dans triggerEvaluation:', err);
      console.error('❌ [FRONTEND DEBUG] err.response:', err.response);
      console.error('❌ [FRONTEND DEBUG] err.response?.data:', err.response?.data);
      
      const errorMessage = err.response?.data?.error || err.response?.data?.details || 'Erreur lors du lancement de l\'évaluation IA';
      console.error('❌ [FRONTEND DEBUG] Message d\'erreur final:', errorMessage);
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const pollEvaluationStatus = async (evaluationId) => {
    const maxAttempts = 60; // 10 minutes max
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await api.get(`/interviews/ai-evaluations/${evaluationId}/`);
        const evaluation = response.data;

        if (evaluation.status === 'completed') {
          setLoading(false);
          if (onEvaluationComplete) {
            onEvaluationComplete(evaluation);
          }
          return;
        } else if (evaluation.status === 'failed') {
          setError(evaluation.error_message || 'Échec de l\'évaluation IA');
          setLoading(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000); // Vérifier toutes les 10 secondes
        } else {
          setError('Timeout: l\'évaluation prend trop de temps');
          setLoading(false);
        }
      } catch (err) {
        console.error('Erreur lors de la vérification du statut:', err);
        setLoading(false);
      }
    };

    checkStatus();
  };

  const handleClick = () => {
    if (hasExistingEvaluation) {
      setShowConfirmModal(true);
    } else {
      triggerEvaluation(false);
    }
  };

  const handleConfirmReevaluation = () => {
    setShowConfirmModal(false);
    triggerEvaluation(true);
  };

  return (
    <>
      <div className={className}>
        {error && (
          <Alert variant="danger" size="sm" className="mb-2" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        <Button
          variant={variant}
          size={size}
          onClick={handleClick}
          disabled={loading || !interviewAnswerId}
          className="ai-trigger-button"
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Évaluation en cours...
            </>
          ) : (
            <>
              {hasExistingEvaluation ? (
                <>
                  <FaRedo className="me-2" />
                  Réévaluer avec IA
                </>
              ) : (
                <>
                  <FaRobot className="me-2" />
                  Évaluer avec IA
                </>
              )}
            </>
          )}
        </Button>
      </div>

      {/* Modal de confirmation pour réévaluation */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaRedo className="me-2" />
            Réévaluation IA
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Une évaluation IA existe déjà pour cette réponse. 
            Voulez-vous la remplacer par une nouvelle évaluation ?
          </p>
          <Alert variant="warning" className="mb-0">
            <strong>Note:</strong> Cette action remplacera définitivement l'évaluation existante.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleConfirmReevaluation}>
            Confirmer la réévaluation
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AiEvaluationButton;
