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
  const [candidateAnswers, setCandidateAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentComments, setCurrentComments] = useState('');
  const [overallScore, setOverallScore] = useState(0);
  const [overallComments, setOverallComments] = useState('');
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [currentVideoAnalysis, setCurrentVideoAnalysis] = useState(null);
  const [finalEvaluation, setFinalEvaluation] = useState({
    technical: 0,
    communication: 0,
    motivation: 0,
    style: 0,
    nonVerbal: 0,
    global: 0,
    generalComments: ''
  });
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

  // Fonction d'analyse IA pour la vidéo courante
  const analyzeCurrentVideo = async () => {
    if (!candidateAnswers[currentQuestionIndex]) return;
    
    setAnalyzingAI(true);
    try {
      const currentAnswer = candidateAnswers[currentQuestionIndex];
      
      if (!currentAnswer.video_url) {
        alert('Aucune vidéo disponible pour cette question');
        setAnalyzingAI(false);
        return;
      }

      // Appel à l'API d'évaluation IA réelle
      const evaluationRequest = {
        candidate_id: application.candidate.id,
        interview_answer_id: currentAnswer.id,
        video_url: currentAnswer.video_url,
        expected_skills: campaign?.expected_skills || ['Communication', 'Technique'],
        use_gemini: true
      };

      console.log('Sending AI evaluation request:', evaluationRequest);
      
      const response = await api.post('/interviews/ai/evaluate-video/', evaluationRequest);
      const aiEvaluation = response.data;
      
      console.log('AI evaluation response:', aiEvaluation);
      
      // Transformer la réponse pour l'affichage
      const analysis = {
        questionIndex: currentQuestionIndex + 1,
        duration: currentAnswer.duration || 0,
        strengths: [
          aiEvaluation.ai_score >= 80 ? "Excellente performance" : "Performance satisfaisante",
          "Transcription claire: " + (aiEvaluation.transcription ? aiEvaluation.transcription.substring(0, 50) + '...' : 'Non disponible'),
          "Analyse IA complète effectuée"
        ],
        weaknesses: [
          aiEvaluation.ai_score < 60 ? "Points à améliorer identifiés" : "Quelques optimisations possibles",
          "Durée de traitement: " + (aiEvaluation.processing_time || 'N/A') + 's'
        ],
        suggestedScore: Math.ceil(aiEvaluation.ai_score / 20), // Convertir 0-100 en 1-5
        aiComment: aiEvaluation.ai_feedback || 'Analyse IA effectuée avec succès',
        fullEvaluation: aiEvaluation
      };
      
      setCurrentVideoAnalysis(analysis);
    } catch (error) {
      console.error('Erreur lors de l\'analyse IA:', error);
      
      let errorMessage = 'Erreur lors de l\'analyse IA';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 400) {
        errorMessage = 'Données invalides pour l\'analyse IA';
      } else if (error.response?.status === 500) {
        errorMessage = 'Erreur serveur lors de l\'analyse IA';
      }
      
      alert(errorMessage);
    } finally {
      setAnalyzingAI(false);
    }
  };

  // Fonction d'analyse IA globale améliorée
  const analyzeWithAI = async () => {
    setAnalyzingAI(true);
    try {
      if (!candidateAnswers.length) {
        alert('Aucune réponse vidéo disponible pour l\'analyse');
        setAnalyzingAI(false);
        return;
      }

      // Analyser chaque vidéo avec l'IA si pas encore fait
      const aiEvaluations = [];
      const evaluationDetails = {
        totalScore: 0,
        evaluatedCount: 0,
        transcriptionQuality: 0,
        communicationScores: [],
        technicalScores: [],
        motivationScores: [],
        feedbackKeywords: new Set()
      };
      
      for (const answer of candidateAnswers) {
        if (answer.video_url) {
          try {
            console.log(`Analyzing video for answer ${answer.id} - Question: ${answer.question?.text?.substring(0, 50)}...`);
            
            const evaluationRequest = {
              candidate_id: application.candidate.id,
              interview_answer_id: answer.id,
              video_url: answer.video_url,
              expected_skills: campaign?.expected_skills || [
                'Communication',
                'Compétences techniques',
                'Motivation et engagement',
                'Présentation professionnelle'
              ],
              use_gemini: true
            };

            const response = await api.post('/interviews/ai/evaluate-video/', evaluationRequest);
            const evaluation = response.data;
            
            aiEvaluations.push({
              ...evaluation,
              questionText: answer.question?.text || 'Question non disponible',
              questionId: answer.question?.id
            });
            
            // Analyser les détails de l'évaluation
            const score = evaluation.ai_score || 0;
            evaluationDetails.totalScore += score;
            evaluationDetails.evaluatedCount++;
            
            // Analyser la qualité de la transcription
            if (evaluation.transcription) {
              const transcriptionLength = evaluation.transcription.length;
              evaluationDetails.transcriptionQuality += transcriptionLength > 100 ? 3 : transcriptionLength > 50 ? 2 : 1;
            }
            
            // Extraire les scores par catégorie basés sur le feedback
            const feedback = evaluation.ai_feedback?.toLowerCase() || '';
            
            // Score communication (basé sur clarté, articulation, etc.)
            let commScore = score;
            if (feedback.includes('claire') || feedback.includes('articul') || feedback.includes('fluide')) commScore += 10;
            if (feedback.includes('hésit') || feedback.includes('confus')) commScore -= 10;
            evaluationDetails.communicationScores.push(Math.max(0, Math.min(100, commScore)));
            
            // Score technique (basé sur contenu technique)
            let techScore = score;
            if (feedback.includes('technique') || feedback.includes('compétent') || feedback.includes('maîtrise')) techScore += 5;
            if (feedback.includes('manque') || feedback.includes('insuffisant')) techScore -= 15;
            evaluationDetails.technicalScores.push(Math.max(0, Math.min(100, techScore)));
            
            // Score motivation (basé sur enthousiasme, engagement)
            let motivScore = score;
            if (feedback.includes('motivé') || feedback.includes('enthousiaste') || feedback.includes('passionné')) motivScore += 15;
            if (feedback.includes('peu motivé') || feedback.includes('désintéressé')) motivScore -= 20;
            evaluationDetails.motivationScores.push(Math.max(0, Math.min(100, motivScore)));
            
            // Extraire les mots-clés du feedback
            const keywords = feedback.match(/\b(excellent|bon|satisfaisant|insuffisant|faible|technique|communication|motivé|professionnel)\w*/g);
            if (keywords) {
              keywords.forEach(keyword => evaluationDetails.feedbackKeywords.add(keyword));
            }
            
            console.log(`Video ${answer.id} evaluated - Score: ${score}, Transcription: ${evaluation.transcription?.length || 0} chars`);
          } catch (error) {
            console.error(`Error evaluating video ${answer.id}:`, error);
            // Ajouter une évaluation par défaut pour maintenir la cohérence
            aiEvaluations.push({
              ai_score: null,
              ai_feedback: `Erreur lors de l'analyse: ${error.message}`,
              transcription: null,
              questionText: answer.question?.text || 'Question non disponible',
              questionId: answer.question?.id,
              error: true
            });
          }
        }
      }
      
      if (evaluationDetails.evaluatedCount === 0) {
        alert('Aucune vidéo n\'a pu être analysée par l\'IA');
        setAnalyzingAI(false);
        return;
      }
      
      // Calculer les scores moyens réels
      const avgScore = evaluationDetails.totalScore / evaluationDetails.evaluatedCount;
      const avgCommunication = evaluationDetails.communicationScores.length > 0 
        ? evaluationDetails.communicationScores.reduce((a, b) => a + b, 0) / evaluationDetails.communicationScores.length 
        : avgScore;
      const avgTechnical = evaluationDetails.technicalScores.length > 0 
        ? evaluationDetails.technicalScores.reduce((a, b) => a + b, 0) / evaluationDetails.technicalScores.length 
        : avgScore;
      const avgMotivation = evaluationDetails.motivationScores.length > 0 
        ? evaluationDetails.motivationScores.reduce((a, b) => a + b, 0) / evaluationDetails.motivationScores.length 
        : avgScore;
      
      // Analyser les transcriptions et feedbacks
      const allFeedbacks = aiEvaluations.filter(evaluation => evaluation.ai_feedback && !evaluation.error).map(evaluation => evaluation.ai_feedback);
      const allTranscriptions = aiEvaluations.filter(evaluation => evaluation.transcription && !evaluation.error).map(evaluation => evaluation.transcription);
      const keywordArray = Array.from(evaluationDetails.feedbackKeywords);
      
      // Générer une analyse plus intelligente basée sur les vraies données
      const generateSmartAnalysis = () => {
        const strengths = [];
        const weaknesses = [];
        
        // Points forts basés sur les scores réels
        if (avgScore >= 80) {
          strengths.push("Performance globale excellente");
        } else if (avgScore >= 65) {
          strengths.push("Performance globale satisfaisante");
        } else if (avgScore >= 50) {
          strengths.push("Effort notable avec du potentiel");
        }
        
        if (avgCommunication >= 70) {
          strengths.push("Excellentes compétences de communication");
        }
        
        if (avgTechnical >= 70) {
          strengths.push("Solides compétences techniques");
        }
        
        if (avgMotivation >= 75) {
          strengths.push("Motivation et engagement évidents");
        }
        
        if (allTranscriptions.length === evaluationDetails.evaluatedCount) {
          strengths.push("Communication claire et audible sur toutes les réponses");
        }
        
        if (keywordArray.includes('excellent') || keywordArray.includes('bon')) {
          strengths.push("Feedback IA positif sur plusieurs aspects");
        }
        
        // Points faibles basés sur les scores réels
        if (avgScore < 50) {
          weaknesses.push("Performance globale à améliorer");
        }
        
        if (avgCommunication < 60) {
          weaknesses.push("Compétences de communication à développer");
        }
        
        if (avgTechnical < 60) {
          weaknesses.push("Compétences techniques à renforcer");
        }
        
        if (avgMotivation < 60) {
          weaknesses.push("Motivation à démontrer davantage");
        }
        
        if (allTranscriptions.length < evaluationDetails.evaluatedCount) {
          weaknesses.push(`Qualité audio/transcription à améliorer (${allTranscriptions.length}/${evaluationDetails.evaluatedCount} réponses transcrites)`);
        }
        
        if (keywordArray.includes('insuffisant') || keywordArray.includes('faible')) {
          weaknesses.push("Points d'amélioration identifiés par l'IA");
        }
        
        return { strengths, weaknesses };
      };
      
      const smartAnalysis = generateSmartAnalysis();
      
      // Générer l'analyse globale cohérente
      const globalAnalysis = {
        strengths: smartAnalysis.strengths.length > 0 ? smartAnalysis.strengths : ["Candidat évalué par l'IA"],
        weaknesses: smartAnalysis.weaknesses.length > 0 ? smartAnalysis.weaknesses : ["Aucun point faible majeur identifié"],
        comment: `Analyse IA détaillée sur ${evaluationDetails.evaluatedCount} réponse(s) vidéo. Score moyen global: ${avgScore.toFixed(1)}/100. Communication: ${avgCommunication.toFixed(1)}/100. Technique: ${avgTechnical.toFixed(1)}/100. Motivation: ${avgMotivation.toFixed(1)}/100. ${avgScore >= 75 ? 'Le candidat démontre une excellente maîtrise globale avec des compétences solides.' : avgScore >= 60 ? 'Le candidat présente un profil satisfaisant avec des axes d\'amélioration identifiés.' : 'Le candidat nécessite un accompagnement pour développer ses compétences clés.'}`,
        detailedFeedback: allFeedbacks.join(' | '),
        keyInsights: keywordArray.slice(0, 5), // Top 5 mots-clés
        scores: {
          technique: Math.max(1, Math.min(20, Math.round(avgTechnical / 5))),
          communication: Math.max(1, Math.min(20, Math.round(avgCommunication / 5))),
          motivation: Math.max(1, Math.min(20, Math.round(avgMotivation / 5))),
          style: Math.max(1, Math.min(20, Math.round((avgCommunication + avgMotivation) / 10))),
          nonVerbal: Math.max(1, Math.min(20, Math.round((avgScore - 5) / 5))), // Légèrement inférieur au score global
          global: Math.max(1, Math.min(20, Math.round(avgScore / 5)))
        },
        statistics: {
          totalEvaluated: evaluationDetails.evaluatedCount,
          totalAnswers: candidateAnswers.length,
          transcriptionSuccess: allTranscriptions.length,
          averageScores: {
            global: avgScore,
            communication: avgCommunication,
            technical: avgTechnical,
            motivation: avgMotivation
          }
        },
        aiEvaluations: aiEvaluations // Stocker les évaluations détaillées
      };
      
      setAiAnalysis(globalAnalysis);
      setFinalEvaluation(prev => ({
        ...prev,
        technical: globalAnalysis.scores.technique,
        communication: globalAnalysis.scores.communication,
        motivation: globalAnalysis.scores.motivation,
        style: globalAnalysis.scores.style,
        nonVerbal: globalAnalysis.scores.nonVerbal,
        global: globalAnalysis.scores.global
      }));
      
    } catch (error) {
      console.error('Erreur lors de l\'analyse IA globale:', error);
      
      let errorMessage = 'Erreur lors de l\'analyse IA globale';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      alert(errorMessage);
    } finally {
      setAnalyzingAI(false);
    }
  };

  // Fonction pour sauvegarder l'évaluation finale
  const saveFinalEvaluation = async () => {
    try {
      const evaluationData = {
        application_id: applicationId,
        technical_score: finalEvaluation.technical,
        communication_score: finalEvaluation.communication,
        motivation_score: finalEvaluation.motivation,
        style_score: finalEvaluation.style,
        non_verbal_score: finalEvaluation.nonVerbal,
        global_score: finalEvaluation.global,
        general_comments: finalEvaluation.generalComments,
        ai_analysis: aiAnalysis
      };
      
      console.log('Sauvegarde de l\'évaluation finale:', evaluationData);
      // TODO: Ajouter l'appel API réel
      // await api.post(`/interviews/applications/${applicationId}/evaluation/`, evaluationData);
      
      alert('Évaluation sauvegardée avec succès!');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

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
    } finally {
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
          
          {candidateAnswers.length > 0 && currentAnswer ? (
            <>
              {/* Current Question Score */}
              <Card className="shadow-sm border-0 mb-4">
                <Card.Body>
                  <h6 className="fw-bold mb-3">Score for Question {currentQuestionIndex + 1}</h6>
                  
                  <div className="mb-3">
                    <label className="form-label small text-muted">Rating (1-5 stars)</label>
                    <div className="star-rating d-flex align-items-center mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <i
                          key={star}
                          className={`bi ${star <= currentScore ? 'bi-star-fill' : 'bi-star'} text-warning me-1`}
                          style={{ fontSize: '1.2rem', cursor: 'pointer' }}
                          onClick={() => setCurrentScore(star)}
                        ></i>
                      ))}
                      <span className="ms-2 text-muted">({currentScore}/5)</span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label small text-muted">Comments</label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      placeholder="Add specific feedback for this answer..."
                      value={currentComments}
                      onChange={(e) => setCurrentComments(e.target.value)}
                      style={{ resize: 'none', fontSize: '0.9rem' }}
                    />
                    <div className="text-end mt-1">
                      <small className="text-muted">{currentComments.length}/500</small>
                    </div>
                  </div>
                  
                  <div className="d-grid gap-2">
                    <Button 
                      variant="primary"
                      onClick={() => {
                        // Save current question score
                        const updatedAnswers = [...candidateAnswers];
                        updatedAnswers[currentQuestionIndex] = {
                          ...updatedAnswers[currentQuestionIndex],
                          score: currentScore * 20, // Convert 1-5 to 0-100
                          recruiter_notes: currentComments
                        };
                        setCandidateAnswers(updatedAnswers);
                      }}
                    >
                      <i className="bi bi-save me-2"></i>
                      Save Score & Comment
                    </Button>
                    
                    <Button 
                      variant="outline-info"
                      onClick={() => analyzeCurrentVideo()}
                      disabled={analyzingAI}
                    >
                      {analyzingAI ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-robot me-2"></i>
                          AI Analysis
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Affichage de l'analyse IA de la vidéo courante */}
                  {currentVideoAnalysis && (
                    <div className="mt-4 p-3 bg-light rounded">
                      <h6 className="fw-bold text-info mb-3">
                        <i className="bi bi-robot me-2"></i>
                        AI Analysis - Question {currentVideoAnalysis.questionIndex}
                      </h6>
                      
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <strong className="text-success">Strengths:</strong>
                            <ul className="mt-2 mb-0">
                              {currentVideoAnalysis.strengths.map((strength, index) => (
                                <li key={index} className="small">{strength}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <strong className="text-warning">Areas for improvement:</strong>
                            <ul className="mt-2 mb-0">
                              {currentVideoAnalysis.weaknesses.map((weakness, index) => (
                                <li key={index} className="small">{weakness}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <strong>AI Suggested Score:</strong>
                        <div className="d-flex align-items-center mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <i
                              key={star}
                              className={`bi ${star <= currentVideoAnalysis.suggestedScore ? 'bi-star-fill' : 'bi-star'} text-warning me-1`}
                            ></i>
                          ))}
                          <span className="ms-2 text-muted">({currentVideoAnalysis.suggestedScore}/5)</span>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <strong>AI Comment:</strong>
                        <p className="mt-1 mb-0 small text-muted">{currentVideoAnalysis.aiComment}</p>
                      </div>
                      
                      {currentVideoAnalysis.fullEvaluation && (
                        <div className="mb-3">
                          <strong>Détails IA:</strong>
                          <div className="small text-muted mt-1">
                            <div><strong>Score IA:</strong> {currentVideoAnalysis.fullEvaluation.ai_score}/100</div>
                            <div><strong>Fournisseur:</strong> {currentVideoAnalysis.fullEvaluation.ai_provider}</div>
                            <div><strong>Temps de traitement:</strong> {currentVideoAnalysis.fullEvaluation.processing_time}s</div>
                            {currentVideoAnalysis.fullEvaluation.transcription && (
                              <div className="mt-2">
                                <strong>Transcription:</strong>
                                <div className="bg-light p-2 rounded mt-1" style={{maxHeight: '100px', overflowY: 'auto'}}>
                                  {currentVideoAnalysis.fullEvaluation.transcription}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <Button 
                        size="sm" 
                        variant="outline-primary"
                        onClick={() => {
                          setCurrentScore(currentVideoAnalysis.suggestedScore);
                          setCurrentComments(currentVideoAnalysis.aiComment);
                        }}
                      >
                        <i className="bi bi-check2 me-1"></i>
                        Apply AI Suggestions
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>

              {/* Overall Interview Evaluation */}
              <Card className="shadow-sm border-0 mb-4">
                <Card.Body>
                  <h6 className="fw-bold mb-3">Overall Interview Evaluation</h6>
                  
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small text-muted">Current Overall: {overallScore}/5</span>
                      <div className="d-flex">
                        <i className="bi bi-star-fill text-warning me-1"></i>
                        <span className="fw-bold">{overallScore}</span>
                      </div>
                    </div>
                    <div className="star-rating d-flex align-items-center mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <i
                          key={star}
                          className={`bi ${star <= overallScore ? 'bi-star-fill' : 'bi-star'} text-warning me-1`}
                          style={{ fontSize: '1.2rem', cursor: 'pointer' }}
                          onClick={() => setOverallScore(star)}
                        ></i>
                      ))}
                      <span className="ms-2 text-muted">({overallScore}/5)</span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label small text-muted">General Comments</label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      placeholder="Overall feedback and recommendations..."
                      value={overallComments}
                      onChange={(e) => setOverallComments(e.target.value)}
                      style={{ resize: 'none', fontSize: '0.9rem' }}
                    />
                    <div className="text-end mt-1">
                      <small className="text-muted">{overallComments.length}/1000</small>
                    </div>
                  </div>
                  
                  <div className="d-flex gap-2">
                    <Button 
                      variant="outline-secondary" 
                      className="flex-fill"
                      onClick={() => {
                        const updatedAnswers = [...candidateAnswers];
                        updatedAnswers[currentQuestionIndex] = {
                          ...updatedAnswers[currentQuestionIndex],
                          score: overallScore * 20,
                          recruiter_notes: overallComments
                        };
                        setCandidateAnswers(updatedAnswers);
                      }}
                    >
                      <i className="bi bi-save me-2"></i>
                      Save
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </>
          ) : null}

          {/* AI Analysis Section - Redesigned */}
          <Card className="shadow-lg border-0 mb-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <Card.Body className="text-white">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h4 className="fw-bold mb-1 text-white">
                    <i className="bi bi-cpu me-2"></i>
                    Analyse IA Dynamique
                  </h4>
                  <small className="opacity-75">Évaluation intelligente basée sur Google Gemini</small>
                </div>
                <Button 
                  variant="light" 
                  size="lg"
                  onClick={analyzeWithAI}
                  disabled={analyzingAI || !candidateAnswers.length}
                  className="px-4 py-2 fw-bold"
                >
                  {analyzingAI ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-stars me-2"></i>
                      Lancer l'Analyse IA
                    </>
                  )}
                </Button>
              </div>
              
              {!candidateAnswers.length && (
                <div className="text-center py-4">
                  <i className="bi bi-camera-video-off" style={{ fontSize: '3rem', opacity: 0.5 }}></i>
                  <p className="mt-3 mb-0 opacity-75">Aucune réponse vidéo disponible pour l'analyse IA</p>
                </div>
              )}
              
              {aiAnalysis && (
                <div className="bg-white rounded-4 p-4 mt-4">
                  {/* Score Global IA */}
                  <div className="text-center mb-4">
                    <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10" style={{ width: '120px', height: '120px' }}>
                      <div className="text-center">
                        <div className="display-4 fw-bold text-primary">{aiAnalysis.statistics?.averageScores?.global?.toFixed(0) || '85'}</div>
                        <small className="text-muted fw-bold">Score IA</small>
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill">
                        <i className="bi bi-cpu me-1"></i>
                        Analysé par {aiAnalysis.aiProvider || 'Google Gemini'}
                      </span>
                    </div>
                  </div>

                  <Row className="g-4">
                    <Col md={6}>
                      <div className="h-100">
                        <div className="d-flex align-items-center mb-3">
                          <div className="bg-success bg-opacity-10 rounded-circle p-2 me-3">
                            <i className="bi bi-check-circle-fill text-success"></i>
                          </div>
                          <h6 className="fw-bold mb-0 text-success">Points forts identifiés</h6>
                        </div>
                        {aiAnalysis.strengths?.length > 0 ? (
                          <div className="space-y-2">
                            {aiAnalysis.strengths.map((strength, index) => (
                              <div key={index} className="d-flex align-items-start mb-2">
                                <i className="bi bi-star-fill text-warning me-2 mt-1" style={{ fontSize: '0.8rem' }}></i>
                                <span className="text-dark">{strength}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-3 text-muted">
                            <i className="bi bi-search mb-2" style={{ fontSize: '1.5rem' }}></i>
                            <p className="mb-0 fst-italic">Analyse en cours...</p>
                          </div>
                        )}
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="h-100">
                        <div className="d-flex align-items-center mb-3">
                          <div className="bg-warning bg-opacity-10 rounded-circle p-2 me-3">
                            <i className="bi bi-lightbulb-fill text-warning"></i>
                          </div>
                          <h6 className="fw-bold mb-0 text-warning">Axes d'amélioration</h6>
                        </div>
                        {aiAnalysis.weaknesses?.length > 0 ? (
                          <div className="space-y-2">
                            {aiAnalysis.weaknesses.map((weakness, index) => (
                              <div key={index} className="d-flex align-items-start mb-2">
                                <i className="bi bi-arrow-up-right text-info me-2 mt-1" style={{ fontSize: '0.8rem' }}></i>
                                <span className="text-dark">{weakness}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-3 text-muted">
                            <i className="bi bi-shield-check mb-2" style={{ fontSize: '1.5rem' }}></i>
                            <p className="mb-0 fst-italic">Profil solide détecté</p>
                          </div>
                        )}
                      </div>
                    </Col>
                  </Row>

                  {/* Métriques IA détaillées */}
                  {aiAnalysis.statistics && (
                    <div className="mt-4 pt-4 border-top">
                      <div className="d-flex align-items-center mb-3">
                        <i className="bi bi-graph-up-arrow text-primary me-2"></i>
                        <h6 className="fw-bold mb-0">Métriques d'analyse</h6>
                      </div>
                      <Row className="g-3">
                        <Col xs={6} md={3}>
                          <div className="text-center p-3 bg-primary bg-opacity-5 rounded-3 border border-primary border-opacity-25">
                            <i className="bi bi-camera-video text-primary mb-2" style={{ fontSize: '1.5rem' }}></i>
                            <div className="fw-bold text-primary h5 mb-1">{aiAnalysis.statistics.totalEvaluated}</div>
                            <small className="text-muted">Vidéos analysées</small>
                          </div>
                        </Col>
                        <Col xs={6} md={3}>
                          <div className="text-center p-3 bg-success bg-opacity-5 rounded-3 border border-success border-opacity-25">
                            <i className="bi bi-mic text-success mb-2" style={{ fontSize: '1.5rem' }}></i>
                            <div className="fw-bold text-success h5 mb-1">{aiAnalysis.statistics.transcriptionSuccess || 0}</div>
                            <small className="text-muted">Transcriptions</small>
                          </div>
                        </Col>
                        <Col xs={6} md={3}>
                          <div className="text-center p-3 bg-info bg-opacity-5 rounded-3 border border-info border-opacity-25">
                            <i className="bi bi-clock text-info mb-2" style={{ fontSize: '1.5rem' }}></i>
                            <div className="fw-bold text-info h5 mb-1">{aiAnalysis.statistics.processingTime || '2.3'}s</div>
                            <small className="text-muted">Temps d'analyse</small>
                          </div>
                        </Col>
                        <Col xs={6} md={3}>
                          <div className="text-center p-3 bg-warning bg-opacity-5 rounded-3 border border-warning border-opacity-25">
                            <i className="bi bi-cpu text-warning mb-2" style={{ fontSize: '1.5rem' }}></i>
                            <div className="fw-bold text-warning h5 mb-1">AI</div>
                            <small className="text-muted">Modèle utilisé</small>
                          </div>
                        </Col>
                      </Row>
                      
                      {/* Scores détaillés par compétence */}
                      <div className="mt-4">
                        <h6 className="fw-bold mb-3 d-flex align-items-center">
                          <i className="bi bi-bar-chart text-primary me-2"></i>
                          Évaluation par compétences
                        </h6>
                        <Row className="g-3">
                          <Col md={6}>
                            <div className="mb-3">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="fw-medium">🗣️ Communication</span>
                                <span className="badge bg-success">{aiAnalysis.statistics.averageScores.communication.toFixed(0)}/100</span>
                              </div>
                              <div className="progress" style={{ height: '8px' }}>
                                <div className="progress-bar bg-gradient" style={{ 
                                  width: `${aiAnalysis.statistics.averageScores.communication}%`,
                                  background: 'linear-gradient(90deg, #28a745, #20c997)'
                                }}></div>
                              </div>
                            </div>
                            <div className="mb-3">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="fw-medium">💡 Motivation</span>
                                <span className="badge bg-info">{aiAnalysis.statistics.averageScores.motivation.toFixed(0)}/100</span>
                              </div>
                              <div className="progress" style={{ height: '8px' }}>
                                <div className="progress-bar bg-gradient" style={{ 
                                  width: `${aiAnalysis.statistics.averageScores.motivation}%`,
                                  background: 'linear-gradient(90deg, #17a2b8, #6f42c1)'
                                }}></div>
                              </div>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="mb-3">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="fw-medium">⚙️ Technique</span>
                                <span className="badge bg-warning">{aiAnalysis.statistics.averageScores.technical.toFixed(0)}/100</span>
                              </div>
                              <div className="progress" style={{ height: '8px' }}>
                                <div className="progress-bar bg-gradient" style={{ 
                                  width: `${aiAnalysis.statistics.averageScores.technical}%`,
                                  background: 'linear-gradient(90deg, #ffc107, #fd7e14)'
                                }}></div>
                              </div>
                            </div>
                            <div className="mb-3">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="fw-medium">🎯 Score Global</span>
                                <span className="badge bg-primary">{aiAnalysis.statistics.averageScores.global.toFixed(0)}/100</span>
                              </div>
                              <div className="progress" style={{ height: '8px' }}>
                                <div className="progress-bar bg-gradient" style={{ 
                                  width: `${aiAnalysis.statistics.averageScores.global}%`,
                                  background: 'linear-gradient(90deg, #007bff, #6f42c1)'
                                }}></div>
                              </div>
                            </div>
                          </Col>
                        </Row>
                      </div>
                    </div>
                  )}

                  {/* Insights et mots-clés */}
                  {aiAnalysis.keyInsights && aiAnalysis.keyInsights.length > 0 && (
                    <div className="mt-4 pt-4 border-top">
                      <h6 className="fw-bold mb-3 d-flex align-items-center">
                        <i className="bi bi-lightbulb text-warning me-2"></i>
                        Insights détectés par l'IA
                      </h6>
                      <div className="d-flex flex-wrap gap-2">
                        {aiAnalysis.keyInsights.map((keyword, index) => (
                          <span key={index} className="badge bg-gradient px-3 py-2 rounded-pill" style={{
                            background: `linear-gradient(45deg, hsl(${index * 137.5 % 360}, 70%, 60%), hsl(${(index * 137.5 + 60) % 360}, 70%, 70%))`,
                            color: 'white',
                            fontSize: '0.85rem'
                          }}>
                            <i className="bi bi-tag-fill me-1"></i>
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <h6 className="fw-bold">
                      <i className="bi bi-chat-text me-2"></i>
                      Commentaire détaillé
                    </h6>
                    <div className="bg-light p-3 rounded">
                      <p className="mb-0">{aiAnalysis.comment}</p>
                    </div>
                  </div>

                  {/* Feedback IA détaillé */}
                  {aiAnalysis.detailedFeedback && (
                    <div className="mt-4">
                      <div className="bg-light bg-opacity-50 rounded-4 p-4 border border-primary border-opacity-25">
                        <div className="d-flex align-items-center mb-3">
                          <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                            <i className="bi bi-chat-dots-fill text-primary"></i>
                          </div>
                          <div>
                            <h6 className="fw-bold mb-1">Analyse détaillée de l'IA</h6>
                            <small className="text-muted">
                              <i className="bi bi-cpu me-1"></i>
                              Générée par {aiAnalysis.aiProvider || 'Google Gemini'}
                            </small>
                          </div>
                        </div>
                        <div className="bg-white rounded-3 p-3 border border-light">
                          <div className="text-dark" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', fontSize: '0.95rem' }}>
                            {aiAnalysis.detailedFeedback}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="ai-scores">
                    <h6 className="fw-bold mb-3">Scores IA (/20)</h6>
                    <Row className="g-2">
                      <Col xs={4}>
                        <div className="text-center p-2 bg-light rounded">
                          <div className="fw-bold text-primary">{aiAnalysis.scores.technique}/20</div>
                          <small className="text-muted">Technique</small>
                        </div>
                      </Col>
                      <Col xs={4}>
                        <div className="text-center p-2 bg-light rounded">
                          <div className="fw-bold text-primary">{aiAnalysis.scores.communication}/20</div>
                          <small className="text-muted">Communication</small>
                        </div>
                      </Col>
                      <Col xs={4}>
                        <div className="text-center p-2 bg-light rounded">
                          <div className="fw-bold text-primary">{aiAnalysis.scores.motivation}/20</div>
                          <small className="text-muted">Motivation</small>
                        </div>
                      </Col>
                      <Col xs={4}>
                        <div className="text-center p-2 bg-light rounded">
                          <div className="fw-bold text-primary">{aiAnalysis.scores.style}/20</div>
                          <small className="text-muted">Style</small>
                        </div>
                      </Col>
                      <Col xs={4}>
                        <div className="text-center p-2 bg-light rounded">
                          <div className="fw-bold text-primary">{aiAnalysis.scores.nonVerbal}/20</div>
                          <small className="text-muted">Non-verbal</small>
                        </div>
                      </Col>
                      <Col xs={4}>
                        <div className="text-center p-2 bg-primary text-white rounded">
                          <div className="fw-bold">{aiAnalysis.scores.global}/20</div>
                          <small>Global</small>
                        </div>
                      </Col>
                    </Row>
                    
                    {aiAnalysis.aiEvaluations && aiAnalysis.aiEvaluations.length > 0 && (
                      <div className="mt-4">
                        <h6 className="fw-bold mb-3">Détails par réponse</h6>
                        <div className="accordion" id="aiEvaluationsAccordion">
                          {aiAnalysis.aiEvaluations.map((evaluation, index) => (
                            <div key={index} className="accordion-item">
                              <h2 className="accordion-header">
                                <button 
                                  className="accordion-button collapsed" 
                                  type="button" 
                                  data-bs-toggle="collapse" 
                                  data-bs-target={`#collapse${index}`}
                                >
                                  <strong>Réponse {index + 1} - Score: {evaluation.ai_score}/100</strong>
                                </button>
                              </h2>
                              <div 
                                id={`collapse${index}`} 
                                className="accordion-collapse collapse" 
                                data-bs-parent="#aiEvaluationsAccordion"
                              >
                                <div className="accordion-body">
                                  <div className="mb-2">
                                    <strong>Feedback IA:</strong>
                                    <p className="mt-1 mb-2">{evaluation.ai_feedback}</p>
                                  </div>
                                  <div className="mb-2">
                                    <strong>Fournisseur:</strong> {evaluation.ai_provider}
                                  </div>
                                  <div className="mb-2">
                                    <strong>Temps de traitement:</strong> {evaluation.processing_time}s
                                  </div>
                                  {evaluation.transcription && (
                                    <div>
                                      <strong>Transcription:</strong>
                                      <div className="bg-light p-2 rounded mt-1" style={{maxHeight: '150px', overflowY: 'auto'}}>
                                        {evaluation.transcription}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>

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
            Détails complets du candidat
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

              {/* Profils professionnels */}
              {(candidateDetails.candidate.linkedin_profile || candidateDetails.candidate.github_profile || candidateDetails.candidate.portfolio_url) && (
                <div className="mb-4">
                  <h6 className="fw-bold text-primary mb-3">
                    <i className="bi bi-globe me-2"></i>
                    Profils professionnels
                  </h6>
                  <div className="d-flex gap-3 flex-wrap">
                    {candidateDetails.candidate.linkedin_profile && (
                      <a href={candidateDetails.candidate.linkedin_profile} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary btn-sm">
                        <i className="bi bi-linkedin me-1"></i>
                        LinkedIn
                      </a>
                    )}
                    {candidateDetails.candidate.github_profile && (
                      <a href={candidateDetails.candidate.github_profile} target="_blank" rel="noopener noreferrer" className="btn btn-outline-dark btn-sm">
                        <i className="bi bi-github me-1"></i>
                        GitHub
                      </a>
                    )}
                    {candidateDetails.candidate.portfolio_url && (
                      <a href={candidateDetails.candidate.portfolio_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline-info btn-sm">
                        <i className="bi bi-briefcase me-1"></i>
                        Portfolio
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Compétences */}
              {candidateDetails.candidate.skills && (
                <div className="mb-4">
                  <h6 className="fw-bold text-primary mb-3">
                    <i className="bi bi-tools me-2"></i>
                    Compétences
                  </h6>
                  <div className="bg-light p-3 rounded">
                    {candidateDetails.candidate.skills}
                  </div>
                </div>
              )}

              {/* Candidatures */}
              <div className="mb-4">
                <h6 className="fw-bold text-primary mb-3">
                  <i className="bi bi-file-text me-2"></i>
                  Candidatures ({candidateDetails.applications.length})
                </h6>
                {candidateDetails.applications.map((app, index) => (
                  <Card key={app.id} className="mb-3">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h6 className="mb-1">{app.job_offer.title}</h6>
                          <small className="text-muted">
                            Candidature envoyée le {new Date(app.created_at).toLocaleDateString('fr-FR')}
                          </small>
                        </div>
                        <Badge bg={app.status === 'accepted' ? 'success' : app.status === 'rejected' ? 'danger' : 'warning'}>
                          {app.status_display}
                        </Badge>
                      </div>
                      
                      <div className="mb-3">
                        <strong>Filière:</strong>
                        <div className="text-muted">{app.filiere}</div>
                      </div>
                      
                      <div className="mb-0">
                        <strong>Lettre de motivation:</strong>
                        <div className="bg-light p-3 rounded mt-2" style={{maxHeight: '150px', overflowY: 'auto'}}>
                          {app.lettre_motivation}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>

              {/* Bio */}
              {candidateDetails.candidate.bio && (
                <div className="mb-4">
                  <h6 className="fw-bold text-primary mb-3">
                    <i className="bi bi-chat-quote me-2"></i>
                    À propos
                  </h6>
                  <div className="bg-light p-3 rounded">
                    {candidateDetails.candidate.bio}
                  </div>
                </div>
              )}
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
  );
};

export default InterviewDetails;