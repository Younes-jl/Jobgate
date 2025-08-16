import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { formatDate } from '../../utils/dateUtils';

const MyApplicationsList = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMyApplications = async () => {
      try {
        const response = await api.get('/interviews/applications/my/');
        setApplications(response.data);
      } catch (err) {
        console.error('Error fetching applications:', err);
        setError('Impossible de récupérer vos candidatures. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    };

    fetchMyApplications();
  }, []);

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
    return <div>Chargement de vos candidatures...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (applications.length === 0) {
    return (
      <Card>
        <Card.Body>
          <Card.Title>Mes candidatures</Card.Title>
          <p>Vous n'avez pas encore postulé à des offres d'emploi.</p>
          <Link to="/jobs">
            <Button variant="primary">Voir les offres disponibles</Button>
          </Link>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Body>
        <Card.Title>Mes candidatures</Card.Title>
        <Table responsive striped hover>
          <thead>
            <tr>
              <th>Poste</th>
              <th>Entreprise</th>
              <th>Date de candidature</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
              <tr key={application.id}>
                <td>{application.job_offer.title}</td>
                <td>{application.job_offer.company}</td>
                <td>{formatDate(application.created_at)}</td>
                <td>{getStatusBadge(application.status)}</td>
                <td>
                  <Link to={`/applications/${application.id}`}>
                    <Button variant="outline-primary" size="sm">Détails</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
};

export default MyApplicationsList;
