import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Form, 
  Alert, 
  Spinner, 
  Badge, 
  ListGroup,
  Modal,
  Row,
  Col
} from 'react-bootstrap';
import { FaRobot, FaMagic, FaLightbulb, FaChartLine } from 'react-icons/fa';
import api from '../../services/api';

/**
 * Composant d'intégration IA pour la génération automatique de questions d'entrevue
 * Utilise Google Gemini avec fallback sur questions prédéfinies
 */
const AIQuestionGenerator = ({ onQuestionsGenerated, jobOffer = null }) => {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [templates, setTemplates] = useState({});
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // Formulaire de génération
  const [formData, setFormData] = useState({
    job_title: jobOffer?.title || '',
    job_description: jobOffer?.description || '',
    required_skills: jobOffer?.required_skills || [],
    experience_level: 'intermediate',
    question_count: 5,
    difficulty_level: 'medium'
  });

  // Charger les modèles de questions au montage
  useEffect(() => {
    fetchQuestionTemplates();
  }, []);

  // Mettre à jour le formulaire si jobOffer change
  useEffect(() => {
    if (jobOffer) {
      setFormData(prev => ({
        ...prev,
        job_title: jobOffer.title || '',
        job_description: jobOffer.description || '',
        required_skills: jobOffer.required_skills || []
      }));
    }
  }, [jobOffer]);

  const fetchQuestionTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await api.get('/interviews/ai/question-templates/');
      if (response.data.success) {
        setTemplates(response.data.templates);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des modèles:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleGenerateQuestions = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/interviews/ai/generate-questions/', formData);
      
      if (response.data.success) {
        const generatedQuestions = response.data.questions;
        setQuestions(generatedQuestions);
        setSuccess(`${generatedQuestions.length} questions générées avec succès ! 
                   (IA: ${response.data.metadata.ai_provider})`);
        
        // Callback vers le parent si fourni
        if (onQuestionsGenerated) {
          onQuestionsGenerated(generatedQuestions);
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 
                          'Erreur lors de la génération des questions';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeQuestion = async (questionText) => {
    try {
      const response = await api.post('/interviews/ai/analyze-question/', {
        question: questionText
      });
      
      if (response.data.success) {
        const analysis = response.data.analysis;
        alert(`Score de qualité: ${analysis.score}/10\nSuggestions: ${analysis.suggestions?.join(', ') || 'Aucune'}`);
      }
    } catch (error) {
      console.error('Erreur analyse question:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'required_skills') {
      // Gérer la liste des compétences (séparées par virgules)
      setFormData(prev => ({
        ...prev,
        [name]: value.split(',').map(skill => skill.trim()).filter(skill => skill)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const addTemplateQuestions = (category) => {
    const categoryQuestions = templates[category] || [];
    const formattedQuestions = categoryQuestions.map(template => ({
      question: template.question,
      category: template.category,
      difficulty: template.difficulty,
      quality_score: 8.0, // Score par défaut pour les templates
      quality_feedback: ['Question template validée']
    }));
    
    setQuestions(prev => [...prev, ...formattedQuestions]);
    setSuccess(`${formattedQuestions.length} questions ajoutées depuis les modèles "${category}"`);
  };

  return (
    <div className="ai-question-generator">
      <Card className="mb-4 border-primary">
        <Card.Header className="bg-primary text-white d-flex align-items-center">
          <FaRobot className="me-2" />
          <span>Génération IA de Questions d'Entrevue</span>
          <Badge bg="success" className="ms-auto">Google Gemini</Badge>
        </Card.Header>
        
        <Card.Body>
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          {success && <Alert variant="success" className="mb-3">{success}</Alert>}
          
          <Form onSubmit={handleGenerateQuestions}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Titre du poste *</Form.Label>
                  <Form.Control
                    type="text"
                    name="job_title"
                    value={formData.job_title}
                    onChange={handleInputChange}
                    placeholder="Ex: Développeur Full Stack"
                    required
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Compétences requises</Form.Label>
                  <Form.Control
                    type="text"
                    name="required_skills"
                    value={formData.required_skills.join(', ')}
                    onChange={handleInputChange}
                    placeholder="React, Node.js, PostgreSQL"
                  />
                  <Form.Text className="text-muted">
                    Séparez les compétences par des virgules
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Description du poste *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="job_description"
                value={formData.job_description}
                onChange={handleInputChange}
                placeholder="Description détaillée du poste et des responsabilités..."
                required
              />
            </Form.Group>
            
            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Niveau d'expérience</Form.Label>
                  <Form.Select
                    name="experience_level"
                    value={formData.experience_level}
                    onChange={handleInputChange}
                  >
                    <option value="junior">Junior</option>
                    <option value="intermediate">Intermédiaire</option>
                    <option value="senior">Senior</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Difficulté</Form.Label>
                  <Form.Select
                    name="difficulty_level"
                    value={formData.difficulty_level}
                    onChange={handleInputChange}
                  >
                    <option value="easy">Facile</option>
                    <option value="medium">Moyen</option>
                    <option value="hard">Difficile</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre de questions</Form.Label>
                  <Form.Control
                    type="number"
                    name="question_count"
                    min="1"
                    max="20"
                    value={formData.question_count}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
              
              <Col md={3}>
                <div className="d-flex align-items-end h-100">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                    className="w-100 mb-3"
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <FaMagic className="me-2" />
                        Générer
                      </>
                    )}
                  </Button>
                </div>
              </Col>
            </Row>
          </Form>
          
          <div className="d-flex gap-2 mb-3">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setShowModal(true)}
              disabled={loadingTemplates}
            >
              <FaLightbulb className="me-1" />
              Modèles de questions
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Liste des questions générées */}
      {questions.length > 0 && (
        <Card className="mb-4">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <span>Questions générées ({questions.length})</span>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => setQuestions([])}
            >
              Effacer tout
            </Button>
          </Card.Header>
          
          <Card.Body>
            <ListGroup variant="flush">
              {questions.map((question, index) => (
                <ListGroup.Item key={index} className="border-0 px-0">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <p className="mb-2 fw-bold">{question.question}</p>
                      <div className="d-flex gap-2 mb-2">
                        <Badge bg="info">{question.category}</Badge>
                        <Badge bg="secondary">{question.difficulty}</Badge>
                        {question.quality_score && (
                          <Badge bg="success">
                            <FaChartLine className="me-1" />
                            Score: {question.quality_score}/10
                          </Badge>
                        )}
                      </div>
                      {question.quality_feedback && question.quality_feedback.length > 0 && (
                        <small className="text-muted">
                          💡 {question.quality_feedback.join(', ')}
                        </small>
                      )}
                    </div>
                    <div className="ms-3">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleAnalyzeQuestion(question.question)}
                      >
                        Analyser
                      </Button>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card.Body>
        </Card>
      )}

      {/* Modal des modèles de questions */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Modèles de Questions Prédéfinies</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingTemplates ? (
            <div className="text-center p-4">
              <Spinner animation="border" />
              <p className="mt-2">Chargement des modèles...</p>
            </div>
          ) : (
            <div>
              {Object.keys(templates).map(category => (
                <Card key={category} className="mb-3">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold">{category}</span>
                    <div>
                      <Badge bg="info" className="me-2">
                        {templates[category].length} questions
                      </Badge>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => addTemplateQuestions(category)}
                      >
                        Ajouter toutes
                      </Button>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <ListGroup variant="flush">
                      {templates[category].slice(0, 3).map((template, idx) => (
                        <ListGroup.Item key={idx} className="border-0 px-0 py-1">
                          <small className="text-muted">• {template.question}</small>
                        </ListGroup.Item>
                      ))}
                      {templates[category].length > 3 && (
                        <ListGroup.Item className="border-0 px-0 py-1">
                          <small className="text-muted">
                            ... et {templates[category].length - 3} autres
                          </small>
                        </ListGroup.Item>
                      )}
                    </ListGroup>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default AIQuestionGenerator;
