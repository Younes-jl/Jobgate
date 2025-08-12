/**
 * Gestion des campagnes d'entretiens
 * 
 * Ce composant permet de créer et gérer des campagnes d'entretiens vidéo
 * pour les offres d'emploi publiées par le recruteur.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../auth/useAuth';

/**
 * Composant InterviewCampaign
 * 
 * Permet aux recruteurs de créer et gérer des campagnes d'entretiens vidéo
 */
function InterviewCampaign() {
    const [campaigns, setCampaigns] = useState([]);
    const [jobOffers, setJobOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    // Formulaire pour la création d'une nouvelle campagne
    const [newCampaign, setNewCampaign] = useState({
        title: '',
        description: '',
        job_offer: '',
        start_date: '',
        end_date: '',
        questions: []
    });
    
    // Nouvelle question temporaire
    const [newQuestion, setNewQuestion] = useState({
        text: '',
        time_limit: 60
    });

    // Récupération des campagnes existantes
    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                setLoading(true);
                const response = await api.get('/interviews/campaigns/');
                setCampaigns(response.data);
                setError('');
            } catch (err) {
                setError('Impossible de charger les campagnes d\'entretiens.');
                console.error('Erreur lors du chargement des campagnes:', err);
            } finally {
                setLoading(false);
            }
        };

        // Récupération des offres d'emploi
        const fetchJobOffers = async () => {
            try {
                const response = await api.get('/jobs/dashboard/');
                setJobOffers(response.data);
            } catch (err) {
                console.error('Erreur lors du chargement des offres:', err);
            }
        };

        fetchCampaigns();
        fetchJobOffers();
    }, []);

    // Gestion du formulaire de création
    const handleCreateFormChange = (e) => {
        const { name, value } = e.target;
        setNewCampaign({
            ...newCampaign,
            [name]: value
        });
    };

    // Gestion du formulaire de nouvelle question
    const handleQuestionChange = (e) => {
        const { name, value } = e.target;
        setNewQuestion({
            ...newQuestion,
            [name]: name === 'time_limit' ? parseInt(value, 10) : value
        });
    };

    // Ajout d'une question à la campagne
    const addQuestion = () => {
        if (newQuestion.text.trim() === '') {
            alert('Le texte de la question ne peut pas être vide.');
            return;
        }
        
        setNewCampaign({
            ...newCampaign,
            questions: [...newCampaign.questions, { ...newQuestion, id: Date.now() }]
        });
        
        // Réinitialiser le formulaire de question
        setNewQuestion({
            text: '',
            time_limit: 60
        });
    };

    // Suppression d'une question
    const removeQuestion = (questionId) => {
        setNewCampaign({
            ...newCampaign,
            questions: newCampaign.questions.filter(q => q.id !== questionId)
        });
    };

    // Soumission du formulaire de création
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (newCampaign.questions.length === 0) {
            alert('Veuillez ajouter au moins une question à la campagne.');
            return;
        }
        
        try {
            setLoading(true);
            
            // Formatage des données pour l'API
            const campaignData = {
                ...newCampaign,
                questions: newCampaign.questions.map(({ id, ...question }) => question)
            };
            
            await api.post('/interviews/campaigns/', campaignData);
            
            // Réinitialiser le formulaire
            setNewCampaign({
                title: '',
                description: '',
                job_offer: '',
                start_date: '',
                end_date: '',
                questions: []
            });
            
            setIsCreating(false);
            
            // Recharger les campagnes
            const response = await api.get('/interviews/campaigns/');
            setCampaigns(response.data);
            
            alert('Campagne d\'entretiens créée avec succès!');
        } catch (err) {
            setError('Erreur lors de la création de la campagne.');
            console.error('Erreur lors de la création de la campagne:', err);
        } finally {
            setLoading(false);
        }
    };

    // Styles communs
    const cardStyle = {
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    };

    const buttonStyle = {
        backgroundColor: '#4CAF50',
        color: 'white',
        padding: '10px 15px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginRight: '10px'
    };

    const secondaryButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#f0f0f0',
        color: '#333'
    };

    return (
        <div className="interview-campaign-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Campagnes d'Entretiens Vidéo</h2>
                <button 
                    style={buttonStyle}
                    onClick={() => setIsCreating(!isCreating)}
                >
                    {isCreating ? 'Annuler' : '+ Nouvelle Campagne'}
                </button>
            </div>

            {error && <div style={{ color: 'red', marginBottom: '20px' }}>{error}</div>}

            {isCreating && (
                <div style={cardStyle}>
                    <h3>Créer une Nouvelle Campagne</h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Titre:</label>
                            <input
                                type="text"
                                name="title"
                                value={newCampaign.title}
                                onChange={handleCreateFormChange}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Description:</label>
                            <textarea
                                name="description"
                                value={newCampaign.description}
                                onChange={handleCreateFormChange}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minHeight: '100px' }}
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Offre d'emploi:</label>
                            <select
                                name="job_offer"
                                value={newCampaign.job_offer}
                                onChange={handleCreateFormChange}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                required
                            >
                                <option value="">Sélectionnez une offre</option>
                                {jobOffers.map(offer => (
                                    <option key={offer.id} value={offer.id}>
                                        {offer.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Date de début:</label>
                                <input
                                    type="date"
                                    name="start_date"
                                    value={newCampaign.start_date}
                                    onChange={handleCreateFormChange}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                    required
                                />
                            </div>

                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Date de fin:</label>
                                <input
                                    type="date"
                                    name="end_date"
                                    value={newCampaign.end_date}
                                    onChange={handleCreateFormChange}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '15px', border: '1px solid #eee', padding: '15px', borderRadius: '4px' }}>
                            <h4>Questions d'entretien</h4>
                            
                            {newCampaign.questions.length > 0 ? (
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {newCampaign.questions.map((question, index) => (
                                        <li key={question.id} style={{ border: '1px solid #eee', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <div>
                                                    <strong>Question {index + 1}:</strong> {question.text}
                                                    <br />
                                                    <small>Temps de réponse: {question.time_limit} secondes</small>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeQuestion(question.id)}
                                                    style={{ backgroundColor: '#ff5252', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 10px' }}
                                                >
                                                    Supprimer
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>Aucune question ajoutée. Veuillez ajouter au moins une question.</p>
                            )}

                            <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '4px', marginTop: '15px' }}>
                                <h5>Ajouter une question</h5>
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px' }}>Texte de la question:</label>
                                    <textarea
                                        name="text"
                                        value={newQuestion.text}
                                        onChange={handleQuestionChange}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px' }}>Temps de réponse (secondes):</label>
                                    <input
                                        type="number"
                                        name="time_limit"
                                        value={newQuestion.time_limit}
                                        onChange={handleQuestionChange}
                                        min="10"
                                        max="300"
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                    />
                                </div>

                                <button 
                                    type="button" 
                                    onClick={addQuestion}
                                    style={secondaryButtonStyle}
                                >
                                    Ajouter cette question
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button 
                                type="button" 
                                onClick={() => setIsCreating(false)}
                                style={{ ...secondaryButtonStyle, marginRight: '10px' }}
                            >
                                Annuler
                            </button>
                            <button 
                                type="submit" 
                                style={buttonStyle}
                                disabled={loading}
                            >
                                {loading ? 'Création en cours...' : 'Créer la campagne'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div>
                <h3>Mes Campagnes</h3>
                {loading && !isCreating ? (
                    <div>Chargement des campagnes...</div>
                ) : campaigns.length > 0 ? (
                    <div>
                        {campaigns.map(campaign => (
                            <div key={campaign.id} style={cardStyle}>
                                <h4>{campaign.title}</h4>
                                <p>{campaign.description}</p>
                                <p>
                                    <strong>Période:</strong> {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                                </p>
                                <p><strong>Offre:</strong> {jobOffers.find(o => o.id === campaign.job_offer)?.title || 'Offre inconnue'}</p>
                                <p><strong>Nombre de questions:</strong> {campaign.questions?.length || 0}</p>
                                <div style={{ marginTop: '15px' }}>
                                    <button 
                                        style={{ ...buttonStyle, backgroundColor: '#2196f3' }}
                                        onClick={() => navigate(`/campaign/${campaign.id}`)}
                                    >
                                        Voir les détails
                                    </button>
                                    <button 
                                        style={{ ...buttonStyle, backgroundColor: '#ff9800' }}
                                        onClick={() => navigate(`/campaign/${campaign.id}/results`)}
                                    >
                                        Résultats
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={cardStyle}>
                        <p>Vous n'avez pas encore créé de campagne d'entretiens.</p>
                        <button 
                            style={buttonStyle}
                            onClick={() => setIsCreating(true)}
                        >
                            Créer ma première campagne
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default InterviewCampaign;
