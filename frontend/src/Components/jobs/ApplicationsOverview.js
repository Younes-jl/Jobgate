import React, { useState, useEffect } from 'react';
import { Accordion, Card, Button, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import JobApplicationsList from './JobApplicationsList';
import { formatDate } from '../../utils/dateUtils';

/**
 * Composant pour afficher les offres d'emploi avec leurs candidatures
 * pour le tableau de bord du recruteur
 */
const ApplicationsOverview = () => {
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
                // Fonction pour récupérer les candidatures avec retry
                const fetchApplicationsWithRetry = async (retryCount = 0, maxRetries = 2) => {
                    try {
                        const applicationsResponse = await api.get(`/interviews/applications/job/?job_offer_id=${offer.id}`);
                        return applicationsResponse.data;
                    } catch (err) {
                        if (retryCount < maxRetries) {
                            console.log(`Tentative ${retryCount + 1} échouée, nouvelle tentative...`);
                            // Attendre 1 seconde avant de réessayer (backoff exponentiel)
                            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                            return fetchApplicationsWithRetry(retryCount + 1, maxRetries);
                        }
                        
                        // Si l'erreur est 404, essayons un autre chemin d'API
                        if (err.response && err.response.status === 404) {
                            try {
                                // Essayer avec une URL alternative
                                const altResponse = await api.get(`/interviews/applications/my/?job_offer_id=${offer.id}`);
                                return altResponse.data;
                            } catch (altErr) {
                                console.error("L'URL alternative a également échoué:", altErr);
                            }
                        }
                        
                        throw err;
                    }
                };                    try {
                        const applications = await fetchApplicationsWithRetry();
                        counts[offer.id] = {
                            total: applications.length,
                            pending: applications.filter(app => app.status === 'pending').length,
                            under_review: applications.filter(app => app.status === 'under_review').length,
                            accepted: applications.filter(app => app.status === 'accepted').length,
                            rejected: applications.filter(app => app.status === 'rejected').length
                        };
                    } catch (err) {
                        console.error(`Erreur lors de la récupération des candidatures pour l'offre ${offer.id}:`, err);
                        counts[offer.id] = { total: 0, pending: 0, under_review: 0, accepted: 0, rejected: 0 };
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
        <div className="applications-overview">
            <div className="mb-4 p-4 bg-light rounded">
                <h2 className="mb-3">Aperçu des candidatures par offre</h2>
                <p className="mb-0">
                    Consultez les candidatures reçues pour chacune de vos offres. Cliquez sur une offre pour voir ses candidatures en détail.
                </p>
            </div>
            
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
                                                En attente: {applicationCounts[offer.id]?.pending || 0}
                                            </Badge>
                                        )}
                                        {applicationCounts[offer.id]?.under_review > 0 && (
                                            <Badge bg="info" className="py-2 px-3">
                                                En examen: {applicationCounts[offer.id]?.under_review || 0}
                                            </Badge>
                                        )}
                                        {applicationCounts[offer.id]?.accepted > 0 && (
                                            <Badge bg="success" className="py-2 px-3">
                                                Acceptées: {applicationCounts[offer.id]?.accepted || 0}
                                            </Badge>
                                        )}
                                        {applicationCounts[offer.id]?.rejected > 0 && (
                                            <Badge bg="danger" className="py-2 px-3">
                                                Refusées: {applicationCounts[offer.id]?.rejected || 0}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </Accordion.Header>
                            <Accordion.Body className="bg-light">
                                <div className="card mb-3">
                                    <div className="card-body">
                                        <h5>Détails de l'offre</h5>
                                        <div className="row">
                                            <div className="col-md-4">
                                                <p><strong>Date de publication:</strong> {formatDate(offer.created_at)}</p>
                                                <p><strong>Type de contrat:</strong> {offer.contract_type}</p>
                                            </div>
                                            <div className="col-md-4">
                                                {offer.salary && <p><strong>Salaire:</strong> {offer.salary}</p>}
                                                {offer.experience && <p><strong>Expérience requise:</strong> {offer.experience}</p>}
                                            </div>
                                            <div className="col-md-4 d-flex align-items-center justify-content-end">
                                                <Link to={`/edit-offer/${offer.id}`} className="btn btn-outline-primary btn-sm me-2">
                                                    Modifier l'offre
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <h5 className="mb-3">Candidatures reçues</h5>
                                <JobApplicationsList jobOfferId={offer.id} />
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
    );
};

export default ApplicationsOverview;
