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
        active: true,
        questions: []
    });

    // État pour la nouvelle question
    const [newQuestion, setNewQuestion] = useState({
        text: '',
        time_limit: 60
    });

    // État pour les options IA
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [aiOptions, setAiOptions] = useState({
        questionCount: 5,
        difficulty: 'medium',
        experienceLevel: 'intermediate',
        behavioralCount: 2,
        technicalCount: 3,
        showAdvanced: false
    });
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
                experience_level: aiOptions.experienceLevel,
                question_count: aiOptions.questionCount,
                difficulty_level: aiOptions.difficulty,
                behavioral_count: aiOptions.behavioralCount,
                technical_count: aiOptions.technicalCount
            };
            const response = await api.post('/interviews/generate-questions/', payload);
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
                            time_limit: q.expected_duration || 120,
                            id: Date.now() + idx,
                            type: q.type || 'comportementale',
                            difficulty: q.difficulty_level || aiOptions.difficulty,
                            generated_by_ai: true
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

    const aiButtonStyle = {
        backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '12px 20px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
        transition: 'all 0.3s ease'
    };

    const aiSectionStyle = {
        backgroundColor: '#f8faff',
        border: '2px solid #e3f2fd',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        position: 'relative'
    };

    const advancedOptionsStyle = {
        backgroundColor: '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '15px',
        marginTop: '15px'
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

    // Gestion des changements dans les options IA
    const handleAiOptionsChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : 
                        (['questionCount', 'behavioralCount', 'technicalCount'].includes(name) ? parseInt(value, 10) : value);
        
        const updatedOptions = {
            ...aiOptions,
            [name]: newValue
        };
        
        // Auto-ajustement des compteurs pour maintenir la cohérence
        if (name === 'questionCount') {
            const total = parseInt(value, 10);
            const ratio = updatedOptions.behavioralCount / (updatedOptions.behavioralCount + updatedOptions.technicalCount);
            updatedOptions.behavioralCount = Math.round(total * ratio);
            updatedOptions.technicalCount = total - updatedOptions.behavioralCount;
        } else if (name === 'behavioralCount' || name === 'technicalCount') {
            updatedOptions.questionCount = updatedOptions.behavioralCount + updatedOptions.technicalCount;
        }
        
        setAiOptions(updatedOptions);
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
            if (!campaign.title || !campaign.description) {
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

                {/* Section IA Améliorée */}
                <div style={aiSectionStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                        <h4 style={{ margin: '0', color: '#1976d2', fontSize: '18px' }}>
                            🤖 Assistant IA - Génération Intelligente
                        </h4>
                        <div style={{ 
                            marginLeft: 'auto', 
                            backgroundColor: '#4caf50', 
                            color: 'white', 
                            padding: '4px 8px', 
                            borderRadius: '12px', 
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            Powered by Google Gemini
                        </div>
                    </div>
                    
                    <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
                        Générez des questions personnalisées basées sur votre offre d'emploi
                    </p>

                    {/* Options rapides */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Nombre:</label>
                            <select
                                name="questionCount"
                                value={aiOptions.questionCount}
                                onChange={handleAiOptionsChange}
                                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd' }}
                            >
                                <option value={3}>3 questions</option>
                                <option value={5}>5 questions</option>
                                <option value={7}>7 questions</option>
                                <option value={10}>10 questions</option>
                            </select>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Difficulté:</label>
                            <select
                                name="difficulty"
                                value={aiOptions.difficulty}
                                onChange={handleAiOptionsChange}
                                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd' }}
                            >
                                <option value="easy">Facile</option>
                                <option value="medium">Moyen</option>
                                <option value="hard">Difficile</option>
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={() => setAiOptions({...aiOptions, showAdvanced: !aiOptions.showAdvanced})}
                            style={{ 
                                padding: '4px 8px', 
                                fontSize: '12px', 
                                backgroundColor: 'transparent', 
                                border: '1px solid #ddd', 
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            {aiOptions.showAdvanced ? '🔼 Moins' : '🔽 Plus d\'options'}
                        </button>
                    </div>

                    {/* Options avancées */}
                    {aiOptions.showAdvanced && (
                        <div style={advancedOptionsStyle}>
                            <h5 style={{ margin: '0 0 10px 0', color: '#333' }}>Options avancées</h5>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                <div>
                                    <label style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                                        Niveau d'expérience:
                                    </label>
                                    <select
                                        name="experienceLevel"
                                        value={aiOptions.experienceLevel}
                                        onChange={handleAiOptionsChange}
                                        style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ddd', width: '140px' }}
                                    >
                                        <option value="junior">Junior (0-2 ans)</option>
                                        <option value="intermediate">Intermédiaire (2-5 ans)</option>
                                        <option value="senior">Senior (5+ ans)</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                                        Questions comportementales:
                                    </label>
                                    <input
                                        type="number"
                                        name="behavioralCount"
                                        value={aiOptions.behavioralCount}
                                        onChange={handleAiOptionsChange}
                                        min="0"
                                        max="10"
                                        style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ddd', width: '60px' }}
                                    />
                                </div>
                                
                                <div>
                                    <label style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                                        Questions techniques:
                                    </label>
                                    <input
                                        type="number"
                                        name="technicalCount"
                                        value={aiOptions.technicalCount}
                                        onChange={handleAiOptionsChange}
                                        min="0"
                                        max="10"
                                        style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ddd', width: '60px' }}
                                    />
                                </div>
                            </div>
                            
                            <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
                                💡 Total: {aiOptions.behavioralCount + aiOptions.technicalCount} questions
                                ({aiOptions.behavioralCount} comportementales + {aiOptions.technicalCount} techniques)
                            </div>
                        </div>
                    )}

                    {/* Bouton de génération */}
                    <div style={{ marginTop: '15px' }}>
                        <button
                            type="button"
                            onClick={suggestQuestionsWithAI}
                            style={{
                                ...aiButtonStyle,
                                opacity: (aiLoading || !offer.title || !offer.description) ? 0.6 : 1
                            }}
                            disabled={aiLoading || !offer.title || !offer.description}
                        >
                            {aiLoading ? (
                                <>
                                    <div style={{ 
                                        width: '16px', 
                                        height: '16px', 
                                        border: '2px solid #ffffff40', 
                                        borderTop: '2px solid #ffffff', 
                                        borderRadius: '50%', 
                                        animation: 'spin 1s linear infinite' 
                                    }}></div>
                                    Génération en cours...
                                </>
                            ) : (
                                <>
                                    ✨ Générer {aiOptions.questionCount} questions avec l'IA
                                </>
                            )}
                        </button>
                        
                        {!offer.title || !offer.description ? (
                            <p style={{ fontSize: '12px', color: '#ff9800', marginTop: '8px', fontStyle: 'italic' }}>
                                💡 Remplissez d'abord le titre et la description pour activer l'IA
                            </p>
                        ) : null}
                    </div>

                    {aiError && (
                        <div style={{ 
                            color: '#d32f2f', 
                            backgroundColor: '#ffebee', 
                            padding: '10px', 
                            borderRadius: '6px', 
                            marginTop: '10px',
                            fontSize: '14px',
                            border: '1px solid #ffcdd2'
                        }}>
                            ❌ {aiError}
                        </div>
                    )}
                </div>

                {campaign.questions.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {campaign.questions.map((question, index) => (
                            <li key={question.id} style={{ border: '1px solid #eee', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <strong>Question {index + 1}:</strong>
                                            {question.generated_by_ai && (
                                                <span style={{ 
                                                    backgroundColor: '#e3f2fd', 
                                                    color: '#1976d2', 
                                                    padding: '2px 6px', 
                                                    borderRadius: '12px', 
                                                    fontSize: '10px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    🤖 IA
                                                </span>
                                            )}
                                            {question.type && (
                                                <span style={{ 
                                                    backgroundColor: '#f3e5f5', 
                                                    color: '#7b1fa2', 
                                                    padding: '2px 6px', 
                                                    borderRadius: '12px', 
                                                    fontSize: '10px',
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {question.type}
                                                </span>
                                            )}
                                            {question.difficulty && (
                                                <span style={{ 
                                                    backgroundColor: question.difficulty === 'easy' ? '#e8f5e8' : 
                                                                   question.difficulty === 'medium' ? '#fff3e0' : '#ffebee',
                                                    color: question.difficulty === 'easy' ? '#2e7d32' : 
                                                           question.difficulty === 'medium' ? '#f57c00' : '#c62828',
                                                    padding: '2px 6px', 
                                                    borderRadius: '12px', 
                                                    fontSize: '10px',
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {question.difficulty === 'easy' ? 'Facile' : 
                                                     question.difficulty === 'medium' ? 'Moyen' : 'Difficile'}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ marginBottom: '8px', lineHeight: '1.4' }}>
                                            {question.text}
                                        </div>
                                        <small style={{ color: '#666' }}>
                                            ⏱️ Temps de réponse: {question.time_limit} secondes
                                        </small>
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
