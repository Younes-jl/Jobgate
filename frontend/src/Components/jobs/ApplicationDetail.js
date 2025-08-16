import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Badge, Button, Spinner, Form, Alert, ListGroup, Tab, Nav } from 'react-bootstrap';
import api from '../../services/api';
import { formatDate, timeAgo } from '../../utils/dateUtils';

/**
 * Composant pour afficher les détails d'une candidature spécifique
 */
const ApplicationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [interviewResponses, setInterviewResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [feedback, setFeedback] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    const fetchApplicationDetail = async () => {
      try {
        setLoading(true);
        // Récupérer les détails de la candidature
        const appResponse = await api.get(`/interviews/applications/${id}/`);
        setApplication(appResponse.data);
        setStatus(appResponse.data.status);
        setFeedback(appResponse.data.recruiter_feedback || '');
        
        // Récupérer les éventuelles réponses aux entretiens vidéo
        try {
          const interviewResponse = await api.get(`/interviews/responses/?application_id=${id}`);
          setInterviewResponses(interviewResponse.data);
        } catch (interviewErr) {
          console.error('Error fetching interview responses:', interviewErr);
          // On ne génère pas d'erreur pour l'application entière si cette partie échoue
        }
      } catch (err) {
        console.error('Error fetching application details:', err);
        setError('Impossible de récupérer les détails de cette candidature. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchApplicationDetail();
    }
  }, [id]);

  const handleUpdateApplication = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/interviews/applications/${id}/`, {
        status,
        recruiter_feedback: feedback
      });
      setUpdateSuccess(true);
      
      // Mettre à jour l'application dans l'état local
      setApplication(prev => ({
        ...prev,
        status,
        recruiter_feedback: feedback
      }));
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error updating application:', err);
      setError('Erreur lors de la mise à jour de la candidature.');
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
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Chargement...</span>
        </Spinner>
        <p className="mt-3">Chargement des détails de la candidature...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger my-4">
        <h4>Erreur</h4>
        <p>{error}</p>
        <Button variant="primary" onClick={() => navigate(-1)}>Retour</Button>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="alert alert-warning my-4">
        <h4>Candidature non trouvée</h4>
        <p>Les détails de cette candidature ne sont pas disponibles.</p>
        <Button variant="primary" onClick={() => navigate(-1)}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="application-detail py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Détails de la candidature</h2>
        <Button variant="outline-secondary" onClick={() => navigate(-1)}>
          Retour à la liste
        </Button>
      </div>

      {updateSuccess && (
        <Alert variant="success" className="mb-4">
          La candidature a été mise à jour avec succès.
        </Alert>
      )}

      <Tab.Container id="application-tabs" activeKey={activeTab} onSelect={setActiveTab}>
        <Nav variant="tabs" className="mb-4">
          <Nav.Item>
            <Nav.Link eventKey="general">Informations générales</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="documents">Documents</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="interviews">
              Entretiens vidéo {interviewResponses.length > 0 && <Badge bg="primary">{interviewResponses.length}</Badge>}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="status">Gestion du statut</Nav.Link>
          </Nav.Item>
        </Nav>
        
        <Tab.Content>
          <Tab.Pane eventKey="general">
            <Row>
              <Col md={6}>
                <Card className="mb-4 shadow-sm">
                  <Card.Header as="h5" className="bg-primary text-white">Informations sur le candidat</Card.Header>
                  <Card.Body>
                    <Row>
                      <Col sm={4} className="fw-bold">Nom d'utilisateur:</Col>
                      <Col sm={8}>{application.candidate.username || 'Non renseigné'}</Col>
                    </Row>
                    <hr />
                    <Row>
                      <Col sm={4} className="fw-bold">Email:</Col>
                      <Col sm={8}>{application.candidate.email}</Col>
                    </Row>
                    <hr />
                    <Row>
                      <Col sm={4} className="fw-bold">Téléphone:</Col>
                      <Col sm={8}>{application.candidate.phone_number || 'Non renseigné'}</Col>
                    </Row>
                    <hr />
                    <Row>
                      <Col sm={4} className="fw-bold">Candidature soumise:</Col>
                      <Col sm={8}>
                        <div>{formatDate(application.created_at)}</div>
                        <div className="text-muted small">{timeAgo(application.created_at)}</div>
                      </Col>
                    </Row>
                    <hr />
                    <Row>
                      <Col sm={4} className="fw-bold">Statut actuel:</Col>
                      <Col sm={8}>{getStatusBadge(application.status)}</Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card className="mb-4 shadow-sm">
                  <Card.Header as="h5" className="bg-primary text-white">Offre d'emploi concernée</Card.Header>
                  <Card.Body>
                    <h5>{application.job_offer.title}</h5>
                    <Row className="mt-3">
                      <Col sm={4} className="fw-bold">Lieu:</Col>
                      <Col sm={8}>{application.job_offer.location}</Col>
                    </Row>
                    <hr />
                    <Row>
                      <Col sm={4} className="fw-bold">Type de contrat:</Col>
                      <Col sm={8}>{application.job_offer.contract_type}</Col>
                    </Row>
                    <hr />
                    {application.job_offer.salary && (
                      <>
                        <Row>
                          <Col sm={4} className="fw-bold">Salaire:</Col>
                          <Col sm={8}>{application.job_offer.salary}</Col>
                        </Row>
                        <hr />
                      </>
                    )}
                    <Row>
                      <Col sm={4} className="fw-bold">Publication:</Col>
                      <Col sm={8}>
                        <div>{formatDate(application.job_offer.created_at)}</div>
                        <div className="text-muted small">{timeAgo(application.job_offer.created_at)}</div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab.Pane>

          <Tab.Pane eventKey="documents">
            <Row>
              <Col md={6}>
                <Card className="mb-4 shadow-sm">
                  <Card.Header as="h5" className="bg-info text-white">Lettre de motivation</Card.Header>
                  <Card.Body>
                    {application.cover_letter ? (
                      <div className="p-3 bg-light rounded">
                        {application.cover_letter}
                      </div>
                    ) : (
                      <p className="text-muted">Aucune lettre de motivation fournie</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card className="mb-4 shadow-sm">
                  <Card.Header as="h5" className="bg-info text-white">CV</Card.Header>
                  <Card.Body>
                    {application.resume ? (
                      <div className="d-flex flex-column align-items-center p-4">
                        <i className="bi bi-file-earmark-pdf fs-1 mb-3 text-danger"></i>
                        <p className="mb-3">CV du candidat</p>
                        <a href={application.resume} target="_blank" rel="noopener noreferrer">
                          <Button variant="primary">
                            <i className="bi bi-download me-2"></i>
                            Télécharger le CV
                          </Button>
                        </a>
                      </div>
                    ) : (
                      <p className="text-muted">Aucun CV joint à cette candidature</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab.Pane>

          <Tab.Pane eventKey="interviews">
            <Card className="shadow-sm">
              <Card.Header as="h5" className="bg-success text-white">Entretiens vidéo</Card.Header>
              <Card.Body>
                {interviewResponses.length > 0 ? (
                  <ListGroup variant="flush">
                    {interviewResponses.map((response, index) => (
                      <ListGroup.Item key={response.id} className="py-3">
                        <h5>Question {index + 1}: {response.question.text}</h5>
                        <div className="d-flex align-items-center mt-3">
                          <div className="me-3">
                            <Badge bg="info">Durée: {response.duration} secondes</Badge>
                          </div>
                          <div className="me-3">
                            <Badge bg="secondary">Réponse soumise: {formatDate(response.created_at)}</Badge>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          {response.video_url ? (
                            <div className="ratio ratio-16x9" style={{ maxWidth: '600px' }}>
                              <video src={response.video_url} controls className="rounded shadow">
                                Votre navigateur ne supporte pas la lecture de vidéos.
                              </video>
                            </div>
                          ) : (
                            <Alert variant="warning">
                              L'URL de la vidéo n'est pas disponible.
                            </Alert>
                          )}
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                ) : (
                  <Alert variant="info">
                    Cette candidature ne contient pas d'entretien vidéo.
                  </Alert>
                )}
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="status">
            <Card className="shadow-sm">
              <Card.Header as="h5" className="bg-warning text-dark">Gérer cette candidature</Card.Header>
              <Card.Body>
                <Form onSubmit={handleUpdateApplication}>
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold">Statut de la candidature</Form.Label>
                    <Form.Select 
                      value={status} 
                      onChange={(e) => setStatus(e.target.value)}
                      className="shadow-sm"
                    >
                      <option value="pending">En attente</option>
                      <option value="under_review">En cours d'examen</option>
                      <option value="accepted">Acceptée</option>
                      <option value="rejected">Refusée</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold">Commentaires / Feedback interne</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      rows={4}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Ajoutez vos commentaires ou un feedback pour cette candidature (visible uniquement par les recruteurs)"
                      className="shadow-sm"
                    />
                  </Form.Group>

                  <Button variant="primary" type="submit" className="px-4">
                    <i className="bi bi-check2-circle me-2"></i>
                    Mettre à jour la candidature
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </div>
  );
};

export default ApplicationDetail;
