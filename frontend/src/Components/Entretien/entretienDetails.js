import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import api from '../../services/api';

const EntretienPage = () => {
  const { token } = useParams();
  
  const [linkData, setLinkData] = useState(null);
  const [campaignData, setCampaignData] = useState(null);
  const [jobOfferData, setJobOfferData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [setupStage, setSetupStage] = useState(false); // Nouvelle étape de vérification
  const [cameraPermission, setCameraPermission] = useState(false);
  const [microphonePermission, setMicrophonePermission] = useState(false);
  const [videoStream, setVideoStream] = useState(null);
  
  // États pour l'interface d'enregistrement des réponses
  const [recordingStage, setRecordingStage] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('preparation'); // 'preparation', 'recording', 'finished'
  const [timeLeft, setTimeLeft] = useState(30);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  // Fonction pour formater la description de l'offre
  const formatJobDescription = (description) => {
    if (!description) return '';
    
    // Diviser le texte en sections basées sur les patterns courants
    let formattedText = description
      // Remplacer les doubles astérisques par des titres
      .replace(/\*\*(.*?)\*\*/g, '<h6 class="text-primary mt-3 mb-2">$1</h6>')
      // Ajouter des tirets pour les listes (quand il y a des - au début de ligne)
      .replace(/^- /gm, '• ')
      // Séparer les phrases longues en paragraphes (après les points suivis de majuscules)
      .replace(/\. ([A-Z])/g, '.</p><p class="mb-2">$1')
      // Ajouter des retours à la ligne après certains patterns
      .replace(/\. - /g, '.</p><p class="mb-2">• ')
      .replace(/ - ([A-Z])/g, '</p><p class="mb-2">• $1');

    // Entourer le texte de paragraphes si pas déjà fait
    if (!formattedText.includes('<p>')) {
      formattedText = `<p class="mb-2">${formattedText}</p>`;
    }

    return formattedText;
  };

  useEffect(() => {
    const validateTokenAndFetchData = async () => {
      try {
        setLoading(true);
        
        // 1. Valider le token et récupérer les informations du lien
        const linkResponse = await api.get(`/interviews/campaign-links/${token}/`);
        
        if (!linkResponse.data.valid) {
          setError('Ce lien d\'invitation n\'est plus valide ou a expiré.');
          setLoading(false);
          return;
        }
        
        setLinkData(linkResponse.data);
        
        // 2. Récupérer les détails de la campagne (endpoint public)
        const campaignResponse = await api.get(`/interviews/campaigns/${linkResponse.data.campaign_id}/public/`);
        setCampaignData(campaignResponse.data);
        
        // 3. Récupérer les détails de l'offre d'emploi (endpoint public)
        const jobOfferResponse = await api.get(`/interviews/offers/${campaignResponse.data.job_offer}/public/`);
        setJobOfferData(jobOfferResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err);
        console.error('Détails de l\'erreur:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          message: err.message,
          config: err.config
        });
        
        if (err.response?.status === 404) {
          setError('Lien d\'invitation invalide ou introuvable.');
        } else if (err.response?.status === 403) {
          setError('Accès non autorisé à ce lien d\'invitation.');
        } else if (err.response?.status === 401) {
          setError('Erreur d\'authentification. Le lien pourrait être expiré.');
        } else {
          const errorDetail = err.response?.data?.detail || err.message || 'Erreur inconnue';
          setError(`Erreur lors du chargement des informations: ${errorDetail}. Veuillez réessayer.`);
        }
        setLoading(false);
      }
    };

    if (token) {
      validateTokenAndFetchData();
    }
  }, [token]);

  // Timer pour la préparation et l'enregistrement
  useEffect(() => {
    let timer;
    
    if (recordingStage && !interviewStarted) {
      if (currentPhase === 'preparation' && timeLeft > 0) {
        timer = setTimeout(() => {
          setTimeLeft(prev => prev - 1);
        }, 1000);
      } else if (currentPhase === 'preparation' && timeLeft === 0) {
        // Fin de la préparation, démarrer l'enregistrement
        setCurrentPhase('recording');
        setTimeLeft(questions[currentQuestionIndex]?.time_limit || 180); // Temps d'enregistrement
        startRecording();
      } else if (currentPhase === 'recording' && timeLeft > 0) {
        timer = setTimeout(() => {
          setTimeLeft(prev => prev - 1);
        }, 1000);
      } else if (currentPhase === 'recording' && timeLeft === 0) {
        // Fin de l'enregistrement automatique
        stopRecording();
        // nextQuestion() sera appelé dans recorder.onstop après sauvegarde réussie
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingStage, currentPhase, timeLeft, currentQuestionIndex, questions, interviewStarted]);

  // Fonction pour démarrer l'enregistrement
  const startRecording = async () => {
    try {
      if (videoStream) {
        console.log('Démarrage enregistrement avec stream original...');
        
        const recorder = new MediaRecorder(videoStream);
        const chunks = [];
        let startTime = Date.now();

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
            console.log('Chunk reçu:', event.data.size, 'bytes');
          }
        };

        recorder.onstop = async () => {
          const endTime = Date.now();
          const actualDuration = Math.floor((endTime - startTime) / 1000);
          const blob = new Blob(chunks, { type: 'video/webm' });
          
          console.log('Enregistrement terminé:', {
            duration: actualDuration,
            size: blob.size,
            questionIndex: currentQuestionIndex,
            chunksCount: chunks.length
          });
          
          if (blob.size > 0) {
            try {
              await saveVideoAnswer(blob, currentQuestionIndex, actualDuration);
              // Si la sauvegarde réussit, passer à la question suivante
              nextQuestion();
            } catch (error) {
              console.error('Échec sauvegarde, arrêt de la progression');
              // L'erreur est déjà gérée dans saveVideoAnswer
              // Ne pas appeler nextQuestion() pour arrêter la progression
            }
          } else {
            console.error('Blob vide généré');
            setError('Erreur d\'enregistrement: fichier vide. Veuillez réessayer.');
          }
        };

        recorder.onerror = (event) => {
          console.error('Erreur MediaRecorder:', event.error);
          setError('Erreur technique d\'enregistrement.');
        };

        recorder.start(1000); // Chunk toutes les secondes
        setMediaRecorder(recorder);
        setIsRecording(true);
        
        console.log('MediaRecorder démarré, état:', recorder.state);
      }
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', error);
      setError('Erreur lors du démarrage de l\'enregistrement.');
    }
  };

  // Fonction pour arrêter l'enregistrement
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
  };

  // Fonction pour sauvegarder la réponse vidéo avec Cloudinary
  const saveVideoAnswer = async (videoBlob, questionIndex, duration) => {
    try {
      const currentQuestion = questions[questionIndex];
      
      if (!currentQuestion || !currentQuestion.id) {
        throw new Error('Question invalide ou ID manquant');
      }
      
      if (!token) {
        throw new Error('Token candidat manquant');
      }
      
      if (!videoBlob || videoBlob.size === 0) {
        throw new Error('Fichier vidéo vide ou invalide');
      }
      
      // Créer les données du formulaire pour Cloudinary
      const formData = new FormData();
      
      // Créer un fichier à partir du blob original (sans traitement)
      const videoFile = new File([videoBlob], `reponse-q${questionIndex + 1}-${Date.now()}.webm`, {
        type: 'video/webm'
      });
      
      formData.append('video_file', videoFile);
      formData.append('question_id', currentQuestion.id);
      formData.append('candidate_token', token);
      
      console.log('=== DÉBUT UPLOAD VIDÉO ===');
      console.log('Paramètres upload:', {
        question_id: currentQuestion.id,
        duration: duration,
        file_size: videoBlob.size,
        file_name: videoFile.name,
        token_length: token.length
      });
      
      // Upload vers Cloudinary via notre API
      const cloudinaryResponse = await api.post('/interviews/videos/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000 // 60 secondes timeout
      });
      
      console.log('=== RÉPONSE CLOUDINARY ===');
      console.log('Status:', cloudinaryResponse.status);
      console.log('Data:', cloudinaryResponse.data);
      
      // Vérifier que l'upload a réussi
      if (cloudinaryResponse.status !== 200 && cloudinaryResponse.status !== 201) {
        throw new Error(`Échec upload: status ${cloudinaryResponse.status}`);
      }
      
      // Vérifier la présence des URLs Cloudinary
      const responseData = cloudinaryResponse.data;
      if (!responseData.cloudinary_url && !responseData.secure_url) {
        throw new Error('URLs Cloudinary manquantes dans la réponse');
      }
      
      console.log('=== UPLOAD RÉUSSI ===');
      console.log('Cloudinary URL:', responseData.cloudinary_url);
      console.log('Secure URL:', responseData.secure_url);
      
      return responseData;
      
    } catch (error) {
      console.error('=== ERREUR SAUVEGARDE VIDÉO ===');
      console.error('Type d\'erreur:', error.name);
      console.error('Message:', error.message);
      console.error('Status HTTP:', error.response?.status);
      console.error('Données erreur:', error.response?.data);
      console.error('Stack trace:', error.stack);
      
      // Déterminer le message d'erreur approprié
      let errorMessage = 'Erreur lors de la sauvegarde de votre réponse.';
      
      if (error.response?.status === 400) {
        errorMessage = 'Données invalides. Vérifiez votre connexion et réessayez.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Session expirée. Veuillez actualiser la page.';
      } else if (error.response?.status === 413) {
        errorMessage = 'Fichier vidéo trop volumineux. Réduisez la durée d\'enregistrement.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Erreur serveur. Veuillez réessayer dans quelques instants.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Timeout d\'upload. Vérifiez votre connexion internet.';
      }
      
      setError(`${errorMessage}\nSi vous pensez qu'il s'agit d'une erreur, veuillez contacter le recruteur.`);
      
      // Relancer l'erreur pour arrêter la progression
      throw error;
    }
  };

  // Fonction pour passer à la question suivante
  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentPhase('preparation');
      setTimeLeft(30); // 30 secondes de préparation
    } else {
      // Fin de l'entretien - fermer la caméra et afficher message de fin
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      setVideoStream(null);
      setRecordingStage(false);
      setInterviewStarted(true); // Afficher le message de fin
    }
  };

  const handleStartInterview = () => {
    // Passer à l'étape de vérification du micro et de la caméra
    setSetupStage(true);
  };

  // Fonction pour demander les permissions média
  const requestMediaPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setVideoStream(stream);
      setCameraPermission(true);
      setMicrophonePermission(true);
      
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'accès aux médias:', error);
      if (error.name === 'NotAllowedError') {
        setError('Accès à la caméra et au microphone refusé. Veuillez autoriser l\'accès pour continuer.');
      } else if (error.name === 'NotFoundError') {
        setError('Aucune caméra ou microphone trouvé. Vérifiez vos périphériques.');
      } else {
        setError('Erreur lors de l\'accès aux périphériques média. Veuillez réessayer.');
      }
      return false;
    }
  };

  // Fonction pour démarrer l'entretien après vérification
  const handleStartInterviewFinal = async () => {
    console.log('=== DEBUT handleStartInterviewFinal ===');
    console.log('État initial:', {
      recordingStage,
      interviewStarted,
      setupStage,
      questionsLoading,
      campaignData: campaignData?.id
    });
    
    try {
      // Arrêter le stream de test
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      
      // Commencer le chargement des questions
      setQuestionsLoading(true);
      console.log('Chargement des questions commencé...');
      
      // Récupérer les questions de la campagne
      const questionsResponse = await api.get(`/interviews/campaigns/${campaignData.id}/questions/`);
      console.log('Questions récupérées:', questionsResponse.data);
      setQuestions(questionsResponse.data);
      
      // Arrêter le loading avant de continuer
      setQuestionsLoading(false);
      
      // Au lieu de juste setInterviewStarted(true), aller directement à l'interface d'enregistrement
      if (questionsResponse.data && questionsResponse.data.length > 0) {
        console.log('Questions trouvées, activation de l\'enregistrement...');
        
        // Demander les permissions média pour l'enregistrement
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        console.log('Permissions média accordées');
        setVideoStream(stream);
        
        // S'assurer qu'interviewStarted est false pour que l'interface d'enregistrement s'affiche
        console.log('Mise à jour des états...');
        setSetupStage(false); // IMPORTANT: Sortir de l'étape de vérification
        setInterviewStarted(false);
        setRecordingStage(true);
        setCurrentQuestionIndex(0);
        setCurrentPhase('preparation');
        setTimeLeft(30); // 30 secondes de préparation
        
        console.log('=== ETATS APRES MISE A JOUR ===');
        console.log('recordingStage: true, interviewStarted: false');
        console.log('=== FIN handleStartInterviewFinal ===');
      } else {
        console.log('Aucune question trouvée, fallback vers interviewStarted');
        setInterviewStarted(true); // Fallback si pas de questions
      }
    } catch (error) {
      console.error('=== ERREUR dans handleStartInterviewFinal ===');
      console.error('Erreur lors du chargement des questions:', error);
      console.error('Détails de l\'erreur:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 404) {
        setError('Campagne d\'entretien introuvable ou aucune question configurée.');
      } else if (error.response?.status === 403) {
        setError('Accès non autorisé aux questions d\'entretien.');
      } else {
        const errorDetail = error.response?.data?.detail || error.message || 'Erreur inconnue';
        setError(`Erreur lors du chargement des questions: ${errorDetail}`);
      }
      setQuestionsLoading(false);
    }
  };



  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" role="status" variant="primary" />
        <h4 className="mt-3">Chargement de votre invitation...</h4>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Row className="justify-content-center">
          <Col md={8}>
            <Alert variant="danger">
              <Alert.Heading>Erreur</Alert.Heading>
              <p>{error}</p>
              <hr />
              <p className="mb-0">
                Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le recruteur.
              </p>
            </Alert>
          </Col>
        </Row>
      </Container>
    );
  }

  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Étape de vérification du micro et de la caméra
  if (setupStage && !interviewStarted) {
    console.log('=== RENDU: Interface de vérification technique ===');
    console.log('setupStage:', setupStage, 'interviewStarted:', interviewStarted);
    
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <Container className="py-4">
          <Row className="justify-content-center">
            <Col md={8}>
              {/* Header */}
              <div className="text-center mb-4">
                <h2 className="text-primary mb-0">
                  <i className="bi bi-gear-fill me-2"></i>
                  Vérification Technique
                </h2>
                <hr className="w-50 mx-auto" />
              </div>

              {/* Card de vérification */}
              <Card className="mb-4 shadow-lg">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">
                    <i className="bi bi-camera-video me-2"></i>
                    Test de votre Caméra et Microphone
                  </h5>
                </Card.Header>
                <Card.Body className="text-center py-5">
                  <div className="mb-4">
                    {/* Zone de prévisualisation vidéo */}
                    <div className="position-relative d-inline-block">
                      <video
                        ref={(video) => {
                          if (video && videoStream) {
                            video.srcObject = videoStream;
                          }
                        }}
                        autoPlay
                        muted
                        className="rounded border"
                        style={{
                          width: '320px',
                          height: '240px',
                          backgroundColor: '#000',
                          objectFit: 'cover',
                          transform: 'scaleX(-1)' // Effet miroir
                        }}
                      />
                      {!videoStream && (
                        <div
                          className="d-flex align-items-center justify-content-center rounded border"
                          style={{
                            width: '320px',
                            height: '240px',
                            backgroundColor: '#6c757d'
                          }}
                        >
                          <div className="text-white text-center">
                            <i className="bi bi-camera-video-off" style={{ fontSize: '2rem' }}></i>
                            <p className="mt-2 mb-0">Caméra non activée</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <Row>
                      <Col md={6}>
                        <div className={`p-3 rounded ${cameraPermission ? 'bg-success' : 'bg-warning'}`}>
                          <i className={`bi ${cameraPermission ? 'bi-camera-video text-white' : 'bi-camera-video-off text-dark'} me-2 fs-4`}></i>
                          <div className={cameraPermission ? 'text-white' : 'text-dark'}>
                            <strong>Caméra</strong>
                            <p className="mb-0 small">
                              {cameraPermission ? 'Fonctionnelle ✓' : 'En attente d\'autorisation'}
                            </p>
                          </div>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className={`p-3 rounded ${microphonePermission ? 'bg-success' : 'bg-warning'}`}>
                          <i className={`bi ${microphonePermission ? 'bi-mic text-white' : 'bi-mic-mute text-dark'} me-2 fs-4`}></i>
                          <div className={microphonePermission ? 'text-white' : 'text-dark'}>
                            <strong>Microphone</strong>
                            <p className="mb-0 small">
                              {microphonePermission ? 'Fonctionnel ✓' : 'En attente d\'autorisation'}
                            </p>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>

                  {/* Boutons d'action */}
                  <div className="d-flex gap-3 justify-content-center">
                    {!cameraPermission || !microphonePermission ? (
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={requestMediaPermissions}
                        className="px-4"
                      >
                        <i className="bi bi-camera-video me-2"></i>
                        Activer Caméra et Micro
                      </Button>
                    ) : (
                      <Button
                        variant="success"
                        size="lg"
                        onClick={handleStartInterviewFinal}
                        className="px-4"
                        disabled={questionsLoading}
                      >
                        {questionsLoading ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Chargement...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-play-circle me-2"></i>
                            Je suis prêt à commencer !
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {(cameraPermission && microphonePermission) && (
                    <div className="mt-4">
                      <Alert variant="success" className="py-2">
                        <i className="bi bi-check-circle me-2"></i>
                        <strong>Parfait !</strong> Votre caméra et votre microphone fonctionnent correctement.
                      </Alert>
                    </div>
                  )}
                </Card.Body>
              </Card>

              {/* Informations complémentaires */}
              <Card className="border-info">
                <Card.Body>
                  <h6 className="text-info mb-3">
                    <i className="bi bi-info-circle me-2"></i>
                    Informations importantes
                  </h6>
                  <ul className="list-unstyled mb-0">
                    <li className="mb-2">
                      <i className="bi bi-shield-check text-success me-2"></i>
                      Vos données sont sécurisées et ne sont utilisées que pour l'entretien
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-eye text-info me-2"></i>
                      Vérifiez que vous êtes bien visible et que l'éclairage est suffisant
                    </li>
                    <li className="mb-0">
                      <i className="bi bi-volume-up text-warning me-2"></i>
                      Parlez normalement pour tester la qualité audio de votre microphone
                    </li>
                  </ul>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  // Interface d'enregistrement des réponses
  if (recordingStage && !interviewStarted) {
    console.log('=== RENDU: Interface d\'enregistrement ===');
    console.log('recordingStage:', recordingStage, 'interviewStarted:', interviewStarted);
    
    const currentQuestion = questions[currentQuestionIndex];
    
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <Container fluid className="py-3">
          <Row>
            {/* Colonne principale - Question et contrôles */}
            <Col lg={8}>
              <div className="text-center mb-4">
                <h3 className="text-primary">Répondez à la question</h3>
                <div className="d-flex justify-content-center align-items-center mt-2">
                  <Badge bg="primary" className="me-2">
                    Question {currentQuestionIndex + 1}/{questions.length}
                  </Badge>
                  <small className="text-muted">
                    {campaignData?.title}
                  </small>
                </div>
              </div>

              {/* Zone vidéo principale */}
              <Card className="mb-3 shadow">
                <Card.Body className="p-0">
                  <div 
                    className="position-relative d-flex align-items-center justify-content-center"
                    style={{ 
                      height: '400px',
                      backgroundColor: '#e8f4fd',
                      borderRadius: '8px'
                    }}
                  >
                    {isRecording && (
                      <Badge 
                        bg="danger" 
                        className="position-absolute top-0 start-0 m-3 px-3 py-2"
                        style={{ fontSize: '0.9rem', zIndex: 10 }}
                      >
                        <i className="bi bi-record-circle me-1"></i>
                        REC
                      </Badge>
                    )}
                    
                    <video
                      ref={(video) => {
                        if (video && videoStream) {
                          video.srcObject = videoStream;
                        }
                      }}
                      autoPlay
                      muted
                      className="w-100 h-100"
                      style={{
                        objectFit: 'cover',
                        borderRadius: '8px',
                        transform: 'scaleX(-1)' // Effet miroir
                      }}
                    />
                    
                    {!videoStream && (
                      <div className="text-center">
                        <i className="bi bi-camera-video text-primary" style={{ fontSize: '4rem' }}></i>
                        <p className="mt-2 text-muted">Simulation de la caméra</p>
                        <p className="text-muted">Dans un vrai scénario, votre vidéo apparaîtrait ici</p>
                      </div>
                    )}
                  </div>

                  {/* Indicateurs audio/vidéo */}
                  <div className="d-flex justify-content-center py-2">
                    <div className="d-flex align-items-center me-4">
                      <div className="me-2" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#28a745' }}></div>
                      <small className="text-muted">Audio détecté</small>
                    </div>
                    <div className="d-flex align-items-center">
                      <div className="me-2" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#007bff' }}></div>
                      <small className="text-muted">Vidéo active</small>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              {/* Bouton d'arrêt (optionnel) */}
              {currentPhase === 'recording' && (
                <div className="text-center">
                  <Button 
                    variant="danger" 
                    className="px-4"
                    onClick={() => {
                      stopRecording();
                      nextQuestion();
                    }}
                  >
                    <i className="bi bi-stop-circle me-2"></i>
                    Arrêter l'enregistrement
                  </Button>
                </div>
              )}
            </Col>

            {/* Colonne droite - Question et timer */}
            <Col lg={4}>
              <Card className="mb-3">
                <Card.Header className="bg-primary text-white">
                  <h6 className="mb-0">
                    <i className="bi bi-question-circle me-2"></i>
                    Question
                  </h6>
                </Card.Header>
                <Card.Body>
                  <p className="fw-bold">{currentQuestion?.text}</p>
                </Card.Body>
              </Card>

              {/* Timer */}
              <Card className="mb-3">
                <Card.Body className="text-center">
                  <div 
                    className="display-4 fw-bold mb-2"
                    style={{ 
                      color: currentPhase === 'preparation' ? '#ffc107' : '#dc3545',
                      fontSize: '3rem'
                    }}
                  >
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </div>
                  
                  {/* Barre de progression */}
                  <div className="progress mb-3" style={{ height: '8px' }}>
                    <div 
                      className={`progress-bar ${currentPhase === 'preparation' ? 'bg-warning' : 'bg-danger'}`}
                      style={{ 
                        width: `${currentPhase === 'preparation' 
                          ? ((30 - timeLeft) / 30) * 100 
                          : ((questions[currentQuestionIndex]?.time_limit - timeLeft) / questions[currentQuestionIndex]?.time_limit) * 100}%` 
                      }}
                    ></div>
                  </div>
                  
                  <div className="text-center">
                    {currentPhase === 'preparation' ? (
                      <div>
                        <h6 className="text-warning">Temps de préparation</h6>
                        <small className="text-muted">
                          Prenez le temps de réfléchir à votre réponse.<br/>
                          L'enregistrement commencera automatiquement.
                        </small>
                      </div>
                    ) : (
                      <div>
                        <h6 className="text-danger">Temps d'enregistrement</h6>
                        <small className="text-muted">
                          <i className="bi bi-info-circle me-1"></i>
                          Passage automatique à la fin du temps
                        </small>
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>

              {/* Conseils pendant l'enregistrement */}
              <Card className="border-info">
                <Card.Header className="bg-info text-white">
                  <h6 className="mb-0">
                    <i className="bi bi-lightbulb me-2"></i>
                    Pendant l'enregistrement
                  </h6>
                </Card.Header>
                <Card.Body>
                  <ul className="list-unstyled mb-0 small">
                    <li className="mb-2">
                      <i className="bi bi-eye text-primary me-2"></i>
                      Regardez la caméra
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-mic text-success me-2"></i>
                      Parlez distinctement
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-person-check text-info me-2"></i>
                      Restez naturel(le)
                    </li>
                    <li className="mb-0">
                      <i className="bi bi-clock text-warning me-2"></i>
                      Prenez votre temps
                    </li>
                  </ul>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  // Interface de finalisation après avoir terminé l'entretien
  if (interviewStarted) {
    console.log('=== RENDU: Interface de finalisation ===');
    console.log('interviewStarted:', interviewStarted);
    
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <Container className="py-4">
          <Row className="justify-content-center">
            <Col md={8}>
              {/* Message de fin d'entretien */}
              <div className="text-center mb-4">
                <div className="mb-4">
                  <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '5rem' }}></i>
                </div>
                <h2 className="text-success mb-3">
                  Félicitations !
                </h2>
                <h4 className="text-muted mb-4">
                  Vous avez terminé votre entretien vidéo
                </h4>
                <hr className="w-50 mx-auto mb-4" />
              </div>

              {/* Informations sur l'entretien terminé */}
              <Card className="mb-4 shadow">
                <Card.Header className="bg-success text-white">
                  <h5 className="mb-0">
                    <i className="bi bi-clipboard-check me-2"></i>
                    Récapitulatif de votre entretien
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <div className="mb-3">
                        <strong>Campagne :</strong>
                        <p className="text-muted mb-0">{campaignData?.title}</p>
                      </div>
                      <div className="mb-3">
                        <strong>Poste :</strong>
                        <p className="text-muted mb-0">{jobOfferData?.title}</p>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="mb-3">
                        <strong>Questions traitées :</strong>
                        <p className="text-muted mb-0">{questions?.length || 0} question(s)</p>
                      </div>
                      <div className="mb-3">
                        <strong>Date d'entretien :</strong>
                        <p className="text-muted mb-0">{new Date().toLocaleDateString('fr-FR')}</p>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Prochaines étapes */}
              <Card className="mb-4 border-info">
                <Card.Header className="bg-info text-white">
                  <h6 className="mb-0">
                    <i className="bi bi-arrow-right-circle me-2"></i>
                    Prochaines étapes
                  </h6>
                </Card.Header>
                <Card.Body>
                  <ul className="list-unstyled mb-0">
                    <li className="mb-2">
                      <i className="bi bi-check text-success me-2"></i>
                      Votre entretien vidéo a été enregistré avec succès
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-eye text-info me-2"></i>
                      Le recruteur examinera vos réponses sous peu
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-envelope text-warning me-2"></i>
                      Vous recevrez une notification par email sur la suite du processus
                    </li>
                    <li className="mb-0">
                      <i className="bi bi-telephone text-primary me-2"></i>
                      En cas de questions, n'hésitez pas à contacter le recruteur
                    </li>
                  </ul>
                </Card.Body>
              </Card>

              {/* Message de remerciement */}
              <Card className="text-center border-0" style={{ backgroundColor: '#e8f5e8' }}>
                <Card.Body className="py-4">
                  <h5 className="text-success mb-3">
                    <i className="bi bi-heart-fill me-2"></i>
                    Merci pour votre participation !
                  </h5>
                  <p className="text-muted mb-0">
                    Nous apprécions le temps que vous avez consacré à cet entretien.<br/>
                    Bonne chance pour la suite du processus de recrutement !
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Container className="py-4">
        <Row className="justify-content-center">
          <Col md={10}>
            {/* Header avec logo/titre simple */}
            <div className="text-center mb-4">
              <h2 className="text-primary mb-0">
                <i className="bi bi-camera-video me-2"></i>
                Entretien Vidéo JobGate
              </h2>
              <hr className="w-50 mx-auto" />
            </div>

            {/* Header avec informations de l'invitation */}
            <Card className="mb-4 border-success shadow-sm">
              <Card.Header className="bg-success text-white">
                <h5 className="mb-0">
                  <i className="bi bi-check-circle me-2"></i>
                  Invitation Validée
                </h5>
              </Card.Header>
              <Card.Body className="bg-light">
                <Row className="text-center">
                  <Col md={4}>
                    <p className="mb-0">
                      <strong>Statut:</strong>{' '}
                      <Badge bg="success">
                        Lien valide
                      </Badge>
                    </p>
                  </Col>
                  <Col md={4}>
                    <p className="mb-0">
                      <strong>Expire le:</strong>{' '}
                      <small className="text-muted">
                        {new Date(linkData?.expires_at).toLocaleString('fr-FR')}
                      </small>
                    </p>
                  </Col>
                  <Col md={4}>
                    <p className="mb-0">
                      <strong>Utilisations:</strong>{' '}
                      <small className="text-muted">
                        {linkData?.uses_count || 0}/{linkData?.max_uses || 1}
                      </small>
                    </p>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

           
            {/* Informations de l'offre d'emploi */}
            <Card className="mb-4 shadow-sm">
              <Card.Header className="bg-warning text-dark">
                <h5 className="mb-0">
                  <i className="bi bi-briefcase me-2"></i>
                  Offre d'Emploi
                </h5>
              </Card.Header>
              <Card.Body>
                <h3 className="text-warning mb-3">{jobOfferData?.title}</h3>
                
                {/* Description formatée */}
                <div className="mb-4 p-3 bg-light rounded">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: formatJobDescription(jobOfferData?.description) 
                    }} 
                  />
                </div>
                
                <Row className="mb-3">
                  <Col md={6}>
                    <div className="d-flex align-items-center mb-3">
                      <i className="bi bi-geo-alt text-warning me-2 fs-5"></i>
                      <div>
                        <strong>Lieu:</strong>
                        <p className="mb-0 text-muted">{jobOfferData?.location}</p>
                      </div>
                    </div>
                    
                    <div className="d-flex align-items-center mb-3">
                      <i className="bi bi-file-earmark-text text-warning me-2 fs-5"></i>
                      <div>
                        <strong>Type de contrat:</strong>
                        <p className="mb-0">
                          <Badge bg="secondary">{jobOfferData?.contract_type}</Badge>
                        </p>
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    {jobOfferData?.salary && (
                      <div className="d-flex align-items-center mb-3">
                        <i className="bi bi-currency-euro text-warning me-2 fs-5"></i>
                        <div>
                          <strong>Salaire:</strong>
                          <p className="mb-0 text-muted">{jobOfferData.salary}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="d-flex align-items-center mb-3">
                      <i className="bi bi-calendar-plus text-warning me-2 fs-5"></i>
                      <div>
                        <strong>Publié le:</strong>
                        <p className="mb-0 text-muted">
                          {new Date(jobOfferData?.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </Col>
                </Row>

                {jobOfferData?.prerequisites && (
                  <div className="mt-4 p-3 bg-light rounded">
                    <h6 className="text-warning">
                      <i className="bi bi-list-check me-2"></i>
                      Prérequis:
                    </h6>
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: formatJobDescription(jobOfferData.prerequisites) 
                      }} 
                    />
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Consignes pour l'entretien */}
            <Card className="mb-4 shadow-sm">
              <Card.Header className="bg-info text-white">
                <h5 className="mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  Consignes pour l'Entretien
                </h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <h6 className="text-info mb-3">
                      <i className="bi bi-gear me-2"></i>
                      Préparation Technique
                    </h6>
                    <ul className="list-unstyled">
                      <li className="mb-2">
                        <i className="bi bi-camera text-primary me-2"></i>
                        <strong>Vérifiez votre caméra</strong> - Assurez-vous qu'elle fonctionne correctement
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-mic text-primary me-2"></i>
                        <strong>Testez votre microphone</strong> - Vérifiez la qualité audio
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-wifi text-primary me-2"></i>
                        <strong>Connexion internet stable</strong> - Une bonne connexion est essentielle
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-volume-up text-primary me-2"></i>
                        <strong>Environnement calme</strong> - Choisissez un lieu sans bruit de fond
                      </li>
                    </ul>
                  </Col>
                  <Col md={6}>
                    <h6 className="text-info mb-3">
                      <i className="bi bi-clock me-2"></i>
                      Déroulement de l'Entretien
                    </h6>
                    <ul className="list-unstyled">
                      <li className="mb-2">
                        <i className="bi bi-question-circle text-success me-2"></i>
                        Une question s'affiche à l'écran
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-stopwatch text-warning me-2"></i>
                        <strong>30 secondes</strong> de préparation pour réfléchir
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-record-circle text-danger me-2"></i>
                        <strong>2 à 5 minutes</strong> pour enregistrer votre réponse
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-arrow-right text-info me-2"></i>
                        Passage automatique à la question suivante
                      </li>
                    </ul>
                  </Col>
                </Row>
                
                <hr className="my-4" />
                
                <div className="row">
                  <div className="col-12">
                    <h6 className="text-danger mb-3">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      Règles Importantes
                    </h6>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="alert alert-warning py-2 mb-2">
                          <i className="bi bi-ban me-2"></i>
                          <strong>Une seule prise</strong> autorisée par question
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="alert alert-info py-2 mb-2">
                          <i className="bi bi-arrow-clockwise me-2"></i>
                          <strong>Pas de retour en arrière</strong> possible
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-light rounded">
                  <div className="text-center">
                    <i className="bi bi-lightbulb text-warning me-2"></i>
                    <strong>Conseil :</strong> 
                    <span className="text-muted ms-2">
                      Prenez le temps de bien lire chaque question et utilisez les 30 secondes de préparation pour organiser vos idées.
                    </span>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Bouton pour commencer l'entretien */}
            <Card className="text-center shadow-lg border-0" style={{ backgroundColor: '#e8f5e8' }}>
              <Card.Body className="py-5">
                <div className="mb-4">
                  <i className="bi bi-play-circle text-success" style={{ fontSize: '5rem' }}></i>
                </div>
                <h4 className="text-success mb-3">Prêt à commencer votre entretien ?</h4>
                <p className="text-muted mb-4 fs-6">
                  <i className="bi bi-info-circle me-2"></i>
                  Vérifiez que vous avez bien lu toutes les consignes ci-dessus.<br/>
                  Une fois l'entretien commencé, vous ne pourrez plus revenir en arrière.
                </p>
                
                <Button 
                  variant="success" 
                  size="lg"
                  onClick={handleStartInterview}
                  className="px-5 py-3 fs-5"
                  style={{ minWidth: '250px' }}
                >
                  <i className="bi bi-camera-video me-3"></i>
                  Commencer l'Entretien
                </Button>
                
                <div className="mt-4">
                  <small className="text-muted d-flex align-items-center justify-content-center">
                    <i className="bi bi-shield-check me-2 text-success"></i>
                    Votre entretien sera enregistré de manière sécurisée
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default EntretienPage;