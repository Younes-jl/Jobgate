/**
 * Création d'offre avec campagne d'entretien
 * 
 * Ce composant permet de créer une offre d'emploi et
 * de lui associer directement une campagne d'entretiens vidéo.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import api from '../../services/api';

const CreateOfferWithCampaign = () => {
    const navigate = useNavigate();
    // eslint-disable-next-line no-unused-vars
    const { user } = useAuth(); // Désactivé temporairement mais pourrait être utile plus tard
    const [step, setStep] = useState(1); // 1: Offre, 2: Campagne, 3: Confirmation
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // État pour l'offre d'emploi
    const [offer, setOffer] = useState({
        title: '',
        description: '',
        location: '',
        requirements: '',
        salary_range: '',
        contract_type: 'CDI',
        remote_work: false
    });

    // État pour la campagne d'entretien
    const [campaign, setCampaign] = useState({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        active: true,
        questions: []
    });

    // État pour la nouvelle question
    const [newQuestion, setNewQuestion] = useState({
        text: '',
        time_limit: 60
    });

    // Loader IA et erreur IA
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    // Suggestion de questions avec l'IA
    const suggestQuestionsWithAI = async () => {
        setAiLoading(true);
        setAiError('');
        try {
            // Appel à l'API IA
            const payload = {
                job_title: offer.title,
                job_description: offer.description,
                required_skills: offer.requirements ? offer.requirements.split(',').map(s => s.trim()).filter(Boolean) : [],
                experience_level: 'intermediate',
                question_count: 5,
                difficulty_level: 'medium'
            };
            const response = await api.post('/interviews/ai/generate-questions/', payload);
            const questions = response.data.questions || [];
            if (questions.length === 0) {
                setAiError("Aucune question générée par l'IA.");
            } else {
                // Ajout des questions générées à la campagne
                setCampaign(prev => ({
                    ...prev,
                    questions: [
                        ...prev.questions,
                        ...questions.map((q, idx) => ({
                            text: q.question || q.text || '',
                            time_limit: 60,
                            id: Date.now() + idx
                        }))
                    ]
                }));
            }
        } catch (err) {
            setAiError(err.response?.data?.error || "Erreur lors de la génération des questions IA.");
        } finally {
            setAiLoading(false);
        }
    };

    // Styles communs
    const formStyle = {
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    };

    const inputStyle = {
        width: '100%',
        padding: '10px',
        marginBottom: '15px',
        borderRadius: '4px',
        border: '1px solid #ddd'
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

    // Gestion des changements dans le formulaire d'offre
    const handleOfferChange = (e) => {
        const { name, value, type, checked } = e.target;
        setOffer({
            ...offer,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    // Gestion des changements dans le formulaire de campagne
    const handleCampaignChange = (e) => {
        const { name, value } = e.target;
        setCampaign({
            ...campaign,
            [name]: value
        });
    };

    // Gestion des changements dans le formulaire de question
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
        
        setCampaign({
            ...campaign,
            questions: [...campaign.questions, { ...newQuestion, id: Date.now() }]
        });
        
        // Réinitialiser le formulaire de question
        setNewQuestion({
            text: '',
            time_limit: 60
        });
    };

    // Suppression d'une question
    const removeQuestion = (questionId) => {
        setCampaign({
            ...campaign,
            questions: campaign.questions.filter(q => q.id !== questionId)
        });
    };

    // Passer à l'étape suivante
    const goToNextStep = () => {
        // Validation de l'offre
        if (step === 1) {
            if (!offer.title || !offer.description || !offer.location) {
                setError('Veuillez remplir tous les champs obligatoires (titre, description, lieu).');
                return;
            }
            
            setError('');
            
            // Passer à l'étape de création de campagne
            setStep(2);
            
            // Préremplir certains champs de la campagne
            setCampaign(prev => ({
                ...prev,
                title: `Campagne pour ${offer.title}`,
                description: `Entretiens vidéo pour le poste: ${offer.title}`
            }));
        } else if (step === 2) {
            // Validation de la campagne
            if (!campaign.title || !campaign.description || !campaign.start_date || !campaign.end_date) {
                setError('Veuillez remplir tous les champs obligatoires de la campagne.');
                return;
            }
            
            if (campaign.questions.length === 0) {
                setError('Veuillez ajouter au moins une question à la campagne.');
                return;
            }
            
            setError('');
            handleSubmit();
        }
    };

    // Revenir à l'étape précédente
    const goToPreviousStep = () => {
        setStep(step - 1);
        setError('');
    };

    // Soumission du formulaire
    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        
        try {
            console.log("Données de l'offre à envoyer:", offer);
            
            // Création de l'offre d'emploi - ne pas inclure recruiter car il est défini par le backend
            const offerData = {
                title: offer.title,
                description: offer.description,
                location: offer.location,
                salary: offer.salary_range,
                prerequisites: offer.requirements,
                contract_type: offer.contract_type
            };
            
            console.log("Données de l'offre:", offerData);
            
            // Création de l'offre d'emploi
            const offerResponse = await api.post('/jobs/offers/', offerData);
            const createdOfferId = offerResponse.data.id;
            
            setSuccess('Offre d\'emploi créée avec succès!');
            
            // Préparation des données de la campagne
            const campaignData = {
                ...campaign,
                job_offer: createdOfferId,
                questions: campaign.questions.map(({ id, ...rest }) => rest) // Supprimer les IDs temporaires
            };
            
            console.log("Données de la campagne à envoyer:", campaignData);
            
            // Création de la campagne
            await api.post('/interviews/campaigns/', campaignData);
            
            setSuccess('Offre d\'emploi et campagne d\'entretiens créées avec succès!');
            
            // Redirection vers le tableau de bord après une courte pause
            setTimeout(() => {
                navigate('/dashboard', { state: { offerCreated: true } });
            }, 500);
        } catch (err) {
            console.error("Erreur lors de la création:", err);
            setError(err.response?.data?.detail || 'Une erreur est survenue lors de la création. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    // Formulaire d'offre d'emploi (Étape 1)
    const renderOfferForm = () => (
        <div style={formStyle}>
            <h2>Créer une nouvelle offre d'emploi</h2>
            
            {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
            
            <div>
                <label>Titre de l'offre*</label>
                <input
                    type="text"
                    name="title"
                    value={offer.title}
                    onChange={handleOfferChange}
                    style={inputStyle}
                    placeholder="Ex: Développeur Web Full Stack"
                    required
                />
            </div>
            
            <div>
                <label>Description*</label>
                <textarea
                    name="description"
                    value={offer.description}
                    onChange={handleOfferChange}
                    style={{ ...inputStyle, minHeight: '150px' }}
                    placeholder="Décrivez le poste, les responsabilités, etc."
                    required
                />
            </div>
            
            <div>
                <label>Lieu*</label>
                <input
                    type="text"
                    name="location"
                    value={offer.location}
                    onChange={handleOfferChange}
                    style={inputStyle}
                    placeholder="Ex: Paris, France"
                    required
                />
            </div>
            
            <div>
                <label>Prérequis</label>
                <textarea
                    name="requirements"
                    value={offer.requirements}
                    onChange={handleOfferChange}
                    style={{ ...inputStyle, minHeight: '100px' }}
                    placeholder="Compétences et expérience requises"
                />
            </div>
            
            <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                    <label>Fourchette de salaire</label>
                    <input
                        type="text"
                        name="salary_range"
                        value={offer.salary_range}
                        onChange={handleOfferChange}
                        style={inputStyle}
                        placeholder="Ex: 40-50K€"
                    />
                </div>
                
                <div style={{ flex: 1 }}>
                    <label>Type de contrat</label>
                    <select
                        name="contract_type"
                        value={offer.contract_type}
                        onChange={handleOfferChange}
                        style={inputStyle}
                    >
                        <option value="CDI">CDI</option>
                        <option value="CDD">CDD</option>
                        <option value="Stage">Stage</option>
                        <option value="Alternance">Alternance</option>
                        <option value="Freelance">Freelance</option>
                    </select>
                </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                        type="checkbox"
                        name="remote_work"
                        checked={offer.remote_work}
                        onChange={handleOfferChange}
                        style={{ marginRight: '10px' }}
                    />
                    Télétravail possible
                </label>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    style={secondaryButtonStyle}
                >
                    Annuler
                </button>
                <button
                    type="button"
                    onClick={goToNextStep}
                    style={buttonStyle}
                    disabled={loading}
                >
                    {loading ? 'Chargement...' : 'Suivant: Créer la campagne'}
                </button>
            </div>
        </div>
    );

    // Formulaire de campagne d'entretien (Étape 2)
    const renderCampaignForm = () => (
    <div style={formStyle}>
            <h2>Créer une campagne d'entretiens vidéo</h2>
            <p>Associée à l'offre: {offer.title}</p>
            
            {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
            
            <div>
                <label>Titre de la campagne*</label>
                <input
                    type="text"
                    name="title"
                    value={campaign.title}
                    onChange={handleCampaignChange}
                    style={inputStyle}
                    required
                />
            </div>
            
            <div>
                <label>Description*</label>
                <textarea
                    name="description"
                    value={campaign.description}
                    onChange={handleCampaignChange}
                    style={{ ...inputStyle, minHeight: '100px' }}
                    required
                />
            </div>
            
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                    <label>Date de début*</label>
                    <input
                        type="date"
                        name="start_date"
                        value={campaign.start_date}
                        onChange={handleCampaignChange}
                        style={inputStyle}
                        required
                    />
                </div>
                
                <div style={{ flex: 1 }}>
                    <label>Date de fin*</label>
                    <input
                        type="date"
                        name="end_date"
                        value={campaign.end_date}
                        onChange={handleCampaignChange}
                        style={inputStyle}
                        required
                    />
                </div>
            </div>
            
            <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                        type="checkbox"
                        name="active"
                        checked={campaign.active}
                        onChange={(e) => setCampaign({...campaign, active: e.target.checked})}
                        style={{ marginRight: '10px' }}
                    />
                    Activer la campagne immédiatement
                </label>
            </div>
            
            <div style={{ border: '1px solid #eee', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <h3>Questions d'entretien</h3>

                {/* Bouton IA */}
                <div style={{ marginBottom: '15px' }}>
                    <button
                        type="button"
                        onClick={suggestQuestionsWithAI}
                        style={{ ...secondaryButtonStyle, fontWeight: 'bold', fontSize: '16px', background: '#ffd700', color: '#333' }}
                        disabled={aiLoading || !offer.title || !offer.description}
                    >
                        {aiLoading ? 'Génération IA...' : '✨ Suggérer des questions avec l\'IA'}
                    </button>
                    {aiError && <div style={{ color: 'red', marginTop: '8px' }}>{aiError}</div>}
                </div>

                {campaign.questions.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {campaign.questions.map((question, index) => (
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
                    <h4>Ajouter une question</h4>
                    <div>
                        <label>Texte de la question*</label>
                        <textarea
                            name="text"
                            value={newQuestion.text}
                            onChange={handleQuestionChange}
                            style={{ ...inputStyle, minHeight: '80px' }}
                            placeholder="Ex: Présentez-vous et décrivez votre parcours professionnel."
                        />
                    </div>

                    <div>
                        <label>Temps de réponse (secondes)</label>
                        <input
                            type="number"
                            name="time_limit"
                            value={newQuestion.time_limit}
                            onChange={handleQuestionChange}
                            style={inputStyle}
                            min="10"
                            max="300"
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
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                <button
                    type="button"
                    onClick={goToPreviousStep}
                    style={secondaryButtonStyle}
                >
                    Retour à l'offre
                </button>
                <button
                    type="button"
                    onClick={goToNextStep}
                    style={buttonStyle}
                    disabled={loading}
                >
                    {loading ? 'Chargement...' : 'Créer l\'offre et la campagne'}
                </button>
            </div>
        </div>
    );

    // Affichage du composant en fonction de l'étape
    return (
        <div className="create-offer-container" style={{ padding: '30px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
            {success ? (
                <div style={{ ...formStyle, textAlign: 'center' }}>
                    <h2 style={{ color: '#4CAF50' }}>Succès!</h2>
                    <p>{success}</p>
                    <p>Redirection vers le tableau de bord...</p>
                </div>
            ) : (
                <>
                    {step === 1 && renderOfferForm()}
                    {step === 2 && renderCampaignForm()}
                </>
            )}
        </div>
    );
};

export default CreateOfferWithCampaign;
