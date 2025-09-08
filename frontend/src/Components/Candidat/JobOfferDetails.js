import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAllJobOffers } from './jobOffersApi';
import './CandidateStyles.css';
import { useAuth } from '../auth/useAuth';
import JobApplicationsList from '../Recruteur/JobApplicationsList';
import { formatDate } from '../../utils/dateUtils';
import api from '../../services/api';
import { Modal, Button, Form, Alert, Row, Col } from 'react-bootstrap';

/**
 * Composant pour afficher les détails d'une offre d'emploi
 */
const JobOfferDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [jobOffer, setJobOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [checkingApplication, setCheckingApplication] = useState(false);
  const [applicationData, setApplicationData] = useState({
    diploma: '',
    field: '',
    experience: '',
    motivation: ''
  });

  useEffect(() => {
    // Récupérer les détails de l'offre d'emploi en utilisant toutes les offres
    const loadJobOfferDetails = async () => {
      try {
        setLoading(true);
        // On récupère toutes les offres et on filtre pour trouver celle qu'on veut
        const allOffers = await fetchAllJobOffers();
        const foundOffer = allOffers.find(offer => offer.id === parseInt(id));
        
        if (foundOffer) {
          setJobOffer(foundOffer);
          setError(null);
        } else {
          setError('Offre non trouvée.');
        }
      } catch (err) {
        setError('Erreur lors du chargement des détails de l\'offre. Veuillez réessayer plus tard.');
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    loadJobOfferDetails();
  }, [id]);

  // Vérifier si l'utilisateur a déjà postulé à cette offre
  useEffect(() => {
    const checkIfApplied = async () => {
      if (isAuthenticated && user.role === 'CANDIDAT' && jobOffer) {
        try {
          setCheckingApplication(true);
          const response = await api.get('/interviews/applications/my/');
          const applications = response.data;
          const applied = applications.some(app => app.job_offer.id === parseInt(id));
          setHasApplied(applied);
        } catch (err) {
          console.error('Erreur lors de la vérification des candidatures:', err);
        } finally {
          setCheckingApplication(false);
        }
      }
    };

    if (isAuthenticated && jobOffer) {
      checkIfApplied();
    }
  }, [isAuthenticated, user, jobOffer, id]);

  const handleApply = async () => {
    if (!isAuthenticated || user.role !== 'CANDIDAT') {
      navigate('/login');
      return;
    }

    // Vérification finale avant soumission
    if (hasApplied) {
      setModalMessage("Vous avez déjà postulé à cette offre. Une seule candidature par offre est autorisée.");
      setShowModal(true);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/interviews/applications/', {
        job_offer: jobOffer.id,
        diploma: applicationData.diploma,
        field: applicationData.field,
        experience: applicationData.experience,
        motivation: applicationData.motivation
      });
      setHasApplied(true);
      setApplicationSuccess(true);
      setModalMessage("🎉 Félicitations ! Votre candidature a été envoyée avec succès. Le recruteur examinera votre profil et vous contactera si votre candidature est retenue.");
      setShowModal(true);
      // Réinitialiser le formulaire
      setApplicationData({
        diploma: '',
        field: '',
        experience: '',
        motivation: ''
      });
    } catch (error) {
      console.error('Erreur lors de la candidature:', error);
      if (error.response) {
        if (error.response.data.detail === "Vous avez déjà postulé à cette offre.") {
          setHasApplied(true);
          setModalMessage("Vous avez déjà postulé à cette offre. Une seule candidature par offre est autorisée.");
        } else {
          const errorMessage = error.response.data.detail || error.response.data.message || 
                              "Une erreur s'est produite lors de l'envoi de votre candidature. Veuillez réessayer.";
          setModalMessage(errorMessage);
        }
      } else if (error.request) {
        setModalMessage("Pas de réponse du serveur. Vérifiez votre connexion internet.");
      } else {
        setModalMessage("Une erreur s'est produite lors de la configuration de la requête.");
      }
      setShowModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShowApplicationForm = () => {
    // Vérifier une dernière fois avant d'ouvrir le formulaire
    if (hasApplied) {
      setModalMessage("Vous avez déjà postulé à cette offre. Une seule candidature par offre est autorisée.");
      setShowModal(true);
      return;
    }
    setShowApplicationForm(true);
  };

  if (loading) {
    return (
      <div className="job-offer-details loading">
        <h2>Chargement des détails de l'offre...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="job-offer-details error">
        <h2>Erreur</h2>
        <p>{error}</p>
        <button onClick={() => navigate(-1)}>Retour aux offres</button>
      </div>
    );
  }

  if (!jobOffer) {
    return (
      <div className="job-offer-details not-found">
        <h2>Offre non trouvée</h2>
        <p>L'offre d'emploi que vous recherchez n'existe pas ou a été supprimée.</p>
        <button onClick={() => navigate(-1)}>Retour aux offres</button>
      </div>
    );
  }

  const isRecruiter = isAuthenticated && user?.role === 'RECRUTEUR';
  const isCandidate = isAuthenticated && user?.role === 'CANDIDAT';
  const isJobOwner = isRecruiter && user?.id === jobOffer.recruiter;

  return (
    <div className="job-offer-details">
      <button className="back-button" onClick={() => navigate(-1)}>
        &larr; Retour aux offres
      </button>
      
      <div className="job-offer-header">
        <h2>{jobOffer.title}</h2>
        <div className="job-offer-meta">
          <span className="location"><i className="icon-location"></i> {jobOffer.location}</span>
          {jobOffer.contract_type && (
            <span className="contract-type"><i className="icon-contract"></i> {jobOffer.contract_type}</span>
          )}
          {jobOffer.salary && (
            <span className="salary"><i className="icon-salary"></i> {jobOffer.salary}</span>
          )}
        </div>
        <span className="date">Publié le: {formatDate(jobOffer.created_at)}</span>
      </div>
      
      <div className="job-offer-content">
        <h3>Description du poste</h3>
        <div className="description">
          {jobOffer.description.split('\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        
        {jobOffer.prerequisites && (
          <div className="prerequisites-section">
            <h3>Prérequis</h3>
            <div className="prerequisites">
              {jobOffer.prerequisites.split('\n').map((prerequisite, index) => (
                <p key={index}>{prerequisite}</p>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {isCandidate && (
        <div className="job-offer-actions">
          {checkingApplication ? (
            <div className="text-center p-3">
              <span className="spinner-border spinner-border-sm me-2" />
              Vérification de votre statut de candidature...
            </div>
          ) : hasApplied ? (
            <Alert variant="info" className="d-flex align-items-center">
              <i className="bi bi-check-circle-fill me-2"></i>
              <div>
                <strong>Candidature déjà envoyée</strong>
                <div>Vous avez déjà postulé à cette offre le {new Date().toLocaleDateString('fr-FR')}. Une seule candidature par offre est autorisée. Le recruteur examinera votre candidature et vous contactera si elle est retenue.</div>
              </div>
            </Alert>
          ) : applicationSuccess ? (
            <Alert variant="success" className="d-flex align-items-center">
              <i className="bi bi-check-circle-fill me-2"></i>
              <div>
                <strong>Candidature envoyée avec succès !</strong>
                <div>Votre candidature a été transmise au recruteur. Vous recevrez une notification par email si votre profil est retenu pour un entretien.</div>
              </div>
            </Alert>
          ) : (
            <Button 
              variant="primary" 
              size="lg"
              className="w-100"
              onClick={handleShowApplicationForm}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <i className="bi bi-send me-2"></i>
                  Postuler à cette offre
                </>
              )}
            </Button>
          )}
        </div>
      )}
      
      {!isAuthenticated && (
        <div className="job-offer-actions">
          <div className="alert alert-info">
            Vous devez être connecté en tant que candidat pour postuler à cette offre.
            <button 
              className="btn btn-primary ms-3"
              onClick={() => navigate('/login')}
            >
              Se connecter
            </button>
          </div>
        </div>
      )}
      
      {isAuthenticated && !isCandidate && !isRecruiter && (
        <div className="job-offer-actions">
          <div className="alert alert-warning">
            Vous êtes connecté mais vous devez avoir un profil candidat pour postuler à cette offre.
          </div>
        </div>
      )}
      
      {isJobOwner && (
        <div className="mt-5">
          <h3>Candidatures pour cette offre</h3>
          <JobApplicationsList jobOfferId={jobOffer.id} />
        </div>
      )}

      {/* Modal de candidature avec formulaire */}
      <Modal
        show={showApplicationForm}
        onHide={() => setShowApplicationForm(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-person-plus me-2"></i>
            Postuler à: {jobOffer?.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <i className="bi bi-mortarboard me-2"></i>
                    Diplôme *
                  </Form.Label>
                  <Form.Select 
                    value={applicationData.diploma}
                    onChange={(e) => setApplicationData({...applicationData, diploma: e.target.value})}
                    required
                  >
                    <option value="">Sélectionnez votre diplôme</option>
                    <option value="bac">Baccalauréat</option>
                    <option value="bac+2">Bac+2 (DUT, BTS)</option>
                    <option value="bac+3">Bac+3 (Licence)</option>
                    <option value="bac+5">Bac+5 (Master, Ingénieur)</option>
                    <option value="doctorat">Doctorat</option>
                    <option value="autre">Autre</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <i className="bi bi-book me-2"></i>
                    Filière *
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ex: Informatique, Marketing, Finance..."
                    value={applicationData.field}
                    onChange={(e) => setApplicationData({...applicationData, field: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>
                <i className="bi bi-briefcase me-2"></i>
                Expérience professionnelle
              </Form.Label>
              <Form.Select 
                value={applicationData.experience}
                onChange={(e) => setApplicationData({...applicationData, experience: e.target.value})}
              >
                <option value="">Sélectionnez votre niveau d'expérience</option>
                <option value="debutant">Débutant (0-1 an)</option>
                <option value="junior">Junior (1-3 ans)</option>
                <option value="confirme">Confirmé (3-5 ans)</option>
                <option value="senior">Senior (5+ ans)</option>
                <option value="expert">Expert (10+ ans)</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>
                <i className="bi bi-chat-heart me-2"></i>
                Lettre de motivation *
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Expliquez pourquoi vous souhaitez rejoindre cette entreprise et ce poste..."
                value={applicationData.motivation}
                onChange={(e) => setApplicationData({...applicationData, motivation: e.target.value})}
                required
              />
              <Form.Text className="text-muted">
                {applicationData.motivation.length}/500 caractères
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowApplicationForm(false)}
          >
            Annuler
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              handleApply();
              setShowApplicationForm(false);
            }}
            disabled={!applicationData.diploma || !applicationData.field || !applicationData.motivation || submitting}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Envoi en cours...
              </>
            ) : (
              <>
                <i className="bi bi-send me-2"></i>
                Envoyer ma candidature
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal pour afficher les messages de candidature */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {applicationSuccess ? (
              <>
                <i className="bi bi-check-circle-fill text-success me-2"></i>
                Candidature envoyée
              </>
            ) : hasApplied ? (
              <>
                <i className="bi bi-info-circle-fill text-info me-2"></i>
                Candidature existante
              </>
            ) : (
              <>
                <i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                Information
              </>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center">
            {modalMessage}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant={applicationSuccess ? "success" : hasApplied ? "info" : "primary"} 
            onClick={() => {
              setShowModal(false);
              if (applicationSuccess) {
                // Optionnel: rediriger vers le dashboard candidat
                // navigate('/candidate/dashboard');
              }
            }}
          >
            {applicationSuccess ? "Parfait !" : "Compris"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default JobOfferDetails;
