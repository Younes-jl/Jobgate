import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Form, 
  Button, 
  Alert,
  ListGroup,
  Badge,
  Tabs,
  Tab
} from 'react-bootstrap';
import { FaPlus, FaRobot, FaEdit, FaTrash } from 'react-icons/fa';
import AIQuestionGenerator from '../AI/AIQuestionGenerator';
import api from '../../services/api';

/**
 * Composant pour créer une campagne d'entrevue avec intégration IA
 * Utilise AIQuestionGenerator pour l'assistance automatique
 */
const CreateCampaignWithAI = ({ jobOfferId, onCampaignCreated }) => {
  const [jobOffer, setJobOffer] = useState(null);
  const [campaignData, setCampaignData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    questions: []
  });
  const [manualQuestion, setManualQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('ai-generation');

  useEffect(() => {
    if (jobOfferId) {
      fetchJobOffer();
    }
  }, [jobOfferId]);

  const fetchJobOffer = async () => {
    try {
      const response = await api.get(`/interviews/offers/${jobOfferId}/`);
      setJobOffer(response.data);
      
      // Pré-remplir les données de campagne
      setCampaignData(prev => ({
        ...prev,
        title: `Entrevue - ${response.data.title}`,
        description: `Campagne d'entrevue pour le poste de ${response.data.title}`
      }));
    } catch (error) {
      setError('Erreur lors du chargement de l\'offre d\'emploi');
    }
  };

  const handleAIQuestionsGenerated = (aiQuestions) => {
    // Convertir les questions IA au format campagne
    const campaignQuestions = aiQuestions.map((q, index) => ({
      id: `ai-${Date.now()}-${index}`,
      question: q.question,
      category: q.category,
      difficulty: q.difficulty,
      source: 'ai',
      quality_score: q.quality_score
    }));

    setCampaignData(prev => ({
      ...prev,
      questions: [...prev.questions, ...campaignQuestions]
    }));

    setSuccess(`${campaignQuestions.length} questions IA ajoutées à la campagne !`);
  };

  const handleAddManualQuestion = () => {
    if (!manualQuestion.trim()) return;

    const newQuestion = {
      id: `manual-${Date.now()}`,
      question: manualQuestion.trim(),
      category: 'Manuel',
      difficulty: 'medium',
      source: 'manual'
    };

    setCampaignData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));

    setManualQuestion('');
    setSuccess('Question manuelle ajoutée !');
  };

  const handleRemoveQuestion = (questionId) => {
    setCampaignData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    
    if (campaignData.questions.length === 0) {
      setError('Ajoutez au moins une question à la campagne');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const campaignPayload = {
        ...campaignData,
        job_offer: jobOfferId,
        questions: campaignData.questions.map(q => q.question)
      };

      const response = await api.post('/interviews/campaigns/', campaignPayload);
      
      if (response.data) {
        setSuccess('Campagne créée avec succès !');
        if (onCampaignCreated) {
          onCampaignCreated(response.data);
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.error ||
                          'Erreur lors de la création de la campagne';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCampaignData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Container className="mt-4">
      <Row>
        <Col lg={8} className="mx-auto">
          <Card>
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0">
                <FaRobot className="me-2" />
                Création de Campagne avec IA
              </h4>
              {jobOffer && (
                <small>Offre: {jobOffer.title}</small>
              )}
            </Card.Header>
            
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Form onSubmit={handleCreateCampaign}>
                {/* Informations de base de la campagne */}
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Titre de la campagne *</Form.Label>
                      <Form.Control
                        type="text"
                        name="title"
                        value={campaignData.title}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Description</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="description"
                        value={campaignData.description}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date de début</Form.Label>
                      <Form.Control
                        type="date"
                        name="start_date"
                        value={campaignData.start_date}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date de fin</Form.Label>
                      <Form.Control
                        type="date"
                        name="end_date"
                        value={campaignData.end_date}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Onglets pour la gestion des questions */}
                <Tabs
                  activeKey={activeTab}
                  onSelect={(k) => setActiveTab(k)}
                  className="mb-4"
                >
                  <Tab eventKey="ai-generation" title="🤖 Génération IA">
                    <AIQuestionGenerator 
                      jobOffer={jobOffer}
                      onQuestionsGenerated={handleAIQuestionsGenerated}
                    />
                  </Tab>
                  
                  <Tab eventKey="manual-questions" title="✏️ Questions manuelles">
                    <Card>
                      <Card.Header>Ajouter une question manuellement</Card.Header>
                      <Card.Body>
                        <Form.Group className="mb-3">
                          <Form.Label>Question</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            value={manualQuestion}
                            onChange={(e) => setManualQuestion(e.target.value)}
                            placeholder="Tapez votre question ici..."
                          />
                        </Form.Group>
                        <Button
                          variant="outline-primary"
                          onClick={handleAddManualQuestion}
                          disabled={!manualQuestion.trim()}
                        >
                          <FaPlus className="me-2" />
                          Ajouter la question
                        </Button>
                      </Card.Body>
                    </Card>
                  </Tab>
                </Tabs>

                {/* Liste des questions de la campagne */}
                {campaignData.questions.length > 0 && (
                  <Card className="mb-4">
                    <Card.Header className="d-flex justify-content-between align-items-center">
                      <span>Questions de la campagne ({campaignData.questions.length})</span>
                      <Badge bg="info">
                        IA: {campaignData.questions.filter(q => q.source === 'ai').length} | 
                        Manuel: {campaignData.questions.filter(q => q.source === 'manual').length}
                      </Badge>
                    </Card.Header>
                    <Card.Body>
                      <ListGroup variant="flush">
                        {campaignData.questions.map((question, index) => (
                          <ListGroup.Item key={question.id} className="border-0 px-0">
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="flex-grow-1">
                                <div className="d-flex align-items-center mb-2">
                                  <span className="fw-bold me-2">Q{index + 1}.</span>
                                  {question.source === 'ai' && (
                                    <Badge bg="primary" className="me-2">
                                      <FaRobot className="me-1" />
                                      IA
                                    </Badge>
                                  )}
                                  <Badge bg="secondary" className="me-2">{question.category}</Badge>
                                  <Badge bg="info">{question.difficulty}</Badge>
                                  {question.quality_score && (
                                    <Badge bg="success" className="ms-2">
                                      Score: {question.quality_score}/10
                                    </Badge>
                                  )}
                                </div>
                                <p className="mb-0">{question.question}</p>
                              </div>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleRemoveQuestion(question.id)}
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    </Card.Body>
                  </Card>
                )}

                {/* Boutons d'action */}
                <div className="d-flex justify-content-end gap-2">
                  <Button variant="secondary" type="button">
                    Annuler
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={loading || campaignData.questions.length === 0}
                  >
                    {loading ? 'Création...' : `Créer la campagne (${campaignData.questions.length} questions)`}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CreateCampaignWithAI;
