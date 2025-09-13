import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Accordion, Button, Badge, Spinner } from 'react-bootstrap';

/**
 * Composant OffresAvecCandidatures
 * 
 * Ce composant affiche un aperçu des offres qui ont reçu des candidatures
 * et permet au recruteur de les consulter sans aller jusqu'au détail individuel
 * de chaque candidature.
 */
const OffresAvecCandidatures = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applicationCounts, setApplicationCounts] = useState({});

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setLoading(true);
        // Récupérer les offres du recruteur
        const offersResponse = await api.get('/jobs/dashboard/');
        setOffers(offersResponse.data);

        // Récupérer le nombre de candidatures pour chaque offre
        const counts = {};
        for (const offer of offersResponse.data) {
          try {
            const applicationsResponse = await api.get(`/interviews/applications/job/?job_offer_id=${offer.id}`);
            const applications = applicationsResponse.data;
            counts[offer.id] = {
              total: applications.length,
              pending: applications.filter(app => app.status === 'pending').length,
              accepted: applications.filter(app => app.status === 'accepted').length,
              rejected: applications.filter(app => app.status === 'rejected').length
            };
          } catch (err) {
            console.error(`Erreur lors de la récupération des candidatures pour l'offre ${offer.id}:`, err);
            counts[offer.id] = { total: 0, pending: 0, accepted: 0, rejected: 0 };
          }
        }
        setApplicationCounts(counts);
      } catch (err) {
        console.error('Erreur lors de la récupération des offres:', err);
        setError("Impossible de récupérer vos offres. Veuillez réessayer plus tard.");
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, []);

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Chargement...</span>
        </Spinner>
        <p className="mt-3">Chargement des offres et des candidatures...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger my-4">
        <h4>Erreur</h4>
        <p>{error}</p>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="text-center my-5">
        <div className="alert alert-info">
          <h4>Aucune offre d'emploi trouvée</h4>
          <p>Vous n'avez pas encore créé d'offres d'emploi.</p>
          <Link to="/create-offer">
            <Button variant="primary">Créer une offre</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="offres-avec-candidatures">
      <h2 className="mb-4">Offres avec candidatures</h2>
      
      <div className="applications-overview">
        {offers.length > 0 ? (
          <Accordion defaultActiveKey="0" alwaysOpen={false} className="shadow-sm">
            {offers.map((offer, index) => (
              <Accordion.Item eventKey={index.toString()} key={offer.id} className="border-0 mb-3">
                <Accordion.Header>
                  <div className="d-flex justify-content-between align-items-center w-100 me-3">
                    <div>
                      <strong className="fs-5">{offer.title}</strong> 
                      <span className="text-muted ms-2">- {offer.location}</span>
                    </div>
                    <div className="d-flex gap-2">
                      <Badge bg="secondary" className="py-2 px-3">
                        Total: {applicationCounts[offer.id]?.total || 0}
                      </Badge>
                      {applicationCounts[offer.id]?.pending > 0 && (
                        <Badge bg="warning" className="py-2 px-3">
                          En cours: {applicationCounts[offer.id]?.pending || 0}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Accordion.Header>
                <Accordion.Body className="bg-light">
                  <div className="d-flex justify-content-between align-items-center p-3">
                    {applicationCounts[offer.id]?.total > 0 ? (
                      <div>
                        <p className="mb-0">
                          <span className="badge bg-secondary mx-1">Total: {applicationCounts[offer.id]?.total || 0}</span>
                          {applicationCounts[offer.id]?.pending > 0 && (
                            <span className="badge bg-warning mx-1">En cours: {applicationCounts[offer.id]?.pending}</span>
                          )}
                          {applicationCounts[offer.id]?.accepted > 0 && (
                            <span className="badge bg-success mx-1">Acceptées: {applicationCounts[offer.id]?.accepted}</span>
                          )}
                          {applicationCounts[offer.id]?.rejected > 0 && (
                            <span className="badge bg-danger mx-1">Refusées: {applicationCounts[offer.id]?.rejected}</span>
                          )}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted mb-0">Aucune candidature pour cette offre</p>
                    )}
                    <Link to={`/offers/${offer.id}`} className="btn btn-outline-primary btn-sm">
                      Voir les détails
                    </Link>
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        ) : (
          <div className="text-center my-5">
            <div className="alert alert-info p-4">
              <h4>Aucune offre d'emploi trouvée</h4>
              <p className="mb-3">Vous n'avez pas encore créé d'offres d'emploi.</p>
              <Link to="/create-offer">
                <Button variant="primary">Créer une offre</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OffresAvecCandidatures;
