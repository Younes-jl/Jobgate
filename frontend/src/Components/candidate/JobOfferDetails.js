import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAllJobOffers } from './jobOffersApi';
import './CandidateStyles.css';
import { useAuth } from '../auth/useAuth';
import JobApplicationsList from '../jobs/JobApplicationsList';
import { formatDate } from '../../utils/dateUtils';
import api from '../../services/api';
import { Modal, Button } from 'react-bootstrap';

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
            <div className="alert alert-success">
              Vous avez déjà postulé à cette offre. Consultez vos candidatures pour suivre son état.
            </div>
          ) : applicationSuccess ? (
            <div className="alert alert-success">
              Votre candidature a été envoyée avec succès !
            </div>
          ) : (
            <button 
              className="apply-button" 
              onClick={handleApply}
              disabled={submitting}
            >
              {submitting ? 'Envoi en cours...' : 'Postuler à cette offre'}
            </button>
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
