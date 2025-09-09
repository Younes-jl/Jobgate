import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../auth/useAuth';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './CandidateStyles.css';

const InfosPersonnels = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState(() => {
    // Récupérer les données sauvegardées du localStorage
    const savedData = localStorage.getItem('candidateFormData');
    return savedData ? JSON.parse(savedData) : {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      address: '',
      city: '',
      postal_code: '',
      country: 'Maroc',
      linkedin_profile: '',
      github_profile: '',
      portfolio_url: '',
      experience_years: '',
      current_position: '',
      education_level: '',
      skills: '',
      bio: ''
    };
  });

  // Charger les informations existantes du candidat
  const loadCandidateInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/profile/');
      const profileData = response.data;
      
      setFormData({
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        date_of_birth: profileData.date_of_birth || '',
        address: profileData.address || '',
        city: profileData.city || '',
        postal_code: profileData.postal_code || '',
        country: profileData.country || 'Maroc',
        linkedin_profile: profileData.linkedin_profile || '',
        github_profile: profileData.github_profile || '',
        portfolio_url: profileData.portfolio_url || '',
        experience_years: profileData.experience_years || '',
        current_position: profileData.current_position || '',
        education_level: profileData.education_level || '',
        skills: profileData.skills || '',
        bio: profileData.bio || ''
      });
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      setError('Impossible de charger vos informations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCandidateInfo();
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value
    };
    setFormData(newFormData);
    
    // Sauvegarder automatiquement dans localStorage
    localStorage.setItem('candidateFormData', JSON.stringify(newFormData));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      
      await api.put('/users/profile/', formData);
      
      // Supprimer les données du localStorage après sauvegarde réussie
      localStorage.removeItem('candidateFormData');
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/candidate/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setError('Erreur lors de la sauvegarde de vos informations');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Chargement de vos informations...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="justify-content-center">
        <Col lg={8}>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-person-gear me-2"></i>
                  Informations Personnelles
                </h5>
                <Button 
                  variant="outline-light" 
                  size="sm"
                  onClick={() => navigate('/candidate/dashboard')}
                >
                  <i className="bi bi-arrow-left me-1"></i>
                  Retour
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-4">
              {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert variant="success">
                  <i className="bi bi-check-circle me-2"></i>
                  Vos informations ont été sauvegardées avec succès ! Redirection en cours...
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                {/* Informations de base */}
                <div className="mb-4">
                  <h6 className="text-primary mb-3">
                    <i className="bi bi-person me-2"></i>
                    Informations de base
                  </h6>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Prénom *</Form.Label>
                        <Form.Control
                          type="text"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleInputChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Nom *</Form.Label>
                        <Form.Control
                          type="text"
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleInputChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Email *</Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          disabled
                        />
                        <Form.Text className="text-muted">
                          L'email ne peut pas être modifié
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Téléphone</Form.Label>
                        <Form.Control
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="+212 6 12 34 56 78"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Date de naissance</Form.Label>
                    <Form.Control
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </div>

                {/* Adresse */}
                <div className="mb-4">
                  <h6 className="text-primary mb-3">
                    <i className="bi bi-geo-alt me-2"></i>
                    Adresse
                  </h6>
                  <Form.Group className="mb-3">
                    <Form.Label>Adresse</Form.Label>
                    <Form.Control
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="123 Rue de la Paix"
                    />
                  </Form.Group>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Ville</Form.Label>
                        <Form.Control
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="Casablanca"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Code postal</Form.Label>
                        <Form.Control
                          type="text"
                          name="postal_code"
                          value={formData.postal_code}
                          onChange={handleInputChange}
                          placeholder="20000"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Pays</Form.Label>
                        <Form.Select
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                        >
                          <option value="Maroc">Maroc</option>
                          <option value="France">France</option>
                          <option value="Tunisie">Tunisie</option>
                          <option value="Algérie">Algérie</option>
                          <option value="Autre">Autre</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                {/* Profils professionnels */}
                <div className="mb-4">
                  <h6 className="text-primary mb-3">
                    <i className="bi bi-link-45deg me-2"></i>
                    Profils professionnels
                  </h6>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>LinkedIn</Form.Label>
                        <Form.Control
                          type="url"
                          name="linkedin_profile"
                          value={formData.linkedin_profile}
                          onChange={handleInputChange}
                          placeholder="https://linkedin.com/in/votre-profil"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>GitHub</Form.Label>
                        <Form.Control
                          type="url"
                          name="github_profile"
                          value={formData.github_profile}
                          onChange={handleInputChange}
                          placeholder="https://github.com/votre-profil"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Portfolio / Site web</Form.Label>
                    <Form.Control
                      type="url"
                      name="portfolio_url"
                      value={formData.portfolio_url}
                      onChange={handleInputChange}
                      placeholder="https://votre-portfolio.com"
                    />
                  </Form.Group>
                </div>

                {/* Expérience professionnelle */}
                <div className="mb-4">
                  <h6 className="text-primary mb-3">
                    <i className="bi bi-briefcase me-2"></i>
                    Expérience professionnelle
                  </h6>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Années d'expérience</Form.Label>
                        <Form.Select
                          name="experience_years"
                          value={formData.experience_years}
                          onChange={handleInputChange}
                        >
                          <option value="">Sélectionnez...</option>
                          <option value="0-1">0-1 an</option>
                          <option value="1-3">1-3 ans</option>
                          <option value="3-5">3-5 ans</option>
                          <option value="5-10">5-10 ans</option>
                          <option value="10+">Plus de 10 ans</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Niveau d'éducation</Form.Label>
                        <Form.Select
                          name="education_level"
                          value={formData.education_level}
                          onChange={handleInputChange}
                        >
                          <option value="">Sélectionnez...</option>
                          <option value="BAC">Baccalauréat</option>
                          <option value="BAC+2">BAC+2</option>
                          <option value="BAC+3">BAC+3 (Licence)</option>
                          <option value="BAC+5">BAC+5 (Master)</option>
                          <option value="BAC+8">BAC+8 (Doctorat)</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Poste actuel</Form.Label>
                    <Form.Control
                      type="text"
                      name="current_position"
                      value={formData.current_position}
                      onChange={handleInputChange}
                      placeholder="Développeur Frontend React"
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Compétences</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="skills"
                      value={formData.skills}
                      onChange={handleInputChange}
                      placeholder="React, JavaScript, Node.js, Python, etc."
                    />
                    <Form.Text className="text-muted">
                      Séparez les compétences par des virgules
                    </Form.Text>
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Présentation</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      placeholder="Parlez-nous de vous, vos objectifs professionnels..."
                    />
                  </Form.Group>
                </div>

                {/* Boutons d'action */}
                <div className="d-flex justify-content-between">
                  <Button 
                    variant="outline-secondary"
                    onClick={() => {
                      // Supprimer les données temporaires lors de l'annulation
                      localStorage.removeItem('candidateFormData');
                      navigate('/candidate/dashboard');
                    }}
                    disabled={saving}
                  >
                    <i className="bi bi-x-lg me-1"></i>
                    Annuler
                  </Button>
                  
                  <Button 
                    type="submit" 
                    variant="primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          className="me-2"
                        />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-1"></i>
                        Enregistrer
                      </>
                    )}
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

export default InfosPersonnels;
