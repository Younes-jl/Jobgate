import api from '../../services/api';

/**
 * Récupère toutes les offres d'emploi disponibles pour les candidats
 * 
 * @returns {Promise} Une promesse qui résout avec les données des offres d'emploi
 */
export const fetchAllJobOffers = async () => {
  try {
    const response = await api.get('/jobs/all-offers/');
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des offres d\'emploi:', error);
    throw error;
  }
};

/**
 * Récupère les détails d'une offre d'emploi spécifique
 * 
 * @param {string} id - L'ID de l'offre d'emploi à récupérer
 * @returns {Promise} Une promesse qui résout avec les données de l'offre d'emploi
 */
export const fetchJobOfferDetails = async (id) => {
  try {
    const response = await api.get(`/interviews/offers/${id}/`);
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la récupération de l'offre d'emploi ${id}:`, error);
    throw error;
  }
};
