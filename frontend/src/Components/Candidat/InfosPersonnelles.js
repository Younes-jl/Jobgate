import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import api from '../../services/api';
import './CandidateStyles.css';

const InfosPersonnelles = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    // Informations utilisateur de base
    first_name: '',
    last_name: '',
    email: '',
    // Informations du profil étendu
    phone: '',
    date_of_birth: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'Maroc',
    current_position: '',
    experience_years: '',
    skills: '',
    education_level: '',
    linkedin_profile: '',
    github_profile: '',
    bio: ''
  });

  // Charger les données existantes
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // Charger toutes les informations utilisateur depuis CustomUser
        if (user) {
          const userResponse = await api.get(`/users/users/${user.id}/`);
          if (userResponse.data) {
            setFormData({
              first_name: userResponse.data.first_name || '',
              last_name: userResponse.data.last_name || '',
              email: userResponse.data.email || '',
              phone: userResponse.data.phone || '',
              date_of_birth: userResponse.data.date_of_birth || '',
              address: userResponse.data.address || '',
              city: userResponse.data.city || '',
              postal_code: userResponse.data.postal_code || '',
              country: userResponse.data.country || 'Maroc',
              current_position: userResponse.data.current_position || '',
              experience_years: userResponse.data.experience_years || '',
              skills: userResponse.data.skills || '',
              education_level: userResponse.data.education_level || '',
              linkedin_profile: userResponse.data.linkedin_profile || '',
              github_profile: userResponse.data.github_profile || '',
              bio: userResponse.data.bio || ''
            });
          }
        }
        
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setError('Erreur lors du chargement de vos informations');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Sauvegarder toutes les données directement dans CustomUser
      const userData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth || null,
        address: formData.address,
        city: formData.city,
        postal_code: formData.postal_code,
        country: formData.country,
        current_position: formData.current_position,
        experience_years: formData.experience_years,
        skills: formData.skills,
        education_level: formData.education_level,
        linkedin_profile: formData.linkedin_profile,
        github_profile: formData.github_profile,
        bio: formData.bio
      };

      // Mettre à jour toutes les informations utilisateur dans CustomUser
      await api.patch(`/users/users/${user.id}/`, userData);

      setSuccess(true);
      setTimeout(() => {
        navigate('/candidate/details');
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
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Chargement de vos informations...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-person-gear me-2"></i>
                  Informations Personnelles
                </h5>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => navigate('/candidate/details')}
                >
                  <i className="bi bi-arrow-left me-1"></i>
                  Retour
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert variant="success">
                  <i className="bi bi-check-circle me-2"></i>
                  Informations sauvegardées avec succès ! Redirection en cours...
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                {/* Informations de base */}
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
                        onChange={handleChange}
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
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Email *</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Téléphone</Form.Label>
                  <Form.Control
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+212 6 XX XX XX XX"
                  />
                </Form.Group>

                {/* Informations personnelles */}
                <h6 className="text-primary mb-3">
                  <i className="bi bi-house me-2"></i>
                  Informations personnelles
                </h6>

                <Form.Group className="mb-3">
                  <Form.Label>Date de naissance</Form.Label>
                  <Form.Control
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Adresse</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Votre adresse complète"
                  />
                </Form.Group>

                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-3">
                      <Form.Label>Ville</Form.Label>
                      <Form.Control
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="Casablanca, Rabat, etc."
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Code postal</Form.Label>
                      <Form.Control
                        type="text"
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleChange}
                        placeholder="20000"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-4">
                  <Form.Label>Pays</Form.Label>
                  <Form.Select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                  >
                    <option value="Maroc">Maroc</option>
                    <option value="France">France</option>
                    <option value="Canada">Canada</option>
                    <option value="Autre">Autre</option>
                  </Form.Select>
                </Form.Group>

                {/* Informations professionnelles */}
                <h6 className="text-primary mb-3">
                  <i className="bi bi-briefcase me-2"></i>
                  Informations professionnelles
                </h6>

                <Form.Group className="mb-3">
                  <Form.Label>Poste actuel</Form.Label>
                  <Form.Control
                    type="text"
                    name="current_position"
                    value={formData.current_position}
                    onChange={handleChange}
                    placeholder="Développeur Frontend, Designer UI/UX, etc."
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Années d'expérience</Form.Label>
                  <Form.Select
                    name="experience_years"
                    value={formData.experience_years}
                    onChange={handleChange}
                  >
                    <option value="">Sélectionner...</option>
                    <option value="0-1">0-1 an</option>
                    <option value="1-3">1-3 ans</option>
                    <option value="3-5">3-5 ans</option>
                    <option value="5-10">5-10 ans</option>
                    <option value="10+">Plus de 10 ans</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Compétences</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    placeholder="React, JavaScript, Python, etc."
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Niveau d'études</Form.Label>
                  <Form.Select
                    name="education_level"
                    value={formData.education_level}
                    onChange={handleChange}
                  >
                    <option value="">Sélectionner...</option>
                    <option value="BAC">Baccalauréat</option>
                    <option value="BAC+2">BAC+2</option>
                    <option value="BAC+3">BAC+3 (Licence)</option>
                    <option value="BAC+5">BAC+5 (Master)</option>
                    <option value="BAC+8">BAC+8 (Doctorat)</option>
                  </Form.Select>
                </Form.Group>

                {/* Profils professionnels */}
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
                        onChange={handleChange}
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
                        onChange={handleChange}
                        placeholder="https://github.com/votre-profil"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-4">
                  <Form.Label>Présentation personnelle</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Décrivez-vous en quelques lignes..."
                  />
                </Form.Group>

                {/* Boutons d'action */}
                <div className="d-flex justify-content-between">
                  <Button 
                    variant="outline-secondary"
                    onClick={() => navigate('/candidate/details')}
                    disabled={saving}
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
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

export default InfosPersonnelles;
