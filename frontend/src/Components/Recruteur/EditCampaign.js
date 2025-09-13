import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Badge, Accordion, Modal } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';

const EditCampaign = () => {
  const { id } = useParams(); // ID de la campagne
  const navigate = useNavigate();
  
  const [campaign, setCampaign] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // État pour la nouvelle question
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    time_limit: 60,
    question_type: 'generale'
  });
  
  // État pour la question en cours d'édition
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);

  const fetchCampaignData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Récupérer les détails de la campagne
      const campaignResponse = await api.get(`/interviews/campaigns/${id}/`);
      console.log('Données de la campagne reçues:', campaignResponse.data);
      console.log('ID de l\'offre associée:', campaignResponse.data.job_offer);
      setCampaign(campaignResponse.data);
      
      // Récupérer les questions de la campagne - Essayer différentes méthodes
      console.log('Récupération des questions pour la campagne:', id);
      
      // Méthode 1: Endpoint spécifique questions
      try {
        const questionsResponse = await api.get(`/interviews/campaigns/${id}/questions/`);
        console.log('Questions via endpoint questions:', questionsResponse.data);
        if (questionsResponse.data && questionsResponse.data.length > 0) {
          setQuestions(questionsResponse.data);
        } else {
          // Méthode 2: Récupérer toutes les questions et filtrer
          console.log('Tentative de récupération via endpoint questions général...');
          const allQuestionsResponse = await api.get('/interviews/questions/');
          console.log('Toutes les questions:', allQuestionsResponse.data);
          
          // Filtrer les questions par campagne
          const campaignQuestions = allQuestionsResponse.data.filter(q => q.campaign === parseInt(id));
          console.log('Questions filtrées pour cette campagne:', campaignQuestions);
          setQuestions(campaignQuestions);
        }
      } catch (questionsError) {
        console.error('Erreur lors de la récupération des questions:', questionsError);
        // Méthode 3: Utiliser les questions depuis la campagne si disponibles
        if (campaignResponse.data.questions) {
          console.log('Utilisation des questions depuis la campagne:', campaignResponse.data.questions);
          setQuestions(campaignResponse.data.questions);
        } else {
          setQuestions([]);
        }
      }
      
      setError(null);
    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      setError('Impossible de charger les données de la campagne.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchCampaignData();
    }
  }, [id, fetchCampaignData]);

  const handleCampaignChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCampaign(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveCampaign = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const campaignData = {
        title: campaign.title,
        description: campaign.description,
        active: campaign.active
      };
      
      console.log('Données envoyées:', campaignData);
      console.log('URL appelée:', `/interviews/campaigns/${id}/`);
      
      const response = await api.patch(`/interviews/campaigns/${id}/`, campaignData);
      console.log('Réponse reçue:', response.data);
      
      setSuccess('Campagne mise à jour avec succès!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      console.error('Status:', err.response?.status);
      console.error('Détails de l\'erreur:', err.response?.data);
      console.error('Headers:', err.response?.headers);
      
      let errorMessage = 'Erreur lors de la sauvegarde de la campagne.';
      
      if (err.response?.status === 404) {
        errorMessage = 'Campagne introuvable. Vérifiez que la campagne existe.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Vous n\'avez pas les permissions pour modifier cette campagne.';
      } else if (err.response?.status === 400) {
        const details = err.response?.data;
        if (typeof details === 'object') {
          const fieldErrors = Object.entries(details).map(([field, errors]) => 
            `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`
          ).join('; ');
          errorMessage = `Erreur de validation: ${fieldErrors}`;
        } else {
          errorMessage = err.response?.data?.detail || 
                        err.response?.data?.error || 
                        err.response?.data?.message ||
                        'Données invalides.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.text.trim()) {
      setError('Le texte de la question ne peut pas être vide.');
      return;
    }
    
    try {
      const questionData = {
        ...newQuestion,
        campaign: id
      };
      
      const response = await api.post('/interviews/questions/', questionData);
      setQuestions(prev => [...prev, response.data]);
      
      setNewQuestion({
        text: '',
        time_limit: 60,
        question_type: 'generale'
      });
      
      setSuccess('Question ajoutée avec succès!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Erreur lors de l\'ajout:', err);
      setError('Erreur lors de l\'ajout de la question.');
    }
  };

  const handleUpdateQuestion = async (questionId, updatedData) => {
    try {
      const response = await api.put(`/interviews/questions/${questionId}/`, updatedData);
      setQuestions(prev => prev.map(q => q.id === questionId ? response.data : q));
      setEditingQuestion(null);
      setSuccess('Question mise à jour avec succès!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      setError('Erreur lors de la mise à jour de la question.');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    try {
      await api.delete(`/interviews/questions/${questionId}/`);
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      setShowDeleteModal(null);
      setSuccess('Question supprimée avec succès!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError('Erreur lors de la suppression de la question.');
    }
  };

  const getQuestionTypeColor = (type) => {
    switch (type) {
      case 'technique': return 'primary';
      case 'comportementale': return 'info';
      case 'generale': return 'secondary';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <h4 className="mt-3 fw-light">Chargement de la campagne...</h4>
        </div>
      </Container>
    );
  }

  if (error && !campaign) {
    return (
      <Container className="py-5">
        <Alert variant="danger" className="text-center">
          <Alert.Heading>Erreur de chargement</Alert.Heading>
          <p>{error}</p>
          <Button variant="primary" onClick={() => navigate(-1)}>
            Retour
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* En-tête */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <Button 
                variant="outline-secondary" 
                onClick={() => navigate(-1)}
                className="me-3 rounded-pill"
              >
                <i className="bi bi-arrow-left me-1"></i>
                Retour
              </Button>
              <div>
                <h1 className="h3 mb-0 fw-bold text-primary">Modifier la Campagne</h1>
                <p className="text-muted mb-0">{campaign?.title}</p>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Messages d'état */}
      {success && (
        <Row className="mb-3">
          <Col>
            <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
              <i className="bi bi-check-circle me-2"></i>
              {success}
            </Alert>
          </Col>
        </Row>
      )}

      {error && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      <Row>
        {/* Informations de la campagne */}
        <Col lg={6} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Informations de la Campagne
              </h5>
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Titre *</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={campaign?.title || ''}
                    onChange={handleCampaignChange}
                    placeholder="Titre de la campagne"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Description *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={campaign?.description || ''}
                    onChange={handleCampaignChange}
                    placeholder="Description de la campagne"
                  />
                </Form.Group>


                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    name="active"
                    checked={campaign?.active || false}
                    onChange={handleCampaignChange}
                    label="Campagne active"
                  />
                </Form.Group>

                <Button 
                  variant="primary" 
                  onClick={handleSaveCampaign}
                  disabled={saving}
                  className="w-100"
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2 me-2"></i>
                      Sauvegarder les modifications
                    </>
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* Ajouter une nouvelle question */}
        <Col lg={6} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0">
                <i className="bi bi-plus-circle me-2"></i>
                Ajouter une Question
              </h5>
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Question *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={newQuestion.text}
                    onChange={(e) => setNewQuestion({...newQuestion, text: e.target.value})}
                    placeholder="Tapez votre question ici..."
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Type de question</Form.Label>
                      <Form.Select
                        value={newQuestion.question_type}
                        onChange={(e) => setNewQuestion({...newQuestion, question_type: e.target.value})}
                      >
                        <option value="generale">Générale</option>
                        <option value="technique">Technique</option>
                        <option value="comportementale">Comportementale</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Temps limite (secondes)</Form.Label>
                      <Form.Control
                        type="number"
                        min="30"
                        max="300"
                        value={newQuestion.time_limit}
                        onChange={(e) => setNewQuestion({...newQuestion, time_limit: parseInt(e.target.value)})}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Button 
                  variant="success" 
                  onClick={handleAddQuestion}
                  className="w-100"
                  disabled={!newQuestion.text.trim()}
                >
                  <i className="bi bi-plus me-2"></i>
                  Ajouter la Question
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Liste des questions */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-warning text-dark">
              <h5 className="mb-0">
                <i className="bi bi-question-circle me-2"></i>
                Questions de la Campagne ({questions.length})
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              {questions.length > 0 ? (
                <Accordion flush>
                  {questions.map((question, index) => (
                    <Accordion.Item eventKey={index.toString()} key={question.id}>
                      <Accordion.Header>
                        <div className="d-flex align-items-center justify-content-between w-100 me-3">
                          <div>
                            <span className="fw-bold">Question {index + 1}</span>
                            <Badge 
                              bg={getQuestionTypeColor(question.question_type)} 
                              className="ms-2"
                            >
                              {question.question_type || 'Générale'}
                            </Badge>
                          </div>
                          <div className="text-muted small">
                            <i className="bi bi-clock me-1"></i>
                            {question.time_limit}s
                          </div>
                        </div>
                      </Accordion.Header>
                      <Accordion.Body>
                        {editingQuestion === question.id ? (
                          <EditQuestionForm 
                            question={question}
                            onSave={(data) => handleUpdateQuestion(question.id, data)}
                            onCancel={() => setEditingQuestion(null)}
                          />
                        ) : (
                          <div>
                            <p className="mb-3">{question.text}</p>
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="text-muted small">
                                Créée le: {formatDate(question.created_at)}
                              </div>
                              <div>
                                <Button 
                                  variant="outline-primary" 
                                  size="sm"
                                  onClick={() => setEditingQuestion(question.id)}
                                  className="me-2"
                                >
                                  <i className="bi bi-pencil"></i>
                                </Button>
                                <Button 
                                  variant="outline-danger" 
                                  size="sm"
                                  onClick={() => setShowDeleteModal(question.id)}
                                >
                                  <i className="bi bi-trash"></i>
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Accordion.Body>
                    </Accordion.Item>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-5">
                  <i className="bi bi-question-circle text-muted mb-3" style={{ fontSize: '3rem' }}></i>
                  <h6 className="text-muted">Aucune question</h6>
                  <p className="text-muted mb-0">Ajoutez votre première question ci-dessus.</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal de confirmation de suppression */}
      <Modal show={showDeleteModal !== null} onHide={() => setShowDeleteModal(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmer la suppression</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Êtes-vous sûr de vouloir supprimer cette question ? Cette action est irréversible.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(null)}>
            Annuler
          </Button>
          <Button 
            variant="danger" 
            onClick={() => handleDeleteQuestion(showDeleteModal)}
          >
            Supprimer
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

// Composant pour éditer une question
const EditQuestionForm = ({ question, onSave, onCancel }) => {
  const [editData, setEditData] = useState({
    text: question.text,
    time_limit: question.time_limit,
    question_type: question.question_type || 'generale'
  });

  const handleSave = () => {
    if (!editData.text.trim()) return;
    onSave(editData);
  };

  return (
    <div>
      <Form.Group className="mb-3">
        <Form.Label>Question</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          value={editData.text}
          onChange={(e) => setEditData({...editData, text: e.target.value})}
        />
      </Form.Group>
      
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Type</Form.Label>
            <Form.Select
              value={editData.question_type}
              onChange={(e) => setEditData({...editData, question_type: e.target.value})}
            >
              <option value="generale">Générale</option>
              <option value="technique">Technique</option>
              <option value="comportementale">Comportementale</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Temps limite (secondes)</Form.Label>
            <Form.Control
              type="number"
              min="30"
              max="300"
              value={editData.time_limit}
              onChange={(e) => setEditData({...editData, time_limit: parseInt(e.target.value)})}
            />
          </Form.Group>
        </Col>
      </Row>
      
      <div className="d-flex gap-2">
        <Button variant="success" onClick={handleSave} disabled={!editData.text.trim()}>
          <i className="bi bi-check2 me-1"></i>
          Sauvegarder
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  );
};

export default EditCampaign;
