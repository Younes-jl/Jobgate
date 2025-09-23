import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Badge, Button, Form, Row, Col, Modal } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import './RecruiterStyles.css';

const JobApplicationsList = ({ jobOfferId }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [confirmationModal, setConfirmationModal] = useState({ show: false, candidate: null, action: null });
  const { id } = useParams(); // Pour le cas où l'ID est passé via l'URL
  const navigate = useNavigate();

  // Utiliser l'ID passé en prop ou via l'URL
  const effectiveJobOfferId = jobOfferId || id;

  // Définir la fonction de récupération des candidatures avec useCallback
  const fetchApplications = useCallback(async (retryManually = false) => {
    const fetchWithRetry = async (retryCount = 0, maxRetries = 3) => {
      try {
        setLoading(true);
        // Utiliser le chemin alternatif qui fonctionne pour les candidatures
        const response = await api.get(`/interviews/applications/job/?job_offer_id=${effectiveJobOfferId}`);
        setApplications(response.data);
        setError(null); // Réinitialiser l'erreur en cas de succès
        setLoading(false);
      } catch (err) {
        if (retryCount < maxRetries) {
          console.log(`Tentative ${retryCount + 1} échouée, nouvelle tentative dans ${(retryCount + 1) * 1000}ms...`);
          // Attendre avant de réessayer (backoff exponentiel)
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return fetchWithRetry(retryCount + 1, maxRetries);
        }
        
        console.error(`Erreur finale après ${retryCount + 1} tentatives:`, err);
        
        // Si l'erreur est 404, essayons un autre chemin d'API
        if (err.response && err.response.status === 404) {
          try {
            // Essayer avec une URL alternative
            const altResponse = await api.get(`/interviews/applications/my/?job_offer_id=${effectiveJobOfferId}`);
            setApplications(altResponse.data);
            setError(null);
            setLoading(false);
            return;
          } catch (altErr) {
            console.error("L'URL alternative a également échoué:", altErr);
          }
        }
        
        // Si nous avons épuisé toutes les tentatives, afficher l'erreur
        setError('Impossible de récupérer les candidatures pour cette offre. Veuillez réessayer plus tard.');
        setLoading(false);
      }
    };
    
    await fetchWithRetry(retryManually ? 0 : 0);
  }, [effectiveJobOfferId]);
  
  useEffect(() => {
    if (effectiveJobOfferId) {
      fetchApplications();
    } else {
      setLoading(false);
    }
  }, [effectiveJobOfferId, fetchApplications]);

  const handleUpdateStatus = async (applicationId, newStatus) => {
    try {
      await api.patch(`/interviews/applications/${applicationId}/`, {
        status: newStatus
      });
      
      // Mettre à jour l'état local après la mise à jour réussie
      setApplications(applications.map(app => 
        app.id === applicationId ? { ...app, status: newStatus } : app
      ));
    } catch (err) {
      console.error('Error updating application status:', err);
      alert('Erreur lors de la mise à jour du statut de la candidature.');
    }
  };

  // Envoyer une invitation d'entretien différé au candidat
  const handleInviteCandidate = async (applicationId, candidateName) => {
    try {
      // Récupérer le délai sélectionné
      const responseDeadlineElement = document.getElementById('responseDeadline');
      const responseDeadlineHours = responseDeadlineElement ? parseInt(responseDeadlineElement.value) : 168;

      console.log('Données à envoyer:', {
        application_id: applicationId,
        response_deadline_hours: responseDeadlineHours
      });

      // Créer/récupérer un lien unique côté backend avec le délai personnalisé
      const { data } = await api.post(`/interviews/campaign-links/`, {
        application_id: applicationId,
        response_deadline_hours: responseDeadlineHours
      });

      // Envoyer l'invitation par email (backend enverra au candidat)
      try {
        await api.post(`/interviews/campaign-links/${data.id}/send_invite/`);
      } catch (mailErr) {
        console.error('Erreur lors de l\'envoi de l\'email:', mailErr);
        // On continue quand même, le lien est généré et copié.
      }

      // Passer la candidature en "pending" après l'invitation (reste en cours)
      await handleUpdateStatus(applicationId, 'pending');

      // Afficher le lien de démarrage et proposer de copier
      const expirationDate = new Date(data.expires_at);
      const hoursUntilExpiration = Math.round((expirationDate - new Date()) / (1000 * 60 * 60));
      const msg = `✅ Invitation générée et envoyée par email à ${candidateName}.

📧 Email: ${data.email || 'Email du candidat'}
🔗 Lien: ${data.start_url}
⏰ Expire le: ${expirationDate.toLocaleString('fr-FR')}
⏳ Délai: ${hoursUntilExpiration} heures restantes`;
      
      if (navigator.clipboard?.writeText) {
        try { 
          await navigator.clipboard.writeText(data.start_url); 
        } catch { /* noop */ }
      }
      alert(msg + "\n\n📋 Le lien a été copié dans le presse-papiers.");
    } catch (err) {
      console.error('Error sending invitation:', err);
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (status === 403) return alert("Vous ne pouvez inviter que pour vos propres offres.");
      if (status === 404) return alert(detail || "Candidature ou token introuvable.");
      if (status === 400) return alert(detail || "Requête invalide.");
      alert("Erreur lors de l'envoi de l'invitation. Veuillez réessayer.");
    }
  };

  const handleViewDetails = (applicationId) => {
    navigate(`/recruiter/interview-details/${applicationId}`);
  };

  // Affichage visuel du statut d'invitation
  const getInvitationStatus = (status) => {
    switch (status) {
      case 'pending':
        return (
          <div className="invitation-status">
            <i className="bi bi-clock text-warning"></i>
            <span className="text-warning ms-1">En cours</span>
          </div>
        );
      case 'accepted':
        return (
          <div className="invitation-status">
            <i className="bi bi-check-circle text-success"></i>
            <span className="text-success ms-1">Acceptées</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="invitation-status">
            <i className="bi bi-x-circle text-danger"></i>
            <span className="text-danger ms-1">Refusées</span>
          </div>
        );
      default:
        return (
          <div className="invitation-status">
            <i className="bi bi-question-circle text-secondary"></i>
            <span className="text-muted ms-1">Inconnu</span>
          </div>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge bg="warning">En cours</Badge>;
      case 'accepted':
        return <Badge bg="success">Acceptées</Badge>;
      case 'rejected':
        return <Badge bg="danger">Refusées</Badge>;
      default:
        return <Badge bg="secondary">Inconnue</Badge>;
    }
  };

  // Fonction pour afficher le statut de l'entretien
  const getInterviewStatusBadge = (campaignLink) => {
    if (!campaignLink) {
      return <Badge bg="light" text="dark">Pas d'entretien</Badge>;
    }

    switch (campaignLink.status) {
      case 'active':
        return <Badge bg="info">Lien actif</Badge>;
      case 'in_progress':
        return <Badge bg="primary">En cours</Badge>;
      case 'completed':
        return <Badge bg="success">Terminé</Badge>;
      case 'abandoned':
        return <Badge bg="danger">Abandonné</Badge>;
      default:
        return <Badge bg="secondary">Inconnu</Badge>;
    }
  };

  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  if (loading) {
    return <div>Chargement des candidatures...</div>;
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <h5><i className="bi bi-exclamation-triangle me-2"></i>Erreur de chargement</h5>
        <p>{error}</p>
        <Button 
          variant="outline-danger" 
          size="sm" 
          onClick={() => fetchApplications(true)}
        >
          <i className="bi bi-arrow-clockwise me-1"></i> Réessayer
        </Button>
      </div>
    );
  }

  if (!effectiveJobOfferId) {
    return <div className="alert alert-warning">Aucune offre d'emploi spécifiée.</div>;
  }

  if (applications.length === 0) {
    return (
      <Card>
        <Card.Body>
          <Card.Title>Candidatures pour cette offre</Card.Title>
          <p>Aucune candidature n'a encore été reçue pour cette offre d'emploi.</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <Row className="mb-3 align-items-center">
          <Col md={4}>
            <Form.Group>
              <Form.Label className="fw-bold">Filtrer par statut</Form.Label>
              <Form.Select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="shadow-sm"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En cours</option>
                <option value="accepted">Acceptées</option>
                <option value="rejected">Refusées</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={8} className="text-md-end mt-3 mt-md-0">
            <span className="text-muted">
              {filteredApplications.length} candidature{filteredApplications.length !== 1 ? 's' : ''} affichée{filteredApplications.length !== 1 ? 's' : ''}
            </span>
          </Col>
        </Row>
        
        {filteredApplications.length > 0 ? (
          <Table responsive hover className="align-middle shadow-sm applications-table">
            <thead className="bg-light">
              <tr>
                <th className="py-3">Candidat</th>
                 <th className="py-3">Email</th>
                <th className="py-3">Date de candidature</th>
                <th className="py-3">Statut</th>
                <th className="py-3">Invitation</th>
                <th className="py-3">Entretien</th>
                <th className="py-3 actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.map((application) => (
                <tr key={application.id}>
                  <td><strong>{application.candidate.username}</strong></td>
                  <td>{application.candidate.email}</td>
                  <td>{formatDate(application.created_at)}</td>
                  <td>{getStatusBadge(application.status)}</td>
                  <td>{getInvitationStatus(application.status)}</td>
                  <td>{getInterviewStatusBadge(application.campaign_link)}</td>
                  <td>
                    <div className="actions-row">
                      {/* 1) Ligne des boutons d'action */}
                      <div className="actions-buttons">
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          onClick={() => handleViewDetails(application.id)}
                        >
                          <i className="bi bi-eye me-1"></i> Détails
                        </Button>

                        {application.status === 'pending' && (
                          <Button
                            className="btn-invite"
                            size="sm"
                            onClick={() => setConfirmationModal({
                              show: true,
                              candidate: {...application.candidate, application_id: application.id},
                              action: 'invite',
                              applicationId: application.id
                            })}
                          >
                            <i className="bi bi-send me-1"></i> Inviter
                          </Button>
                        )}

                        {(application.status === 'accepted' || 
                          application.status === 'rejected') && (
                          <Button
                            className="btn-reinvite"
                            size="sm"
                            onClick={() => setConfirmationModal({
                              show: true,
                              candidate: {...application.candidate, application_id: application.id},
                              action: 'reinvite',
                              applicationId: application.id
                            })}
                          >
                            <i className="bi bi-arrow-clockwise me-1"></i> Réinviter
                          </Button>
                        )}
                      </div>

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="text-center p-4 bg-light rounded">
            <p className="mb-0">Aucune candidature ne correspond au filtre sélectionné.</p>
          </div>
        )}
      </Card.Body>

      {/* Modal de confirmation d'invitation */}
      <Modal show={confirmationModal.show} onHide={() => setConfirmationModal({ show: false, candidate: null, action: null })} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-envelope-check me-2"></i>
            Confirmation d'invitation
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center mb-4">
            <div className="candidate-avatar mb-3">
              <i className="bi bi-person-circle" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
            </div>
            <h5 className="mb-3">
              {confirmationModal.action === 'invite' ? 'Inviter ce candidat ?' : 'Réinviter ce candidat ?'}
            </h5>
          </div>
          
          {confirmationModal.candidate && (
            <div className="candidate-info bg-light p-3 rounded mb-4">
              <Row>
                <Col md={6}>
                  <div className="info-item mb-2">
                    <i className="bi bi-person me-2 text-primary"></i>
                    <strong>Nom:</strong> {confirmationModal.candidate.first_name} {confirmationModal.candidate.last_name}
                  </div>
                  <div className="info-item mb-2">
                    <i className="bi bi-envelope me-2 text-primary"></i>
                    <strong>Email:</strong> {confirmationModal.candidate.email}
                  </div>
                </Col>
                <Col md={6}>
                  <div className="info-item mb-2">
                    <i className="bi bi-telephone me-2 text-primary"></i>
                    <strong>Téléphone:</strong> {confirmationModal.candidate.phone || 'Non renseigné'}
                  </div>
                  <div className="info-item mb-2">
                    <i className="bi bi-geo-alt me-2 text-primary"></i>
                    <strong>Ville:</strong> {confirmationModal.candidate.city || 'Non renseignée'}
                  </div>
                </Col>
              </Row>
            </div>
          )}
          
          <div className="alert alert-info">
            <i className="bi bi-info-circle me-2"></i>
            {confirmationModal.action === 'invite' 
              ? 'Le candidat recevra un email avec les instructions pour passer l\'entretien vidéo.'
              : 'Le candidat recevra un nouveau lien d\'invitation pour l\'entretien vidéo.'
            }
          </div>
          
          {/* Options avancées d'email */}
          <div className="border rounded p-3 mb-3">
            <h6 className="fw-bold mb-3">
              <i className="bi bi-gear me-2"></i>
              Options avancées d'email
            </h6>
            
            <div className="mb-3">
              <label className="form-label">Objet de l'email</label>
              <input 
                type="text" 
                className="form-control" 
                defaultValue={`Invitation à un entretien vidéo - ${confirmationModal.candidate?.first_name || ''}`}
                placeholder="Personnaliser l'objet de l'email..."
              />
            </div>
            
            
            <div className="mb-3">
              <label className="form-label">
                <i className="bi bi-clock me-2"></i>
                Délai de réponse (en heures)
              </label>
              <select className="form-control" id="responseDeadline">
                <option value="24">24 heures (1 jour)</option>
                <option value="48">48 heures (2 jours)</option>
                <option value="72">72 heures (3 jours)</option>
                <option value="120">120 heures (5 jours)</option>
                <option value="168" selected>168 heures (7 jours - par défaut)</option>
                <option value="240">240 heures (10 jours)</option>
                <option value="336">336 heures (14 jours)</option>
                <option value="504">504 heures (21 jours)</option>
              </select>
              <div className="form-text text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Le lien d'entretien expirera automatiquement après ce délai
              </div>
            </div>
            
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmationModal({ show: false, candidate: null, action: null })}>
            Annuler
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              if (confirmationModal.action === 'invite') {
                handleInviteCandidate(confirmationModal.candidate.application_id, `${confirmationModal.candidate.first_name} ${confirmationModal.candidate.last_name}`);
              } else if (confirmationModal.action === 'reinvite') {
                handleInviteCandidate(confirmationModal.candidate.application_id, `${confirmationModal.candidate.first_name} ${confirmationModal.candidate.last_name}`);
              }
              setConfirmationModal({ show: false, candidate: null, action: null });
            }}
          >
            <i className="bi bi-send me-2"></i>
            {confirmationModal.action === 'invite' ? 'Envoyer l\'invitation' : 'Renvoyer l\'invitation'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default JobApplicationsList;
