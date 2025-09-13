/**
 * Liste des offres d'emploi
 * 
 * Ce composant affiche la liste des offres d'emploi créées par un recruteur.
 * Il gère le chargement, les erreurs et le rafraîchissement des données.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../auth/useAuth';

/**
 * Composant JobOfferList
 * 
 * @param {Object} props - Les propriétés du composant
 * @param {number} props.refreshTrigger - Déclencheur de rafraîchissement (incrémenté pour forcer un rechargement)
 */
function JobOfferList({ refreshTrigger = 0 }) {
    const [jobOffers, setJobOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, isTokenChecked } = useAuth(); 

    // Fonction pour récupérer les offres d'emploi du recruteur
    const fetchRecruiterOffers = useCallback(async () => {
        // Si le token n'est pas encore vérifié, on attend
        if (!isTokenChecked) {
            return;
        }
        
        if (!user) {
            setError('Vous devez être connecté pour voir vos offres.');
            setLoading(false);
            return;
        }

        if (user.role !== 'RECRUTEUR') {
            setError('Vous devez être connecté en tant que recruteur pour voir vos offres.');
            setLoading(false);
            return;
        }

        // Création d'un contrôleur d'abandon pour annuler la requête si nécessaire
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // Timeout de 8 secondes

        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                throw new Error('Aucun token d\'authentification disponible');
            }
            
            // Utilisation du signal d'abandon dans la requête
            const response = await api.get('/jobs/dashboard/', {
                signal: controller.signal
            });
            
            setJobOffers(response.data);
            setError(''); // Effacer toute erreur précédente si la requête réussit
        } catch (err) {
            if (err.name === 'AbortError') {
                setError('La requête a pris trop de temps. Veuillez réessayer.');
            } else {
                setError(err.response?.data?.detail || 'Impossible de charger vos offres. Veuillez vérifier votre connexion et vos permissions.');
            }
        } finally {
            clearTimeout(timeoutId);
            setLoading(false);
        }
    }, [user, isTokenChecked]);

    // Effet pour la vérification initiale
    useEffect(() => {
        if (isTokenChecked && user) {
            // Réinitialiser l'état avant de charger
            setLoading(true);
            setError('');
            // Utiliser un léger délai pour éviter les problèmes de rendu
            const timer = setTimeout(() => {
                fetchRecruiterOffers();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isTokenChecked, user, fetchRecruiterOffers]);
    
    // Effet séparé pour le rafraîchissement manuel
    useEffect(() => {
        if (refreshTrigger > 0 && user) {
            fetchRecruiterOffers();
        }
    }, [refreshTrigger, user, fetchRecruiterOffers]);

    if (loading) {
        return <div>Chargement des offres...</div>;
    }

    if (error) {
        return <div style={{ color: 'red' }}>{error}</div>;
    }
    
    return (
        <div className="job-offer-list">
            <div style={{ marginBottom: '20px' }}>
                <h2>Mes Offres d'Emploi</h2>
            </div>
            
            {loading && (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    Chargement des offres...
                </div>
            )}
            
            {!loading && error && (
                <div style={{ color: 'red', marginBottom: '20px' }}>
                    {error}
                </div>
            )}
            
            {!loading && !error && jobOffers && jobOffers.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {jobOffers.map(offer => (
                        <li key={offer.id} style={{ border: '1px solid #eee', padding: '15px', marginBottom: '10px', borderRadius: '5px' }}>
                            <h3 style={{ marginTop: 0 }}>{offer.title}</h3>
                            <p><strong>Lieu :</strong> {offer.location}</p>
                            <p><strong>Créée le :</strong> {new Date(offer.created_at).toLocaleDateString()}</p>
                            <Link to={`/offers/${offer.id}/details`}>Voir les détails complets</Link>
                        </li>
                    ))}
                </ul>
            ) : (
                !loading && !error && (
                    <div>Vous n'avez pas encore créé d'offre.</div>
                )
            )}
        </div>
    );
}

export default JobOfferList;