import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAllJobOffers } from './jobOffersApi';
import './CandidateStyles.css';
import { useAuth } from '../auth/useAuth';
import JobApplicationsList from '../Recruteur/JobApplicationsList';
import { formatDate } from '../../utils/dateUtils';
import api from '../../services/api';
import { Modal, Button, Form, Card, Container, Row, Col, Alert } from 'react-bootstrap';

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
          const response = await api.get('/interviews/applications/my/');
          const applications = response.data;
          const applied = applications.some(app => app.job_offer.id === parseInt(id));
          setHasApplied(applied);
        } catch (err) {
          console.error('Erreur lors de la vérification des candidatures:', err);
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

    setSubmitting(true);
    try {
      await api.post('/interviews/applications/', {
        job_offer: jobOffer.id
      });
      setHasApplied(true);
      setApplicationSuccess(true);
      setModalMessage("Votre candidature a été envoyée avec succès !");
      setShowModal(true);
    } catch (error) {
      console.error('Erreur lors de la candidature:', error);
      // Journalisation détaillée de l'erreur
      if (error.response) {
        // La requête a été effectuée et le serveur a répondu avec un code d'état hors de la plage 2xx
        console.error('Données de réponse d\'erreur:', error.response.data);
        console.error('Statut d\'erreur:', error.response.status);
        console.error('En-têtes de réponse d\'erreur:', error.response.headers);
        
        if (error.response.data.detail === "Vous avez déjà postulé à cette offre.") {
          setHasApplied(true);
          setModalMessage("Vous avez déjà postulé à cette offre.");
          setShowModal(true);
        } else {
          // Message d'erreur spécifique du serveur
          const errorMessage = error.response.data.detail || error.response.data.message || 
                              "Une erreur s'est produite lors de l'envoi de votre candidature. Veuillez réessayer.";
          setModalMessage(errorMessage);
          setShowModal(true);
        }
      } else if (error.request) {
        // La requête a été effectuée mais aucune réponse n'a été reçue
        console.error('Requête sans réponse:', error.request);
        setModalMessage("Pas de réponse du serveur. Vérifiez votre connexion internet.");
        setShowModal(true);
      } else {
        // Une erreur s'est produite lors de la configuration de la requête
        console.error('Erreur de configuration de la requête:', error.message);
        setModalMessage("Une erreur s'est produite lors de la configuration de la requête.");
        setShowModal(true);
      }
    } finally {
      setSubmitting(false);
    }
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
          {hasApplied ? (
            <Alert variant="warning" className="d-flex align-items-center">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <div>
                <strong>Candidature déjà envoyée</strong>
                <div>Vous avez déjà postulé à cette offre. Une seule candidature par offre est autorisée.</div>
              </div>
            </Alert>
          ) : applicationSuccess ? (
            <Alert variant="success">
              <i className="bi bi-check-circle-fill me-2"></i>
              Votre candidature a été envoyée avec succès !
            </Alert>
          ) : (
            <Button 
              variant="primary" 
              size="lg"
              className="w-100"
              onClick={() => setShowApplicationForm(true)}
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
          <Modal.Title>Information</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalMessage}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowModal(false)}>
            Fermer
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default JobOfferDetails;
