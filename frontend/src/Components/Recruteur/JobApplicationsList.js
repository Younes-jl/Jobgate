import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Badge, Button, Form, Row, Col } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import './RecruiterStyles.css';

const JobApplicationsList = ({ jobOfferId }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const { id } = useParams(); // Pour le cas où l'ID est passé via l'URL

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
      const confirmInvitation = window.confirm(
        `Êtes-vous sûr de vouloir inviter ${candidateName} à l'entretien vidéo différé ?`
      );
      if (!confirmInvitation) return;

      // Créer/récupérer un lien unique côté backend
      const { data } = await api.post(`/interviews/campaign-links/`, {
        application_id: applicationId,
      });

      // Envoyer l'invitation par email (backend enverra au candidat)
      try {
        await api.post(`/interviews/campaign-links/${data.id}/send_invite/`);
      } catch (mailErr) {
        console.error('Erreur lors de l\'envoi de l\'email:', mailErr);
        // On continue quand même, le lien est généré et copié.
      }

      // Passer la candidature en "under_review" après l'invitation
      await handleUpdateStatus(applicationId, 'under_review');

      // Afficher le lien de démarrage et proposer de copier
  const msg = `Invitation générée et envoyée par email à ${candidateName}.
Lien: ${data.start_url}
Expire le: ${new Date(data.expires_at).toLocaleString('fr-FR')}`;
      if (navigator.clipboard?.writeText) {
        try { await navigator.clipboard.writeText(data.start_url); } catch { /* noop */ }
      }
      alert(msg + "\n(Le lien a été copié dans le presse-papiers si possible.)");
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

  // Affichage visuel du statut d'invitation
  const getInvitationStatus = (status) => {
    switch (status) {
      case 'pending':
        return (
          <div className="invitation-status">
            <i className="bi bi-clock text-warning"></i>
            <span className="text-muted ms-1">Non invité</span>
          </div>
        );
      case 'under_review':
        return (
          <div className="invitation-status">
            <i className="bi bi-send-check text-success"></i>
            <span className="text-success ms-1">Invité</span>
          </div>
        );
      case 'accepted':
        return (
          <div className="invitation-status">
            <i className="bi bi-check-circle text-success"></i>
            <span className="text-success ms-1">Entretien terminé</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="invitation-status">
            <i className="bi bi-x-circle text-danger"></i>
            <span className="text-danger ms-1">Rejeté</span>
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
        return <Badge bg="warning">En attente</Badge>;
      case 'under_review':
        return <Badge bg="info">En cours d'examen</Badge>;
      case 'accepted':
        return <Badge bg="success">Acceptée</Badge>;
      case 'rejected':
        return <Badge bg="danger">Refusée</Badge>;
      default:
        return <Badge bg="secondary">Inconnue</Badge>;
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
                <option value="pending">En attente</option>
                <option value="under_review">En cours d'examen</option>
                <option value="accepted">Acceptée</option>
                <option value="rejected">Refusée</option>
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
                <th className="py-3">Date de candidature</th>
                <th className="py-3">Statut</th>
                <th className="py-3">Invitation</th>
                <th className="py-3 actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.map((application) => (
                <tr key={application.id}>
                  <td>
                    <div className="candidate-info">
                      <div className="candidate-avatar">
                        <i className="bi bi-person-circle text-primary" style={{ fontSize: '1.8rem' }}></i>
                      </div>
                      <div className="ms-2">
                        <div className="fw-bold">
                          {application.candidate && (
                            application.candidate.username || 
                            (application.candidate.email && application.candidate.email.split('@')[0]) || 
                            "Candidat"
                          )}
                        </div>
                        <div className="small text-muted">
                          {application.candidate && application.candidate.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{formatDate(application.created_at)}</td>
                  <td>{getStatusBadge(application.status)}</td>
                  <td>{getInvitationStatus(application.status)}</td>
                  <td>
                    <div className="actions-row">
                      {/* 1) Ligne des boutons d'action */}
                      <div className="actions-buttons">
                        <Button variant="outline-primary" size="sm" disabled>
                          <i className="bi bi-eye me-1"></i> Détails
                        </Button>

                        {application.status === 'pending' && (
                          <Button
                            className="btn-invite"
                            size="sm"
                            onClick={() => handleInviteCandidate(
                              application.id,
                              application.candidate?.username || 
                              (application.candidate?.email && application.candidate.email.split('@')[0]) || 
                              'ce candidat'
                            )}
                          >
                            <i className="bi bi-send me-1"></i> Inviter
                          </Button>
                        )}

                        {application.status === 'under_review' && (
                          <Button
                            className="btn-reinvite"
                            size="sm"
                            onClick={() => handleInviteCandidate(
                              application.id,
                              application.candidate?.username || 
                              (application.candidate?.email && application.candidate.email.split('@')[0]) || 
                              'ce candidat'
                            )}
                          >
                            <i className="bi bi-arrow-clockwise me-1"></i> Réinviter
                          </Button>
                        )}
                      </div>

                      {/* 2) Sélecteur du statut */}
                      <div>
                        <Form.Select
                          size="sm"
                          className="actions-status-select shadow-sm"
                          value={application.status}
                          onChange={(e) => handleUpdateStatus(application.id, e.target.value)}
                        >
                          <option value="pending">En attente</option>
                          <option value="under_review">En cours d'examen</option>
                          <option value="accepted">Accepter</option>
                          <option value="rejected">Rejeter</option>
                        </Form.Select>
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
    </Card>
  );
};

export default JobApplicationsList;
