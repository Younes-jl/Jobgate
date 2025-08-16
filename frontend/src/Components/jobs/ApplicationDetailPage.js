import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Badge, Button, Alert } from 'react-bootstrap';
import api from '../../services/api';
import { useAuth } from '../auth/useAuth';
import { formatDate } from '../../utils/dateUtils';

const ApplicationDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchApplicationDetails = async () => {
      try {
        const response = await api.get(`/api/interviews/applications/${id}/`);
        setApplication(response.data);
      } catch (err) {
        console.error('Error fetching application details:', err);
        setError('Impossible de récupérer les détails de cette candidature.');
      } finally {
        setLoading(false);
      }
    };

    fetchApplicationDetails();
  }, [id]);

  const handleUpdateStatus = async (newStatus) => {
    try {
      const response = await api.patch(`/api/interviews/applications/${id}/`, {
        status: newStatus
      });
      setApplication(response.data);
    } catch (err) {
      console.error('Error updating application status:', err);
      alert('Erreur lors de la mise à jour du statut de la candidature.');
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

  if (loading) {
    return <div>Chargement des détails de la candidature...</div>;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (!application) {
    return <Alert variant="warning">Candidature non trouvée.</Alert>;
  }

  const isRecruiter = user && user.role === 'recruiter';
  const isOwner = user && (user.id === application.job_offer.recruiter || user.id === application.candidate.id);

  // Vérifier si l'utilisateur a le droit de voir cette candidature
  if (!isOwner) {
    return (
      <Alert variant="danger">
        Vous n'avez pas l'autorisation de voir cette candidature.
      </Alert>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="mb-4">Détails de la candidature</h2>
      
      <Card className="mb-4">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Candidature pour: {application.job_offer.title}</h5>
            {getStatusBadge(application.status)}
          </div>
        </Card.Header>
        <Card.Body>
          <Row className="mb-3">
            <Col md={6}>
              <h6>Informations sur l'offre</h6>
              <p><strong>Entreprise:</strong> {application.job_offer.company}</p>
              <p><strong>Lieu:</strong> {application.job_offer.location}</p>
              <p><strong>Type de contrat:</strong> {application.job_offer.contract_type}</p>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => navigate(`/jobs/${application.job_offer.id}`)}
              >
                Voir l'offre complète
              </Button>
            </Col>
            <Col md={6}>
              <h6>Informations sur la candidature</h6>
              <p><strong>Date de candidature:</strong> {formatDate(application.created_at)}</p>
              <p><strong>Statut actuel:</strong> {getStatusBadge(application.status)}</p>
              {isRecruiter && (
                <p><strong>Candidat:</strong> {application.candidate_name || application.candidate.email}</p>
              )}
            </Col>
          </Row>
          
          {isRecruiter && (
            <div className="mt-4">
              <h6>Actions</h6>
              <div className="d-flex gap-2">
                {application.status === 'pending' && (
                  <Button 
                    variant="info" 
                    onClick={() => handleUpdateStatus('under_review')}
                  >
                    Marquer comme "En cours d'examen"
                  </Button>
                )}
                {(application.status === 'pending' || application.status === 'under_review') && (
                  <>
                    <Button 
                      variant="success" 
                      onClick={() => handleUpdateStatus('accepted')}
                    >
                      Accepter la candidature
                    </Button>
                    <Button 
                      variant="danger" 
                      onClick={() => handleUpdateStatus('rejected')}
                    >
                      Rejeter la candidature
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
      
      <Button variant="secondary" onClick={() => navigate(-1)}>Retour</Button>
    </div>
  );
};

export default ApplicationDetailPage;
