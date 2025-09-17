import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Row, Col, Badge, Button, Form, Alert, Spinner, Container, Modal } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './RecruiterStyles.css';

const InterviewDetails = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  
  const [application, setApplication] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [candidateAnswers, setCandidateAnswers] = useState([]); // Modified line
  const [loading, setLoading] = useState(true); // Modified line
  const [error, setError] = useState(null); // Modified line
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Modified line
  const [videoPlaying, setVideoPlaying] = useState(false); // Modified line
  const [finalEvaluation, setFinalEvaluation] = useState({ // Modified line
    technical: 0,
    communication: 0,
    motivation: 0,
    style: 0,
    nonVerbal: 0,
    global: 0,
    generalComments: ''
  });
  
  // États pour l'évaluation par question
  const [questionEvaluations, setQuestionEvaluations] = useState({});
  const [currentQuestionEvaluation, setCurrentQuestionEvaluation] = useState({
    communication_score: 0,
    communication_feedback: '',
    confidence_score: 0,
    confidence_feedback: '',
    relevance_score: 0,
    relevance_feedback: '',
    overall_score: 0,
    overall_feedback: '',
    recommendation: ''
  });
  const [savingEvaluation, setSavingEvaluation] = useState(false);
  const [evaluationSaved, setEvaluationSaved] = useState(false);
  const [allQuestionsEvaluated, setAllQuestionsEvaluated] = useState(false);
  
  // États pour l'évaluation globale de l'entretien
  const [globalEvaluation, setGlobalEvaluation] = useState({
    technical_skills: 0,
    communication_skills: 0,
    problem_solving: 0,
    cultural_fit: 0,
    motivation: 0,
    final_recommendation: '',
    strengths: '',
    weaknesses: '',
    general_comments: '',
    next_steps: ''
  });
  const [showGlobalEvaluation, setShowGlobalEvaluation] = useState(false);
  const [savingGlobalEvaluation, setSavingGlobalEvaluation] = useState(false);
  const [globalEvaluationSaved, setGlobalEvaluationSaved] = useState(false);
  const [inviteManagerModal, setInviteManagerModal] = useState(false);
  const [technicalInterviewModal, setTechnicalInterviewModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [interviewLocation, setInterviewLocation] = useState('');
  const [showCandidateDetailsModal, setShowCandidateDetailsModal] = useState(false);
  const [candidateDetails, setCandidateDetails] = useState(null);
  const [loadingCandidateDetails, setLoadingCandidateDetails] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState(null); // 'accept' ou 'reject'
  const [processingAction, setProcessingAction] = useState(false);
  
  // AI analysis state variables (disabled but kept for compatibility)
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [currentVideoAnalysis, setCurrentVideoAnalysis] = useState(null);
  const [hasExistingAIEvaluation, setHasExistingAIEvaluation] = useState(false);
  
  const videoRef = useRef(null);

  const fetchInterviewData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching interview data for application:', applicationId);
      
      // 1. Récupérer les détails de la candidature
      const appResponse = await api.get(`/interviews/applications/${applicationId}/`);
      const applicationData = appResponse.data;
      console.log('Application data:', applicationData);
      setApplication(applicationData);

      // 2. Récupérer la campagne associée à l'offre
      try {
        const campaignResponse = await api.get(`/interviews/campaigns/`);
        console.log('All campaigns:', campaignResponse.data);
        
        // Filtrer les campagnes par job_offer
        const campaigns = campaignResponse.data.results || campaignResponse.data;
        console.log('All campaigns:', campaigns);
        console.log('Looking for job_offer ID:', applicationData.job_offer?.id || applicationData.job_offer);
        console.log('Application job_offer structure:', applicationData.job_offer);
        
        const campaignData = campaigns.find(campaign => {
          const targetJobOfferId = applicationData.job_offer?.id || applicationData.job_offer;
          console.log('Checking campaign:', campaign.id, 'job_offer:', campaign.job_offer, 'target:', targetJobOfferId);
          // Vérifier les deux formats possibles
          return campaign.job_offer === targetJobOfferId || 
                 campaign.job_offer === applicationData.job_offer ||
                 (typeof campaign.job_offer === 'object' && campaign.job_offer.id === targetJobOfferId);
        });
        
        console.log('Found campaign:', campaignData);
        setCampaign(campaignData);

        if (campaignData) {
          // 3. Récupérer les questions de la campagne
          let questionsResponse = null; // Déclarer ici pour une portée plus large
          try {
            questionsResponse = await api.get(`/interviews/campaigns/${campaignData.id}/questions/`);
            console.log('Questions:', questionsResponse.data);
          } catch (questionsErr) {
            console.error('Error fetching questions:', questionsErr);
          }

          // 4. Récupérer les réponses du candidat pour cette campagne avec le nouvel endpoint
          try {
            console.log('Fetching candidate evaluation data...');
            console.log('Campaign ID:', campaignData.id);
            console.log('Candidate ID:', applicationData.candidate.id);
            
            const evaluationResponse = await api.get(`/interviews/answers/candidate_evaluation/?campaign_id=${campaignData.id}&candidate_id=${applicationData.candidate.id}`);
            const evaluationData = evaluationResponse.data || [];
            
            console.log('Candidate evaluation data:', evaluationData);
            console.log('Number of answers found:', evaluationData.length);
            
            if (evaluationData.length === 0) {
              console.warn('No video answers found for this candidate in this campaign');
              console.log('Trying alternative endpoint...');
              
              // Essayer l'ancien endpoint comme fallback
              try {
                const fallbackResponse = await api.get(`/interviews/answers/by_campaign/?campaign_id=${campaignData.id}`);
                const allAnswers = fallbackResponse.data.results || fallbackResponse.data || [];
                console.log('Fallback - All answers in campaign:', allAnswers.length);
                
                const candidateAnswers = allAnswers.filter(answer => {
                  const candidateMatch = answer.candidate?.id === applicationData.candidate.id || 
                                       answer.candidate === applicationData.candidate.id;
                  if (candidateMatch) {
                    console.log('Found answer via fallback:', answer.id);
                  }
                  return candidateMatch;
                });
                
                console.log('Fallback - Candidate answers found:', candidateAnswers.length);
                setCandidateAnswers(candidateAnswers.map(answer => ({
                  id: answer.id,
                  question: answer.question_text || 'Question non disponible',
                  video_url: answer.cloudinary_secure_url || answer.cloudinary_url,
                  score: answer.score,
                  recruiter_notes: answer.recruiter_notes || '',
                  duration: answer.duration,
                  created_at: answer.created_at,
                  question_order: answer.question?.order || 1
                })));
              } catch (fallbackErr) {
                console.error('Fallback also failed:', fallbackErr);
                setCandidateAnswers([]);
              }
            } else {
              setCandidateAnswers(evaluationData);
            }
          } catch (answersErr) {
            console.error('Error fetching candidate evaluation:', answersErr);
            console.error('Error details:', {
              message: answersErr.message,
              status: answersErr.response?.status,
              data: answersErr.response?.data
            });
            setCandidateAnswers([]);
          }

        } else {
          console.warn('No campaign found for this job offer');
          setCandidateAnswers([]);
        }
      } catch (campaignErr) {
        console.error('Error fetching campaign:', campaignErr);
        console.error('Campaign error details:', {
          message: campaignErr.message,
          status: campaignErr.response?.status,
          data: campaignErr.response?.data
        });
        setCampaign(null);
        setCandidateAnswers([]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching interview data:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      let errorMessage = 'Erreur lors du chargement des données d\'entretien';
      
      if (err.response?.status === 404) {
        errorMessage = 'Candidature non trouvée';
      } else if (err.response?.status === 403) {
        errorMessage = 'Accès non autorisé à cette candidature';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchInterviewData();
  }, [fetchInterviewData]);

  // Effect pour recharger la vidéo quand la question change
  useEffect(() => {
    if (videoRef.current && candidateAnswers.length > 0) {
      const currentAnswer = candidateAnswers[currentQuestionIndex];
      if (currentAnswer && currentAnswer.video_url) {
        videoRef.current.load(); // Force le rechargement de la vidéo
        setVideoPlaying(false); // Reset l'état de lecture
        
        // Charger l'évaluation existante pour cette réponse
        fetchQuestionEvaluation(currentAnswer.id);
        
        // Charger l'évaluation IA existante pour cette réponse
        fetchAIEvaluation(currentAnswer.id);
      }
    }
  }, [currentQuestionIndex, candidateAnswers]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { variant: 'warning', text: 'En attente' },
      'reviewed': { variant: 'info', text: 'Examiné' },
      'accepted': { variant: 'success', text: 'Accepté' },
      'rejected': { variant: 'danger', text: 'Rejeté' }
    };
    
    const config = statusConfig[status] || { variant: 'secondary', text: status };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Video control functions
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setVideoPlaying(true);
    }
  };

  const handleVideoPlay = () => {
    setVideoPlaying(true);
  };

  const handleVideoPause = () => {
    setVideoPlaying(false);
  };


  // AI video evaluation functionality has been removed


  // Fonction pour ouvrir la modal de confirmation
  const handleDecision = (decision) => {
    if (!application) return;
    
    setConfirmationAction(decision);
    setShowConfirmationModal(true);
  };

  // Fonction pour traiter la confirmation de la décision
  const handleConfirmDecision = async () => {
    if (!application || !confirmationAction) return;
    
    try {
      setProcessingAction(true);
      
      const statusUpdate = {
        'accept': 'accepted',
        'reject': 'rejected', 
        'technical': 'technical_interview'
      };
      
      console.log(`Décision: ${confirmationAction} pour le candidat ${application.candidate.username}`);
      
      // Appel API pour mettre à jour le statut
      await api.patch(`/interviews/applications/${applicationId}/`, { 
        status: statusUpdate[confirmationAction] 
      });
      
      // Mettre à jour l'état local
      setApplication(prev => ({
        ...prev,
        status: statusUpdate[confirmationAction]
      }));
      
      const successMessage = {
        'accept': 'Candidat accepté avec succès!',
        'reject': 'Candidat refusé',
        'technical': 'Entretien technique programmé'
      };
      
      alert(successMessage[confirmationAction]);
      
      // Fermer la modal
      setShowConfirmationModal(false);
      setConfirmationAction(null);
      
      // Optionnel: rediriger vers la liste des candidatures
      if (confirmationAction !== 'technical') {
        setTimeout(() => navigate(-1), 1500);
      }
    } catch (error) {
      console.error('Erreur lors de la décision:', error);
      alert('Erreur lors de la mise à jour du statut');
      setProcessingAction(false);
    }
  };

  // Fonction pour récupérer les détails complets du candidat
  const fetchCandidateDetails = async () => {
    if (!application?.candidate?.id) return;
    
    setLoadingCandidateDetails(true);
    try {
      const response = await api.get(`/interviews/candidates/${application.candidate.id}/details/`);
      setCandidateDetails(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des détails du candidat:', error);
      alert('Erreur lors du chargement des détails du candidat');
    } finally {
      setLoadingCandidateDetails(false);
    }
  };

  // Fonction pour déclencher l'évaluation IA
  const handleAIEvaluation = async () => {
    if (!currentAnswer) {
      alert('❌ Erreur: Aucune réponse vidéo sélectionnée');
      return;
    }
    
    // Log pour debug - les URLs Cloudinary sont vérifiées côté backend
    console.log('🔍 [FRONTEND DEBUG] Déclenchement évaluation IA pour réponse ID:', currentAnswer.id);
    console.log('🔍 [FRONTEND DEBUG] currentAnswer.cloudinary_secure_url:', currentAnswer.cloudinary_secure_url);
    console.log('🔍 [FRONTEND DEBUG] currentAnswer.cloudinary_url:', currentAnswer.cloudinary_url);
    console.log('🔍 [FRONTEND DEBUG] Validation Cloudinary déléguée au backend');
    
    setAnalyzingAI(true);
    try {
      console.log('🚀 Démarrage évaluation IA pour réponse:', currentAnswer.id);
      console.log('📹 URL vidéo:', currentAnswer.cloudinary_secure_url || currentAnswer.cloudinary_url);
      
      // Appel API pour déclencher l'évaluation IA
      const response = await api.post('/interviews/ai-evaluations/evaluate_video/', {
        interview_answer_id: currentAnswer.id,
        force_reevaluation: true // Forcer une nouvelle évaluation
      });
      
      console.log('✅ Réponse API évaluation IA:', response.data);
      
      if (response.data.evaluation_id) {
        console.log('🔄 Polling pour évaluation ID:', response.data.evaluation_id);
        pollAIEvaluationStatus(response.data.evaluation_id);
      } else if (response.data.evaluation && response.data.evaluation.id) {
        // Évaluation existante trouvée
        console.log('📊 Évaluation existante trouvée:', response.data.evaluation);
        const evaluation = response.data.evaluation;
        setCurrentVideoAnalysis({
          communication: Math.round(evaluation.communication_score * 10) || 0,
          pertinence: Math.round(evaluation.relevance_score * 10) || 0,
          confiance: Math.round(evaluation.confidence_score * 10) || 0,
          feedback: evaluation.ai_feedback,
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses
        });
        setAnalyzingAI(false);
      } else {
        console.error('❌ Réponse API inattendue:', response.data);
        throw new Error('Format de réponse API inattendu: ' + JSON.stringify(response.data));
      }
      
    } catch (error) {
      console.error('❌ Erreur complète:', error);
      setAnalyzingAI(false);
      
      let errorMessage = 'Erreur inconnue';
      
      if (error.response) {
        // Erreur HTTP avec réponse du serveur
        console.error('📡 Status:', error.response.status);
        console.error('📡 Data:', error.response.data);
        
        if (error.response.status === 404) {
          errorMessage = 'Endpoint API non trouvé. Vérifiez que le backend est démarré.';
        } else if (error.response.status === 500) {
          errorMessage = 'Erreur serveur interne: ' + (error.response.data?.error || 'Erreur backend');
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data?.details) {
          errorMessage = 'Erreur de validation: ' + JSON.stringify(error.response.data.details);
        }
      } else if (error.request) {
        // Pas de réponse du serveur
        errorMessage = 'Impossible de contacter le serveur. Vérifiez que le backend est en ligne.';
      } else {
        // Erreur de configuration de la requête
        errorMessage = error.message;
      }
      
      alert('❌ Évaluation IA échouée:\n\n' + errorMessage + '\n\nVérifiez la console pour plus de détails.');
    }
  };

  // Fonction pour vérifier le statut de l'évaluation IA
  const pollAIEvaluationStatus = async (evaluationId) => {
    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;

    const checkStatus = async () => {
      try {
        console.log(`🔍 Vérification statut évaluation ${evaluationId} (tentative ${attempts + 1}/${maxAttempts})`);
        
        const response = await api.get(`/interviews/ai-evaluations/${evaluationId}/`);
        const evaluation = response.data;
        
        console.log('📊 Statut actuel:', evaluation.status);

        if (evaluation.status === 'completed') {
          // Évaluation terminée avec succès
          console.log('✅ Évaluation IA terminée avec succès:', evaluation);
          setCurrentVideoAnalysis({
            communication: Math.round(evaluation.communication_score * 10) || 0,
            pertinence: Math.round(evaluation.relevance_score * 10) || 0,
            confiance: Math.round(evaluation.confidence_score * 10) || 0,
            feedback: evaluation.ai_feedback,
            strengths: evaluation.strengths,
            weaknesses: evaluation.weaknesses
          });
          setAnalyzingAI(false);
          alert('✅ Évaluation IA terminée avec succès!\n\nScores obtenus:\n' +
                `• Communication: ${Math.round(evaluation.communication_score * 10)}/100\n` +
                `• Pertinence: ${Math.round(evaluation.relevance_score * 10)}/100\n` +
                `• Confiance: ${Math.round(evaluation.confidence_score * 10)}/100`);
          return;
        } else if (evaluation.status === 'failed') {
          // Évaluation échouée
          console.error('❌ Évaluation IA échouée:', evaluation.error_message);
          setAnalyzingAI(false);
          alert('❌ Échec de l\'évaluation IA:\n\n' + 
                (evaluation.error_message || 'Erreur inconnue') + 
                '\n\nVérifiez les logs du serveur pour plus de détails.');
          return;
        } else if (evaluation.status === 'processing') {
          console.log('⏳ Évaluation en cours de traitement...');
        } else if (evaluation.status === 'pending') {
          console.log('⏳ Évaluation en attente...');
        }

        // Continuer le polling si en cours
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000); // Vérifier toutes les 10 secondes
        } else {
          console.error('⏰ Timeout atteint pour l\'évaluation IA');
          setAnalyzingAI(false);
          alert('⏰ Timeout: L\'évaluation IA prend trop de temps.\n\n' +
                'Cela peut être dû à:\n' +
                '• Problème de connexion avec Gemini API\n' +
                '• Fichier vidéo très volumineux\n' +
                '• Surcharge du serveur\n\n' +
                'Vérifiez l\'admin Django pour voir le statut de l\'évaluation.');
        }
      } catch (error) {
        console.error('❌ Erreur lors de la vérification du statut:', error);
        setAnalyzingAI(false);
        
        let errorMsg = 'Erreur lors de la vérification du statut';
        if (error.response?.status === 404) {
          errorMsg = 'Évaluation introuvable (ID: ' + evaluationId + ')';
        } else if (error.response?.data?.error) {
          errorMsg = error.response.data.error;
        }
        
        alert('❌ ' + errorMsg + '\n\nVérifiez la console pour plus de détails.');
      }
    };

    checkStatus();
  };

  // Fonction pour charger l'évaluation existante pour une question
  const fetchQuestionEvaluation = async (answerId) => {
    if (!answerId) return;
    
    try {
      const response = await api.get(`/interviews/recruiter-evaluations/by_answer/?answer_id=${answerId}`);
      if (response.data.evaluation) {
        const evaluation = response.data.evaluation;
        setCurrentQuestionEvaluation(evaluation);
        setQuestionEvaluations(prev => ({
          ...prev,
          [answerId]: evaluation
        }));
        setEvaluationSaved(true);
      } else {
        // Reset pour une nouvelle évaluation
        setCurrentQuestionEvaluation({
          communication_score: 0,
          communication_feedback: '',
          confidence_score: 0,
          confidence_feedback: '',
          relevance_score: 0,
          relevance_feedback: '',
          overall_score: 0,
          overall_feedback: '',
          recommendation: ''
        });
        setEvaluationSaved(false);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'évaluation:', error);
    }
  };

  // Fonction pour charger l'évaluation IA existante pour une question
  const fetchAIEvaluation = async (answerId) => {
    if (!answerId) return;
    
    try {
      console.log('🔍 Recherche évaluation IA existante pour réponse:', answerId);
      const response = await api.get(`/interviews/ai-evaluations/by_answer/?answer_id=${answerId}`);
      
      if (response.data.has_evaluation && response.data.evaluation) {
        const evaluation = response.data.evaluation;
        console.log('✅ Évaluation IA trouvée:', evaluation);
        
        // Convertir les scores de 0-10 vers 0-100 pour l'affichage
        setCurrentVideoAnalysis({
          communication: Math.round(evaluation.communication_score * 10) || 0,
          pertinence: Math.round(evaluation.relevance_score * 10) || 0,
          confiance: Math.round(evaluation.confidence_score * 10) || 0,
          feedback: evaluation.ai_feedback,
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses
        });
        
        setHasExistingAIEvaluation(true);
        console.log('📊 Évaluation IA chargée et affichée automatiquement');
      } else {
        console.log('ℹ️ Aucune évaluation IA trouvée pour cette réponse');
        setCurrentVideoAnalysis(null);
        setHasExistingAIEvaluation(false);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'évaluation IA:', error);
      setCurrentVideoAnalysis(null);
      setHasExistingAIEvaluation(false);
    }
  };

  // Fonction pour sauvegarder l'évaluation d'une question
  const saveQuestionEvaluation = async () => {
    if (!candidateAnswers[currentQuestionIndex]?.id) {
      alert('Aucune réponse sélectionnée pour l\'évaluation');
      return;
    }

    setSavingEvaluation(true);
    try {
      const answerId = candidateAnswers[currentQuestionIndex].id;
      const evaluationData = {
        interview_answer: answerId,
        ...currentQuestionEvaluation
      };

      const response = await api.post('/interviews/recruiter-evaluations/evaluate_answer/', evaluationData);
      
      if (response.data.evaluation) {
        const savedEvaluation = response.data.evaluation;
        setCurrentQuestionEvaluation(savedEvaluation);
        setQuestionEvaluations(prev => ({
          ...prev,
          [answerId]: savedEvaluation
        }));
        setEvaluationSaved(true);
        
        // Vérifier si toutes les questions ont été évaluées
        checkAllQuestionsEvaluated();
        
        alert('Évaluation de la question sauvegardée avec succès!');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde de l\'évaluation');
    } finally {
      setSavingEvaluation(false);
    }
  };

  // Fonction pour mettre à jour les champs d'évaluation de la question courante
  const updateQuestionEvaluationField = (field, value) => {
    setCurrentQuestionEvaluation(prev => ({
      ...prev,
      [field]: value
    }));
    setEvaluationSaved(false);
  };

  // Fonction pour vérifier si toutes les questions ont été évaluées
  const checkAllQuestionsEvaluated = useCallback(() => {
    const evaluatedCount = Object.keys(questionEvaluations).length;
    const totalQuestions = candidateAnswers.length;
    setAllQuestionsEvaluated(evaluatedCount === totalQuestions && totalQuestions > 0);
  }, [questionEvaluations, candidateAnswers]);

  // Effect pour vérifier l'état d'évaluation complète
  useEffect(() => {
    checkAllQuestionsEvaluated();
  }, [checkAllQuestionsEvaluated]);

  // Fonctions pour l'évaluation globale de l'entretien
  const loadGlobalEvaluation = async () => {
    try {
      const response = await api.get(`/interviews/global-evaluations/by_application/?application_id=${applicationId}`);
      if (response.data && !response.data.message) {
        setGlobalEvaluation(response.data);
        setGlobalEvaluationSaved(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'évaluation globale:', error);
    }
  };

  const saveGlobalEvaluation = async () => {
    setSavingGlobalEvaluation(true);
    try {
      const evaluationData = {
        job_application: parseInt(applicationId),
        ...globalEvaluation
      };

      const response = await api.post('/interviews/global-evaluations/create_or_update/', evaluationData);
      
      if (response.data.evaluation) {
        setGlobalEvaluation(response.data.evaluation);
        setGlobalEvaluationSaved(true);
        alert('Évaluation globale sauvegardée avec succès!');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'évaluation globale:', error);
      alert('Erreur lors de la sauvegarde de l\'évaluation globale');
    } finally {
      setSavingGlobalEvaluation(false);
    }
  };

  const updateGlobalEvaluationField = (field, value) => {
    setGlobalEvaluation(prev => ({
      ...prev,
      [field]: value
    }));
    setGlobalEvaluationSaved(false);
  };

  const calculateOverallScore = () => {
    const scores = [
      globalEvaluation.technical_skills,
      globalEvaluation.communication_skills,
      globalEvaluation.problem_solving,
      globalEvaluation.cultural_fit,
      globalEvaluation.motivation
    ];
    const validScores = scores.filter(score => score > 0);
    return validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
  };

  // Fonction pour inviter un manager
  const inviteManager = async (managerEmail, message = '') => {
    if (!application) return;
    
    try {
      const invitationData = {
        manager_email: managerEmail,
        application_id: applicationId,
        candidate_name: application.candidate.first_name && application.candidate.last_name 
          ? `${application.candidate.first_name} ${application.candidate.last_name}`
          : application.candidate.username,
        job_title: application.job_offer?.title || 'Poste non spécifié',
        message: message,
        evaluation_summary: {
          ai_analysis: aiAnalysis,
          final_scores: finalEvaluation
        }
      };
      
      console.log('Invitation manager:', invitationData);
      // TODO: Ajouter l'appel API réel
      // await api.post('/interviews/invite-manager/', invitationData);
      
      alert('Manager invité avec succès!');
      setInviteManagerModal(false);
    } catch (error) {
      console.error('Erreur lors de l\'invitation:', error);
      alert('Erreur lors de l\'envoi de l\'invitation');
    }
  };



  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Chargement...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Erreur</Alert.Heading>
        <p>{error}</p>
        <Button variant="outline-danger" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </Alert>
    );
  }

  if (!application) {
    return (
      <Alert variant="warning">
        <Alert.Heading>Candidature introuvable</Alert.Heading>
        <p>Impossible de charger les détails de la candidature.</p>
        <Button variant="outline-warning" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </Alert>
    );
  }

  if (!campaign) {
    return (
      <Alert variant="info">
        <Alert.Heading>Aucune campagne d'entretien</Alert.Heading>
        <p>Aucune campagne d'entretien n'a été créée pour cette offre d'emploi.</p>
        <div className="mt-3">
          <p><strong>Candidat:</strong> {application.candidate.username}</p>
          <p><strong>Offre:</strong> {application.job_offer.title}</p>
          <p><strong>Statut:</strong> {getStatusBadge(application.status)}</p>
        </div>
        <Button variant="outline-info" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </Alert>
    );
  }

  const currentAnswer = candidateAnswers[currentQuestionIndex];

  return (
    <div className="position-relative">
    
      <Container fluid className="py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        {/* Header */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h2 className="fw-bold mb-1" style={{ color: '#2c3e50' }}>Reviewing: {application.candidate.username}</h2>
              <p className="text-muted mb-0">
                Campaign: <span className="fw-medium">{campaign?.title || application.job_offer?.title}</span> • Q2 2024
              </p>
            </div>
            <Button variant="outline-secondary" onClick={() => navigate(-1)} className="px-3">
              <i className="bi bi-arrow-left me-2"></i>Back
            </Button>
          </div>
        </div>

        <Row className="g-4">
        {/* Left Column - Video Player */}
        <Col lg={7}>
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body className="p-0">
              <div className="p-4 pb-3">
                <h5 className="fw-bold mb-1">Playing Video for Question {currentQuestionIndex + 1}</h5>
              </div>
              
              {candidateAnswers.length > 0 && currentAnswer ? (
                <div className="px-4 pb-4">
                  {/* Video Player */}
                  <div className="video-player-container mb-3" style={{ 
                    backgroundColor: '#000', 
                    borderRadius: '12px', 
                    position: 'relative',
                    paddingBottom: '56.25%',
                    height: 0,
                    overflow: 'hidden'
                  }}>
                    <video 
                      ref={videoRef}
                      key={`video-${currentQuestionIndex}-${currentAnswer.id}`}
                      controls 
                      style={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        borderRadius: '12px'
                      }}
                      onPlay={handleVideoPlay}
                      onPause={handleVideoPause}
                    >
                      <source src={currentAnswer.video_url} type="video/mp4" />
                    </video>
                  </div>
                  
                  {/* Video Controls */}
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-muted">Duration: {formatDuration(currentAnswer.duration)} / 2:00</small>
                    </div>
                    <div>
                      <Button 
                        variant="primary" 
                        className="me-2"
                        onClick={handlePlayPause}
                      >
                        <i className={`bi ${videoPlaying ? 'bi-pause' : 'bi-play'}`}></i>
                        {videoPlaying ? 'Pause' : 'Play'}
                      </Button>
                      <Button 
                        variant="outline-secondary"
                        onClick={handleReplay}
                      >
                        <i className="bi bi-arrow-clockwise"></i>
                        Replay
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-muted">
                  <i className="bi bi-camera-video-off" style={{ fontSize: '3rem' }}></i>
                  <p className="mt-3">No video responses available</p>
                </div>
              )}
            </Card.Body>
          </Card>
          
          {/* Interview Questions */}
          <Card className="shadow-sm border-0">
            <Card.Body>
              <h6 className="fw-bold mb-3">Interview Questions</h6>
              {candidateAnswers.map((answer, index) => (
                <Card 
                  key={answer.id} 
                  className={`mb-3 cursor-pointer ${index === currentQuestionIndex ? 'border-primary' : 'border-light'}`}
                  onClick={() => setCurrentQuestionIndex(index)}
                  style={{ cursor: 'pointer' }}
                >
                  <Card.Body className="py-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <h6 className="text-primary mb-1">Question {index + 1}</h6>
                        <p className="mb-0 text-muted small">{answer.question}</p>
                      </div>
                      {answer.score && (
                        <Badge bg="success" className="ms-2">
                          {Math.round(answer.score / 20)}/5 ⭐
                        </Badge>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </Card.Body>
          </Card>
        </Col>
        
        {/* Right Column - Candidate Info & Scoring */}
        <Col lg={5}>
          {/* Candidate Information */}
          {application && (
            <Card className="shadow-sm border-0 mb-4">
              <Card.Body>
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                       style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}>
                    {application.candidate.first_name?.charAt(0) || application.candidate.username?.charAt(0) || 'N'}
                  </div>
                  <div>
                    <h5 className="mb-0 fw-bold">
                      {application.candidate.first_name && application.candidate.last_name 
                        ? `${application.candidate.first_name} ${application.candidate.last_name}`
                        : application.candidate.username}
                    </h5>
                    <p className="text-muted mb-0">{application.job_offer?.title || 'Poste non spécifié'}</p>
                  </div>
                </div>
                
                <div className="candidate-details">
                  <div className="mb-2">
                    <i className="bi bi-envelope me-2 text-muted"></i>
                    <span>{application.candidate.email || 'Email non renseigné'}</span>
                  </div>
                  <div className="mb-2">
                    <i className="bi bi-telephone me-2 text-muted"></i>
                    <span>{application.candidate.phone || 'Téléphone non renseigné'}</span>
                  </div>
                  <div className="mb-2">
                    <i className="bi bi-geo-alt me-2 text-muted"></i>
                    <span>{application.candidate.city || 'Ville non renseignée'}</span>
                  </div>
                  <div className="mb-2">
                    <i className="bi bi-mortarboard me-2 text-muted"></i>
                    <span>{application.candidate.education_level || 'Formation non renseignée'}</span>
                  </div>
                </div>
                
                {/* Bouton pour voir les détails complets */}
                <div className="mt-3">
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    className="w-100"
                    onClick={() => {
                      setShowCandidateDetailsModal(true);
                      fetchCandidateDetails();
                    }}
                  >
                    <i className="bi bi-person-lines-fill me-2"></i>
                    Voir les détails complets du candidat
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* AI Evaluation Section */}
          {candidateAnswers.length > 0 && currentAnswer && (
            <Card className="shadow-sm border-0 mb-4" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
              <Card.Body className="text-white">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-robot me-2"></i>
                    <h6 className="mb-0 fw-bold">Analyse IA Dynamique</h6>
                  </div>
                  {!hasExistingAIEvaluation ? (
                    <Button 
                      variant="light" 
                      size="sm"
                      onClick={handleAIEvaluation}
                      disabled={analyzingAI}
                    >
                      {analyzingAI ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Analyse...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-play me-2"></i>
                          Lancer l'Analyse IA
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="d-flex align-items-center">
                      <Badge bg="success" className="me-2">
                        <i className="bi bi-check-circle me-1"></i>
                        Analysé
                      </Badge>
                      <Button 
                        variant="outline-light" 
                        size="sm"
                        onClick={handleAIEvaluation}
                        disabled={analyzingAI}
                      >
                        {analyzingAI ? (
                          <>
                            <Spinner size="sm" className="me-2" />
                            Re-analyse...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-arrow-clockwise me-2"></i>
                            Relancer l'Analyse
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                <p className="mb-0 opacity-75">Évaluation intelligente basée sur Google Gemini</p>
                
                {currentVideoAnalysis && (
                  <div className="mt-3 pt-3 border-top border-light border-opacity-25">
                    <Row className="g-3">
                      <Col xs={4} className="text-center">
                        <div className="text-white-50 small mb-1">Communication</div>
                        <div className="fw-bold fs-5">{currentVideoAnalysis.communication}</div>
                      </Col>
                      <Col xs={4} className="text-center">
                        <div className="text-white-50 small mb-1">Pertinence</div>
                        <div className="fw-bold fs-5">{currentVideoAnalysis.pertinence}</div>
                      </Col>
                      <Col xs={4} className="text-center">
                        <div className="text-white-50 small mb-1">Confiance</div>
                        <div className="fw-bold fs-5">{currentVideoAnalysis.confiance}</div>
                      </Col>
                    </Row>
                    
                    {/* Affichage du feedback détaillé */}
                    {currentVideoAnalysis.feedback && (
                      <div className="mt-3 pt-3 border-top border-light border-opacity-25">
                        <h6 className="text-white mb-2">
                          <i className="bi bi-chat-square-text me-2"></i>
                          Analyse Détaillée
                        </h6>
                        <div className="bg-white bg-opacity-10 rounded p-3">
                          <pre className="text-white-75 mb-0" style={{ 
                            whiteSpace: 'pre-wrap', 
                            fontFamily: 'inherit',
                            fontSize: '0.9rem',
                            lineHeight: '1.5'
                          }}>
                            {currentVideoAnalysis.feedback}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {/* Affichage des forces et faiblesses */}
                    {(currentVideoAnalysis.strengths || currentVideoAnalysis.weaknesses) && (
                      <div className="mt-3">
                        <Row className="g-3">
                          {currentVideoAnalysis.strengths && (
                            <Col md={6}>
                              <div className="border border-2 border-success rounded p-3" style={{ 
                                backgroundColor: 'rgba(25, 135, 84, 0.8)',
                                boxShadow: '0 2px 8px rgba(25, 135, 84, 0.4)'
                              }}>
                                <h6 className="text-white mb-2 fw-bold" style={{ fontSize: '1rem' }}>
                                  <i className="bi bi-check-circle-fill me-2"></i>
                                  ✅ Points Forts
                                </h6>
                                <p className="text-white mb-0" style={{ 
                                  fontSize: '0.95rem',
                                  lineHeight: '1.4',
                                  fontWeight: '500'
                                }}>{currentVideoAnalysis.strengths}</p>
                              </div>
                            </Col>
                          )}
                          {currentVideoAnalysis.weaknesses && (
                            <Col md={6}>
                              <div className="border border-2 border-danger rounded p-3" style={{ 
                                backgroundColor: 'rgba(220, 53, 69, 0.8)',
                                boxShadow: '0 2px 8px rgba(220, 53, 69, 0.4)'
                              }}>
                                <h6 className="text-white mb-2 fw-bold" style={{ fontSize: '1rem' }}>
                                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                  ⚠️ Axes d'Amélioration
                                </h6>
                                <p className="text-white mb-0" style={{ 
                                  fontSize: '0.95rem',
                                  lineHeight: '1.4',
                                  fontWeight: '500'
                                }}>{currentVideoAnalysis.weaknesses}</p>
                              </div>
                            </Col>
                          )}
                        </Row>
                      </div>
                    )}
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
          
          {candidateAnswers.length > 0 && currentAnswer ? (
            <>

              {/* Évaluation détaillée du recruteur */}
              <Card className="shadow-sm border-0 mb-4">
                <Card.Body>
                  <h6 className="fw-bold mb-3">
                    <i className="bi bi-person-check me-2"></i>
                    Évaluation Détaillée - Question {currentQuestionIndex + 1}
                  </h6>
                  
                  {evaluationSaved && (
                    <Alert variant="success" className="mb-3">
                      <i className="bi bi-check-circle me-2"></i>
                      Évaluation sauvegardée avec succès
                    </Alert>
                  )}

                  {/* Scores d'évaluation */}
                  <div className="evaluation-scores mb-4">
                    <Row className="g-3">
                      {/* Communication */}
                      <Col md={4}>
                        <Card className="h-100 border-0 shadow-sm">
                          <Card.Body className="p-3">
                            <div className="text-center mb-3">
                              <i className="bi bi-chat-dots fs-2 text-primary"></i>
                              <h6 className="mt-2 mb-1 fw-bold text-primary">Communication</h6>
                              <small className="text-muted">Clarté, fluidité, structure</small>
                            </div>
                            <Form.Control
                              type="number"
                              min="0"
                              max="100"
                              value={currentQuestionEvaluation.communication_score || ''}
                              onChange={(e) => updateQuestionEvaluationField('communication_score', parseFloat(e.target.value) || 0)}
                              placeholder="Score /100"
                              className="text-center fw-bold"
                              style={{ fontSize: '1.1rem' }}
                            />
                          </Card.Body>
                        </Card>
                      </Col>

                      {/* Pertinence */}
                      <Col md={4}>
                        <Card className="h-100 border-0 shadow-sm">
                          <Card.Body className="p-3">
                            <div className="text-center mb-3">
                              <i className="bi bi-bullseye fs-2 text-info"></i>
                              <h6 className="mt-2 mb-1 fw-bold text-info">Pertinence</h6>
                              <small className="text-muted">Alignement avec la question</small>
                            </div>
                            <Form.Control
                              type="number"
                              min="0"
                              max="100"
                              value={currentQuestionEvaluation.relevance_score || ''}
                              onChange={(e) => updateQuestionEvaluationField('relevance_score', parseFloat(e.target.value) || 0)}
                              placeholder="Score /100"
                              className="text-center fw-bold"
                              style={{ fontSize: '1.1rem' }}
                            />
                          </Card.Body>
                        </Card>
                      </Col>

                      {/* Confiance */}
                      <Col md={4}>
                        <Card className="h-100 border-0 shadow-sm">
                          <Card.Body className="p-3">
                            <div className="text-center mb-3">
                              <i className="bi bi-shield-check fs-2 text-success"></i>
                              <h6 className="mt-2 mb-1 fw-bold text-success">Confiance</h6>
                              <small className="text-muted">Assurance, peu d'hésitation</small>
                            </div>
                            <Form.Control
                              type="number"
                              min="0"
                              max="100"
                              value={currentQuestionEvaluation.confidence_score || ''}
                              onChange={(e) => updateQuestionEvaluationField('confidence_score', parseFloat(e.target.value) || 0)}
                              placeholder="Score /100"
                              className="text-center fw-bold"
                              style={{ fontSize: '1.1rem' }}
                            />
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </div>

                  {/* Commentaire global */}
                  <div className="mb-4">
                    <Card className="border-0 shadow-sm">
                      <Card.Header className="bg-light border-0">
                        <h6 className="mb-0 fw-bold">
                          <i className="bi bi-chat-text me-2 text-dark"></i>
                          Commentaire Global
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          value={currentQuestionEvaluation.overall_feedback || ''}
                          onChange={(e) => updateQuestionEvaluationField('overall_feedback', e.target.value)}
                          placeholder="Commentaire général sur cette réponse..."
                          style={{ resize: 'none', border: 'none', boxShadow: 'none' }}
                          className="p-0"
                        />
                      </Card.Body>
                    </Card>
                  </div>

                  {/* Boutons d'action */}
                  <div className="d-grid gap-2">
                    <Button 
                      variant="success"
                      onClick={saveQuestionEvaluation}
                      disabled={savingEvaluation}
                    >
                      {savingEvaluation ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Sauvegarde...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle me-2"></i>
                          Sauvegarder l'Évaluation
                        </>
                      )}
                    </Button>
                    {evaluationSaved && (
                      <Alert variant="success" className="mb-0 mt-2">
                        <i className="bi bi-check-circle me-2"></i>
                        Évaluation de cette question sauvegardée avec succès!
                      </Alert>
                    )}
                    
                    {/* Indicateur de progression */}
                    <div className="mt-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <small className="text-muted">
                          Progression: {Object.keys(questionEvaluations).length}/{candidateAnswers.length} questions évaluées
                        </small>
                        <div className="d-flex gap-1">
                          {candidateAnswers.map((answer, index) => (
                            <div
                              key={answer.id}
                              className={`rounded-circle ${
                                questionEvaluations[answer.id] ? 'bg-success' : 'bg-secondary'
                              }`}
                              style={{ width: '12px', height: '12px' }}
                              title={`Question ${index + 1} ${questionEvaluations[answer.id] ? 'évaluée' : 'non évaluée'}`}
                            ></div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Bouton pour accéder à l'évaluation globale */}
                      {allQuestionsEvaluated && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setShowGlobalEvaluation(true);
                            loadGlobalEvaluation();
                          }}
                          className="w-100"
                        >
                          <i className="bi bi-clipboard-check me-2"></i>
                          Procéder à l'Évaluation Globale
                        </Button>
                      )}
                      
                      {!allQuestionsEvaluated && (
                        <Alert variant="info" className="mb-0 mt-2">
                          <i className="bi bi-info-circle me-2"></i>
                          Évaluez toutes les questions pour accéder à l'évaluation globale.
                        </Alert>
                      )}
                    </div>
                  </div>
                </Card.Body>
              </Card>
              
              {/* Bouton pour afficher l'évaluation globale */}
              <Card className="shadow-sm border-0 mb-4">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="fw-bold mb-1">
                        <i className="bi bi-clipboard-check me-2"></i>
                        Évaluation Globale de l'Entretien
                      </h6>
                      <p className="text-muted small mb-0">
                        Évaluez la performance globale du candidat sur l'ensemble de l'entretien
                      </p>
                    </div>
                    <Button 
                      variant={showGlobalEvaluation ? "outline-secondary" : "primary"}
                      onClick={() => {
                        setShowGlobalEvaluation(!showGlobalEvaluation);
                        if (!showGlobalEvaluation) {
                          loadGlobalEvaluation();
                        }
                      }}
                    >
                      {showGlobalEvaluation ? (
                        <>
                          <i className="bi bi-eye-slash me-2"></i>
                          Masquer l'évaluation
                        </>
                      ) : (
                        <>
                          <i className="bi bi-clipboard-check me-2"></i>
                          Évaluer globalement
                        </>
                      )}
                    </Button>
                  </div>
                </Card.Body>
              </Card>

              {/* Section d'évaluation globale */}
              {showGlobalEvaluation && (
                <Card className="shadow-sm border-0 mb-4">
                  <Card.Header className="bg-primary text-white">
                    <h5 className="mb-0">
                      <i className="bi bi-clipboard-check me-2"></i>
                      Évaluation Globale de l'Entretien
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    {/* Scores détaillés */}
                    <Row className="mb-4">
                      <Col md={6}>
                        <div className="mb-3">
                          <label className="form-label fw-bold text-secondary">
                            <i className="bi bi-gear me-2"></i>
                            Compétences Techniques
                          </label>
                          <Form.Range
                            min="0"
                            max="100"
                            value={globalEvaluation.technical_skills}
                            onChange={(e) => updateGlobalEvaluationField('technical_skills', parseInt(e.target.value))}
                          />
                          <div className="d-flex justify-content-between small text-muted">
                            <span>0</span>
                            <span className="fw-bold">{globalEvaluation.technical_skills}/100</span>
                            <span>100</span>
                          </div>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-3">
                          <label className="form-label fw-bold text-secondary">
                            <i className="bi bi-chat-dots me-2"></i>
                            Compétences de Communication
                          </label>
                          <Form.Range
                            min="0"
                            max="100"
                            value={globalEvaluation.communication_skills}
                            onChange={(e) => updateGlobalEvaluationField('communication_skills', parseInt(e.target.value))}
                          />
                          <div className="d-flex justify-content-between small text-muted">
                            <span>0</span>
                            <span className="fw-bold">{globalEvaluation.communication_skills}/100</span>
                            <span>100</span>
                          </div>
                        </div>
                      </Col>
                    </Row>

                    <Row className="mb-4">
                      <Col md={6}>
                        <div className="mb-3">
                          <label className="form-label fw-bold text-secondary">
                            <i className="bi bi-lightbulb me-2"></i>
                            Résolution de Problèmes
                          </label>
                          <Form.Range
                            min="0"
                            max="100"
                            value={globalEvaluation.problem_solving}
                            onChange={(e) => updateGlobalEvaluationField('problem_solving', parseInt(e.target.value))}
                          />
                          <div className="d-flex justify-content-between small text-muted">
                            <span>0</span>
                            <span className="fw-bold">{globalEvaluation.problem_solving}/100</span>
                            <span>100</span>
                          </div>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-3">
                          <label className="form-label fw-bold text-secondary">
                            <i className="bi bi-people me-2"></i>
                            Adéquation Culturelle
                          </label>
                          <Form.Range
                            min="0"
                            max="100"
                            value={globalEvaluation.cultural_fit}
                            onChange={(e) => updateGlobalEvaluationField('cultural_fit', parseInt(e.target.value))}
                          />
                          <div className="d-flex justify-content-between small text-muted">
                            <span>0</span>
                            <span className="fw-bold">{globalEvaluation.cultural_fit}/100</span>
                            <span>100</span>
                          </div>
                        </div>
                      </Col>
                    </Row>

                    <Row className="mb-4">
                      <Col md={6}>
                        <div className="mb-3">
                          <label className="form-label fw-bold text-secondary">
                            <i className="bi bi-fire me-2"></i>
                            Motivation
                          </label>
                          <Form.Range
                            min="0"
                            max="100"
                            value={globalEvaluation.motivation}
                            onChange={(e) => updateGlobalEvaluationField('motivation', parseInt(e.target.value))}
                          />
                          <div className="d-flex justify-content-between small text-muted">
                            <span>0</span>
                            <span className="fw-bold">{globalEvaluation.motivation}/100</span>
                            <span>100</span>
                          </div>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-3">
                          <label className="form-label fw-bold text-secondary">
                            <i className="bi bi-award me-2"></i>
                            Recommandation Finale
                          </label>
                          <Form.Select
                            value={globalEvaluation.final_recommendation || ''}
                            onChange={(e) => updateGlobalEvaluationField('final_recommendation', e.target.value)}
                          >
                            <option value="">Sélectionner...</option>
                            <option value="hire">Embaucher immédiatement</option>
                            <option value="second_interview">Convoquer pour un 2ème entretien</option>
                            <option value="consider">À considérer</option>
                            <option value="reject_politely">Rejeter poliment</option>
                            <option value="reject">Rejeter définitivement</option>
                          </Form.Select>
                        </div>
                      </Col>
                    </Row>

                    {/* Score global calculé */}
                    <div className="mb-4 p-3 bg-light rounded">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold">Score Global Calculé:</span>
                        <div className="d-flex align-items-center">
                          <span className="badge bg-primary fs-6 me-2">{calculateOverallScore()}/100</span>
                          <div className="progress" style={{ width: '100px', height: '8px' }}>
                            <div 
                              className="progress-bar" 
                              style={{ width: `${calculateOverallScore()}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Commentaires détaillés */}
                    <Row className="mb-4">
                      <Col md={6}>
                        <div className="mb-3">
                          <label className="form-label fw-bold text-success">
                            <i className="bi bi-plus-circle me-2"></i>
                            Points Forts
                          </label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            value={globalEvaluation.strengths || ''}
                            onChange={(e) => updateGlobalEvaluationField('strengths', e.target.value)}
                            placeholder="Décrivez les principales forces du candidat..."
                            style={{ resize: 'none' }}
                          />
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-3">
                          <label className="form-label fw-bold text-warning">
                            <i className="bi bi-exclamation-triangle me-2"></i>
                            Points d'Amélioration
                          </label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            value={globalEvaluation.weaknesses || ''}
                            onChange={(e) => updateGlobalEvaluationField('weaknesses', e.target.value)}
                            placeholder="Identifiez les axes d'amélioration..."
                            style={{ resize: 'none' }}
                          />
                        </div>
                      </Col>
                    </Row>

                    <Row className="mb-4">
                      <Col>
                        <div className="mb-3">
                          <label className="form-label fw-bold text-info">
                            <i className="bi bi-chat-text me-2"></i>
                            Commentaires Généraux
                          </label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            value={globalEvaluation.general_comments || ''}
                            onChange={(e) => updateGlobalEvaluationField('general_comments', e.target.value)}
                            placeholder="Commentaire général sur l'entretien et le candidat..."
                            style={{ resize: 'none' }}
                          />
                        </div>
                      </Col>
                    </Row>

                    <Row className="mb-4">
                      <Col>
                        <div className="mb-3">
                          <label className="form-label fw-bold text-secondary">
                            <i className="bi bi-arrow-right-circle me-2"></i>
                            Prochaines Étapes
                          </label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            value={globalEvaluation.next_steps || ''}
                            onChange={(e) => updateGlobalEvaluationField('next_steps', e.target.value)}
                            placeholder="Définissez les prochaines étapes du processus de recrutement..."
                            style={{ resize: 'none' }}
                          />
                        </div>
                      </Col>
                    </Row>

                    {/* Boutons d'action */}
                    <div className="d-grid gap-2">
                      <Button 
                        variant="success"
                        size="lg"
                        onClick={saveGlobalEvaluation}
                        disabled={savingGlobalEvaluation}
                      >
                        {savingGlobalEvaluation ? (
                          <>
                            <Spinner size="sm" className="me-2" />
                            Sauvegarde en cours...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-circle me-2"></i>
                            Sauvegarder l'Évaluation Globale
                          </>
                        )}
                      </Button>
                      {globalEvaluationSaved && (
                        <Alert variant="success" className="mb-0 mt-2">
                          <i className="bi bi-check-circle me-2"></i>
                          Évaluation globale sauvegardée avec succès!
                        </Alert>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              )}

            </>
          ) : null}

          {/* Decision Section - Simplified */}
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body>
              <h5 className="fw-bold mb-3">
                <i className="bi bi-clipboard-check me-2"></i>
                Décision finale
              </h5>
              
              <Row className="g-2">
                <Col md={3}>
                  <Button 
                    variant="success" 
                    className="w-100"
                    onClick={() => handleDecision('accept')}
                  >
                    <i className="bi bi-check-circle me-2"></i>
                    Accepter
                  </Button>
                </Col>
                <Col md={3}>
                  <Button 
                    variant="danger" 
                    className="w-100"
                    onClick={() => handleDecision('reject')}
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Refuser
                  </Button>
                </Col>
                <Col md={3}>
                  <Button 
                    variant="info" 
                    className="w-100"
                    onClick={() => setTechnicalInterviewModal(true)}
                  >
                    <i className="bi bi-calendar-event me-2"></i>
                    Entretien Technique
                  </Button>
                </Col>
                <Col md={3}>
                  <Button 
                    variant="secondary" 
                    className="w-100"
                    onClick={() => window.history.back()}
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    Retour
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Invite Manager Section */}
          <Card className="shadow-sm border-0">
            <Card.Body>
              <h6 className="fw-bold mb-3">
                <i className="bi bi-person-plus me-2"></i>
                Inviter manager
              </h6>
              <p className="small text-muted mb-3">
                Invitez un hiring manager à consulter cette évaluation
              </p>
              <Button 
                variant="outline-secondary" 
                className="w-100"
                onClick={() => setInviteManagerModal(true)}
              >
                <i className="bi bi-envelope me-2"></i>
                Envoyer invitation
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Invite Manager Modal */}
      {inviteManagerModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Inviter un manager</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setInviteManagerModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <Form onSubmit={(e) => {
                  e.preventDefault();
                  const email = e.target.managerEmail.value;
                  const message = e.target.message.value;
                  if (email) inviteManager(email, message);
                }}>
                  <div className="mb-3">
                    <label className="form-label">Email du manager</label>
                    <Form.Control
                      type="email"
                      name="managerEmail"
                      placeholder="manager@example.com"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Message (optionnel)</label>
                    <Form.Control
                      as="textarea"
                      name="message"
                      rows={3}
                      placeholder="Message personnalisé pour le manager..."
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <Button type="submit" variant="primary" className="flex-fill">
                      <i className="bi bi-envelope me-2"></i>
                      Envoyer invitation
                    </Button>
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={() => setInviteManagerModal(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                </Form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'entretien technique */}
      {technicalInterviewModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-calendar-event me-2"></i>
                  Programmer un entretien technique
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setTechnicalInterviewModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {application && (
                  <div className="candidate-info bg-light p-3 rounded mb-4">
                    <h6 className="fw-bold mb-2">Candidat sélectionné:</h6>
                    <div className="d-flex align-items-center">
                      <i className="bi bi-person-circle me-2" style={{ fontSize: '2rem' }}></i>
                      <div>
                        <div className="fw-bold">{application.candidate.first_name} {application.candidate.last_name}</div>
                        <small className="text-muted">{application.candidate.email}</small>
                      </div>
                    </div>
                  </div>
                )}
                
                <Form>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          <i className="bi bi-calendar3 me-2"></i>
                          Date de l'entretien *
                        </label>
                        <input 
                          type="date" 
                          className="form-control"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          <i className="bi bi-clock me-2"></i>
                          Heure *
                        </label>
                        <select 
                          className="form-control"
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          required
                        >
                          <option value="">Sélectionner l'heure</option>
                          <option value="09:00">09:00</option>
                          <option value="10:00">10:00</option>
                          <option value="11:00">11:00</option>
                          <option value="14:00">14:00</option>
                          <option value="15:00">15:00</option>
                          <option value="16:00">16:00</option>
                          <option value="17:00">17:00</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">
                      <i className="bi bi-geo-alt me-2"></i>
                      Lieu de l'entretien *
                    </label>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="Ex: Salle de réunion A, Visioconférence, Adresse..."
                      value={interviewLocation}
                      onChange={(e) => setInterviewLocation(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    Un email de confirmation sera automatiquement envoyé au candidat avec tous les détails de l'entretien technique.
                  </div>
                </Form>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setTechnicalInterviewModal(false)}
                >
                  Annuler
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={async () => {
                    if (selectedDate && selectedTime && interviewLocation) {
                      try {
                        // Appel API pour programmer l'entretien technique
                        await api.post(`/interviews/applications/${applicationId}/technical-interview/`, {
                          date: selectedDate,
                          time: selectedTime,
                          location: interviewLocation,
                          candidate_email: application.candidate.email
                        });
                        
                        // Mettre à jour le statut
                        await api.patch(`/interviews/applications/${applicationId}/`, { 
                          status: 'technical_interview' 
                        });
                        
                        setApplication(prev => ({
                          ...prev,
                          status: 'technical_interview'
                        }));
                        
                        alert(`Entretien technique programmé pour le ${selectedDate} à ${selectedTime}. Un email a été envoyé au candidat.`);
                        setTechnicalInterviewModal(false);
                        
                        // Réinitialiser les champs
                        setSelectedDate('');
                        setSelectedTime('');
                        setInterviewLocation('');
                      } catch (error) {
                        console.error('Erreur lors de la programmation:', error);
                        alert('Erreur lors de la programmation de l\'entretien technique.');
                      }
                    } else {
                      alert('Veuillez remplir tous les champs obligatoires.');
                    }
                  }}
                  disabled={!selectedDate || !selectedTime || !interviewLocation}
                >
                  <i className="bi bi-calendar-check me-2"></i>
                  Programmer l'entretien
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour afficher les détails complets du candidat */}
      <Modal
        show={showCandidateDetailsModal}
        onHide={() => setShowCandidateDetailsModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-person-lines-fill me-2"></i>
            Détails du candidat
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingCandidateDetails ? (
            <div className="text-center py-4">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Chargement...</span>
              </Spinner>
              <p className="mt-2 text-muted">Chargement des détails du candidat...</p>
            </div>
          ) : candidateDetails ? (
            <div>
              {/* Informations personnelles */}
              <div className="mb-4">
                <h6 className="fw-bold text-primary mb-3">
                  <i className="bi bi-person me-2"></i>
                  Informations personnelles
                </h6>
                <Row>
                  <Col md={6}>
                    <div className="mb-2">
                      <strong>Nom complet:</strong>
                      <div className="text-muted">
                        {candidateDetails.candidate.first_name && candidateDetails.candidate.last_name 
                          ? `${candidateDetails.candidate.first_name} ${candidateDetails.candidate.last_name}`
                          : candidateDetails.candidate.username}
                      </div>
                    </div>
                    <div className="mb-2">
                      <strong>Email:</strong>
                      <div className="text-muted">{candidateDetails.candidate.email}</div>
                    </div>
                    <div className="mb-2">
                      <strong>Téléphone:</strong>
                      <div className="text-muted">{candidateDetails.candidate.phone || 'Non renseigné'}</div>
                    </div>
                    <div className="mb-2">
                      <strong>Date de naissance:</strong>
                      <div className="text-muted">{candidateDetails.candidate.date_of_birth || 'Non renseignée'}</div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="mb-2">
                      <strong>Adresse:</strong>
                      <div className="text-muted">
                        {candidateDetails.candidate.address || 'Non renseignée'}
                        {candidateDetails.candidate.city && (
                          <div>{candidateDetails.candidate.city} {candidateDetails.candidate.postal_code}</div>
                        )}
                        {candidateDetails.candidate.country && (
                          <div>{candidateDetails.candidate.country}</div>
                        )}
                      </div>
                    </div>
                    <div className="mb-2">
                      <strong>Niveau d'éducation:</strong>
                      <div className="text-muted">{candidateDetails.candidate.education_level || 'Non renseigné'}</div>
                    </div>
                    <div className="mb-2">
                      <strong>Années d'expérience:</strong>
                      <div className="text-muted">{candidateDetails.candidate.experience_years || 'Non renseigné'}</div>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Lettre de motivation pour cette candidature */}
              {candidateDetails.applications.map((app, index) => {
                // Afficher seulement la candidature pour l'offre actuelle
                if (app.job_offer.id === application?.job_offer?.id) {
                  return (
                    <div key={app.id} className="mb-4">
                      <h6 className="fw-bold text-primary mb-3">
                        <i className="bi bi-file-text me-2"></i>
                        Lettre de motivation
                      </h6>
                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div>
                            <strong>Candidature pour: {app.job_offer.title}</strong>
                            <div className="text-muted small">
                              Candidature envoyée le {new Date(app.created_at).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                          <Badge bg={app.status === 'accepted' ? 'success' : app.status === 'rejected' ? 'danger' : 'warning'}>
                            {app.status_display}
                          </Badge>
                        </div>
                      </div>
                      
                      {app.filiere && (
                        <div className="mb-3">
                          <strong>Filière:</strong>
                          <div className="text-muted">{app.filiere}</div>
                        </div>
                      )}
                      
                      <div className="mb-0">
                        <div className="bg-white border p-4 rounded mt-2" style={{minHeight: '200px', lineHeight: '1.6'}}>
                          {app.lettre_motivation || 'Aucune lettre de motivation fournie.'}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <i className="bi bi-exclamation-triangle text-warning" style={{fontSize: '2rem'}}></i>
              <p className="mt-2 text-muted">Impossible de charger les détails du candidat</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCandidateDetailsModal(false)}>
            Fermer
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de confirmation pour accepter/refuser un candidat */}
      <Modal
        show={showConfirmationModal}
        onHide={() => {
          if (!processingAction) {
            setShowConfirmationModal(false);
            setConfirmationAction(null);
          }
        }}
        size="md"
        centered
        backdrop={processingAction ? "static" : true}
        keyboard={!processingAction}
      >
        <Modal.Header closeButton={!processingAction}>
          <Modal.Title>
            <i className={`bi ${confirmationAction === 'accept' ? 'bi-check-circle text-success' : 'bi-x-circle text-danger'} me-2`}></i>
            {confirmationAction === 'accept' ? 'Accepter le candidat' : 'Refuser le candidat'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {application && (
            <div>
              {/* Informations du candidat */}
              <div className="candidate-confirmation-info bg-light p-3 rounded mb-4">
                <div className="d-flex align-items-center mb-3">
                  <i className="bi bi-person-circle me-3" style={{ fontSize: '2.5rem', color: '#6c757d' }}></i>
                  <div>
                    <h6 className="mb-1 fw-bold">
                      {application.candidate.first_name && application.candidate.last_name 
                        ? `${application.candidate.first_name} ${application.candidate.last_name}`
                        : application.candidate.username}
                    </h6>
                    <small className="text-muted">{application.candidate.email}</small>
                  </div>
                </div>
                
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-2">
                      <strong>Offre d'emploi:</strong>
                      <div className="text-muted">{application.job_offer?.title}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-2">
                      <strong>Filière:</strong>
                      <div className="text-muted">{application.filiere || 'Non spécifiée'}</div>
                    </div>
                  </div>
                </div>
                
                <div className="mb-2">
                  <strong>Date de candidature:</strong>
                  <div className="text-muted">
                    {new Date(application.created_at).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              {/* Message de confirmation */}
              <div className={`alert ${confirmationAction === 'accept' ? 'alert-success' : 'alert-danger'} d-flex align-items-center`}>
                <i className={`bi ${confirmationAction === 'accept' ? 'bi-info-circle' : 'bi-exclamation-triangle'} me-2`}></i>
                <div>
                  {confirmationAction === 'accept' ? (
                    <div>
                      <strong>Êtes-vous sûr de vouloir accepter ce candidat ?</strong>
                      <div className="mt-2 small">
                        • Le candidat recevra une notification d'acceptation par email<br/>
                        • Son statut passera à "Accepté" dans le système<br/>
                        • Cette action est définitive
                      </div>
                    </div>
                  ) : (
                    <div>
                      <strong>Êtes-vous sûr de vouloir refuser ce candidat ?</strong>
                      <div className="mt-2 small">
                        • Le candidat recevra une notification de refus par email<br/>
                        • Son statut passera à "Refusé" dans le système<br/>
                        • Cette action est définitive
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {processingAction && (
                <div className="text-center py-3">
                  <Spinner animation="border" size="sm" className="me-2" />
                  <span>Traitement en cours...</span>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowConfirmationModal(false);
              setConfirmationAction(null);
            }}
            disabled={processingAction}
          >
            Annuler
          </Button>
          <Button 
            variant={confirmationAction === 'accept' ? 'success' : 'danger'}
            onClick={handleConfirmDecision}
            disabled={processingAction}
          >
            {processingAction ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Traitement...
              </>
            ) : (
              <>
                <i className={`bi ${confirmationAction === 'accept' ? 'bi-check-circle' : 'bi-x-circle'} me-2`}></i>
                {confirmationAction === 'accept' ? 'Confirmer l\'acceptation' : 'Confirmer le refus'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

    </Container>
    </div>
  );
};

export default InterviewDetails;