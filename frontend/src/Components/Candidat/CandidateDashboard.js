import React, { useState, useEffect } from 'react';
import { fetchAllJobOffers } from './jobOffersApi';
import { Link } from 'react-router-dom';
import './CandidateStyles.css';

/**
 * Tableau de bord du candidat pour voir toutes les offres d'emploi disponibles
 */
const CandidateDashboard = () => {
  const [jobOffers, setJobOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Récupérer les offres d'emploi au chargement du composant
    const loadJobOffers = async () => {
      try {
        setLoading(true);
        const offers = await fetchAllJobOffers();
        setJobOffers(offers);
        setError(null);
      } catch (err) {
        setError('Erreur lors du chargement des offres d\'emploi. Veuillez réessayer plus tard.');
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    loadJobOffers();
  }, []);

  if (loading) {
    return (
      <div className="candidate-dashboard loading">
        <h2>Chargement des offres d'emploi...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="candidate-dashboard error">
        <h2>Erreur</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Réessayer</button>
      </div>
    );
  }

  return (
    <div className="candidate-dashboard">
      <h2>Offres d'emploi disponibles</h2>
      
      {jobOffers.length === 0 ? (
        <p>Aucune offre d'emploi n'est disponible actuellement.</p>
      ) : (
        <div className="job-offers-list">
          {jobOffers.map((offer) => (
            <div key={offer.id} className="job-offer-card">
              <h3>{offer.title}</h3>
              <p className="location"><strong>Lieu:</strong> {offer.location}</p>
              <p className="description">{offer.description.length > 100 
                ? `${offer.description.substring(0, 100)}...` 
                : offer.description}
              </p>
              <div className="job-offer-footer">
                <span className="date">Publié le: {new Date(offer.created_at).toLocaleDateString()}</span>
                <Link to={`/job-offers/${offer.id}`} className="view-details-button">
                  Voir les détails
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CandidateDashboard;
