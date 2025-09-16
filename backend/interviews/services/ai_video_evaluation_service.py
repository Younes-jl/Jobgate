"""
Service pour l'évaluation automatique des vidéos d'entretien avec IA.
Pipeline complet : Cloudinary → Whisper → Gemini → Stockage
"""

import os
import time
import tempfile
import requests
import logging
from typing import Dict, Any, Optional, Tuple
from django.conf import settings
from django.utils import timezone
import whisper
import google.generativeai as genai
from ..models import AiEvaluation, InterviewAnswer

logger = logging.getLogger(__name__)


class AIVideoEvaluationService:
    """
    Service principal pour l'évaluation IA des vidéos d'entretien.
    
    Pipeline complet :
    1. Récupération vidéo depuis Cloudinary
    2. Transcription avec Whisper
    3. Évaluation contextuelle avec Gemini
    4. Stockage des résultats
    """
    
    def __init__(self):
        self.whisper_model = None
        self._setup_gemini()
    
    def _setup_gemini(self):
        """Configuration de Google Gemini"""
        api_key = getattr(settings, 'GOOGLE_GEMINI_API_KEY', None)
        if api_key:
            genai.configure(api_key=api_key)
            logger.info("Gemini configuré avec succès")
        else:
            logger.warning("GOOGLE_GEMINI_API_KEY non configurée")
    
    def _load_whisper_model(self, model_size: str = "base") -> whisper.Whisper:
        """
        Charge le modèle Whisper (lazy loading pour économiser la mémoire)
        
        Args:
            model_size: Taille du modèle ("tiny", "base", "small", "medium", "large")
        """
        if self.whisper_model is None:
            logger.info(f"Chargement du modèle Whisper '{model_size}'...")
            self.whisper_model = whisper.load_model(model_size)
            logger.info("Modèle Whisper chargé avec succès")
        return self.whisper_model
    
    def download_video_from_cloudinary(self, cloudinary_url: str) -> str:
        """
        Télécharge une vidéo depuis Cloudinary vers un fichier temporaire.
        
        Args:
            cloudinary_url: URL sécurisée Cloudinary
            
        Returns:
            Chemin vers le fichier temporaire téléchargé
        """
        try:
            logger.info(f"Téléchargement vidéo depuis Cloudinary: {cloudinary_url[:50]}...")
            
            response = requests.get(cloudinary_url, stream=True, timeout=60)
            response.raise_for_status()
            
            # Créer un fichier temporaire
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
            
            # Télécharger par chunks pour économiser la mémoire
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    temp_file.write(chunk)
            
            temp_file.close()
            logger.info(f"Vidéo téléchargée: {temp_file.name}")
            return temp_file.name
            
        except Exception as e:
            logger.error(f"Erreur téléchargement Cloudinary: {e}")
            raise
    
    def transcribe_video_with_whisper(self, video_path: str) -> Dict[str, Any]:
        """
        Transcrit une vidéo avec Whisper.
        
        Args:
            video_path: Chemin vers le fichier vidéo
            
        Returns:
            Dict contenant transcription, langue, confiance
        """
        try:
            logger.info("Début transcription Whisper...")
            model = self._load_whisper_model()
            
            # Transcription avec détection automatique de langue
            result = model.transcribe(
                video_path,
                language=None,  # Auto-détection
                task="transcribe",
                fp16=False  # Compatibilité CPU
            )
            
            transcription_data = {
                'text': result['text'].strip(),
                'language': result.get('language', 'unknown'),
                'confidence': self._calculate_confidence(result),
                'segments': result.get('segments', [])
            }
            
            logger.info(f"Transcription terminée - Langue: {transcription_data['language']}")
            logger.info(f"Texte transcrit: {transcription_data['text'][:100]}...")
            
            return transcription_data
            
        except Exception as e:
            logger.error(f"Erreur transcription Whisper: {e}")
            raise
    
    def _calculate_confidence(self, whisper_result: Dict) -> float:
        """
        Calcule un score de confiance moyen à partir des segments Whisper.
        
        Args:
            whisper_result: Résultat complet de Whisper
            
        Returns:
            Score de confiance moyen (0-1)
        """
        segments = whisper_result.get('segments', [])
        if not segments:
            return 0.0
        
        # Moyenne pondérée par la durée des segments
        total_duration = 0
        weighted_confidence = 0
        
        for segment in segments:
            duration = segment.get('end', 0) - segment.get('start', 0)
            confidence = segment.get('avg_logprob', -1.0)
            # Convertir log prob en score 0-1 (approximation)
            confidence_score = max(0, min(1, (confidence + 1) / 2))
            
            weighted_confidence += confidence_score * duration
            total_duration += duration
        
        return weighted_confidence / total_duration if total_duration > 0 else 0.0
    
    def evaluate_with_gemini(self, transcription: str, question_text: str, question_context: str = "") -> Dict[str, Any]:
        """
        Évalue la transcription avec Gemini pour obtenir scores et feedback.
        
        Args:
            transcription: Texte transcrit de la vidéo
            question_text: Question posée au candidat
            question_context: Contexte additionnel (poste, compétences attendues)
            
        Returns:
            Dict contenant scores et feedback détaillé
        """
        try:
            logger.info("Début évaluation Gemini...")
            
            # Construction du prompt contextuel
            prompt = self._build_evaluation_prompt(transcription, question_text, question_context)
            
            # Appel à Gemini
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
            
            # Parsing de la réponse
            evaluation_result = self._parse_gemini_response(response.text)
            
            logger.info("Évaluation Gemini terminée avec succès")
            return evaluation_result
            
        except Exception as e:
            logger.error(f"Erreur évaluation Gemini: {e}")
            # Fallback avec scores par défaut
            return self._fallback_evaluation(transcription, question_text)
    
    def _build_evaluation_prompt(self, transcription: str, question_text: str, context: str = "") -> str:
        """
        Construit le prompt pour l'évaluation Gemini.
        """
        prompt = f"""
Évalue cette réponse d'entretien (note /10):

QUESTION: {question_text}
RÉPONSE: {transcription}

Format JSON requis:
{{
    "communication_score": X,
    "relevance_score": X,
    "confidence_score": X,
    "overall_score": X,
    "feedback": "Communication: X/10 (Raison courte)\nPertinence: X/10 (Raison courte)\nConfiance: X/10 (Raison courte)"
}}

Sois concis et précis.
        """
        return prompt.strip()
    
    def _parse_gemini_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse la réponse JSON de Gemini.
        """
        import json
        import re
        
        try:
            # Extraire le JSON de la réponse
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                result = json.loads(json_str)
                
                # Validation et nettoyage
                feedback_text = result.get('feedback', '')
                
                return {
                    'communication_score': result.get('communication_score', 5.0),
                    'relevance_score': result.get('relevance_score', 5.0),
                    'confidence_score': result.get('confidence_score', 5.0),
                    'overall_score': result.get('overall_score', 5.0),
                    'strengths': "Réponse structurée avec des éléments pertinents.",
                    'weaknesses': "Évaluation automatique - révision manuelle recommandée.",
                    'feedback': feedback_text
                }
            else:
                raise ValueError("Pas de JSON trouvé dans la réponse")
                
        except Exception as e:
            logger.error(f"Erreur parsing Gemini: {e}")
            return self._fallback_evaluation_scores()
    
    def _fallback_evaluation(self, transcription: str, question_text: str) -> Dict[str, Any]:
        """
        Évaluation de fallback basique si Gemini échoue.
        """
        logger.warning("Utilisation de l'évaluation de fallback")
        
        # Analyse basique de la transcription
        word_count = len(transcription.split())
        has_keywords = any(word in transcription.lower() for word in ['expérience', 'compétence', 'projet', 'équipe'])
        
        base_score = 5.0
        if word_count > 50:
            base_score += 1.0
        if has_keywords:
            base_score += 1.0
        
        return {
            'communication_score': min(10.0, base_score),
            'relevance_score': min(10.0, base_score - 0.5),
            'confidence_score': min(10.0, base_score - 1.0),
            'overall_score': min(10.0, base_score - 0.5),
            'strengths': "Réponse structurée avec des éléments pertinents.",
            'weaknesses': "Évaluation automatique limitée - révision manuelle recommandée.",
            'feedback': f"Réponse de {word_count} mots analysée automatiquement."
        }
    
    def _fallback_evaluation_scores(self) -> Dict[str, Any]:
        """Scores par défaut en cas d'erreur"""
        return {
            'communication_score': 5.0,
            'relevance_score': 5.0,
            'confidence_score': 5.0,
            'overall_score': 5.0,
            'strengths': "Évaluation en cours...",
            'weaknesses': "Analyse détaillée à venir...",
            'feedback': "Évaluation automatique temporairement indisponible."
        }
    
    def cleanup_temp_file(self, file_path: str):
        """Supprime un fichier temporaire"""
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
                logger.info(f"Fichier temporaire supprimé: {file_path}")
        except Exception as e:
            logger.error(f"Erreur suppression fichier temporaire: {e}")
    
    def evaluate_interview_answer(self, interview_answer_id: int) -> AiEvaluation:
        """
        Pipeline complet d'évaluation d'une réponse d'entretien.
        
        Args:
            interview_answer_id: ID de la réponse à évaluer
            
        Returns:
            Instance AiEvaluation créée/mise à jour
        """
        start_time = time.time()
        temp_video_path = None
        
        try:
            # 1. Récupération de la réponse d'entretien
            interview_answer = InterviewAnswer.objects.get(id=interview_answer_id)
            logger.info(f"Évaluation de la réponse {interview_answer_id}")
            
            # 2. Vérification de l'URL Cloudinary
            video_url = interview_answer.cloudinary_secure_url or interview_answer.cloudinary_url
            if not video_url:
                raise ValueError("Aucune URL Cloudinary trouvée pour cette réponse")
            
            # 3. Création/récupération de l'évaluation IA
            ai_evaluation, created = AiEvaluation.objects.get_or_create(
                interview_answer=interview_answer,
                defaults={
                    'status': 'processing',
                    'ai_provider': 'gemini'
                }
            )
            
            if not created and ai_evaluation.status == 'completed':
                logger.info("Évaluation déjà terminée")
                return ai_evaluation
            
            ai_evaluation.status = 'processing'
            ai_evaluation.save()
            
            # 4. Téléchargement de la vidéo
            temp_video_path = self.download_video_from_cloudinary(video_url)
            
            # 5. Transcription avec Whisper
            transcription_data = self.transcribe_video_with_whisper(temp_video_path)
            
            # 6. Validation de la transcription
            transcription_text = transcription_data['text'].strip()
            
            # Détecter si la transcription est invalide (vidéo silencieuse ou problème audio)
            is_invalid_transcription = (
                not transcription_text or  # Transcription vide
                len(transcription_text) < 5 or  # Transcription trop courte
                transcription_text.count(',') > len(transcription_text) * 0.3 or  # Trop de virgules (chiffres répétés)
                all(char in '0123456789,. ' for char in transcription_text)  # Seulement chiffres et ponctuation
            )
            
            if is_invalid_transcription:
                logger.warning(f"Transcription invalide détectée pour réponse {interview_answer.id}: '{transcription_text[:50]}...'")
                # Scores appropriés pour vidéo silencieuse/invalide
                evaluation_data = {
                    'communication_score': 0,
                    'relevance_score': 0,
                    'confidence_score': 0,
                    'overall_score': 0,
                    'feedback': 'Aucun contenu audio détecté dans la vidéo. Veuillez enregistrer une nouvelle réponse avec du son.',
                    'strengths': 'Aucune force identifiée - vidéo sans contenu audio.',
                    'weaknesses': 'Vidéo silencieuse ou problème technique lors de l\'enregistrement.'
                }
            else:
                # 6. Évaluation avec Gemini pour transcription valide
                question_text = interview_answer.question.text
                question_context = f"Poste: {interview_answer.question.campaign.job_offer.title}"
                
                evaluation_data = self.evaluate_with_gemini(
                    transcription_text,
                    question_text,
                    question_context
                )
            
            # 7. Sauvegarde des résultats
            ai_evaluation.transcription = transcription_data['text']
            ai_evaluation.transcription_language = transcription_data['language']
            ai_evaluation.transcription_confidence = transcription_data['confidence']
            
            ai_evaluation.communication_score = evaluation_data['communication_score']
            ai_evaluation.relevance_score = evaluation_data['relevance_score']
            ai_evaluation.confidence_score = evaluation_data['confidence_score']
            ai_evaluation.overall_ai_score = evaluation_data['overall_score']
            
            ai_evaluation.ai_feedback = evaluation_data['feedback']
            ai_evaluation.strengths = evaluation_data['strengths']
            ai_evaluation.weaknesses = evaluation_data['weaknesses']
            
            ai_evaluation.processing_time = time.time() - start_time
            ai_evaluation.mark_completed()
            ai_evaluation.save()  # Sauvegarder tous les scores en base de données
            
            logger.info(f"Évaluation terminée en {ai_evaluation.processing_time:.2f}s")
            
            # Retourner un dictionnaire sérialisable au lieu de l'objet Django
            return {
                'evaluation_id': ai_evaluation.id,
                'status': 'completed',
                'transcription': ai_evaluation.transcription,
                'scores': {
                    'communication': ai_evaluation.communication_score,
                    'relevance': ai_evaluation.relevance_score,
                    'confidence': ai_evaluation.confidence_score,
                    'overall': ai_evaluation.overall_ai_score
                },
                'feedback': ai_evaluation.ai_feedback,
                'strengths': ai_evaluation.strengths,
                'weaknesses': ai_evaluation.weaknesses,
                'processing_time': ai_evaluation.processing_time
            }
            
        except Exception as e:
            logger.error(f"Erreur pipeline évaluation: {e}")
            
            # Marquer comme échoué
            if 'ai_evaluation' in locals():
                ai_evaluation.mark_failed(str(e))
            
            raise
            
        finally:
            # Nettoyage
            if temp_video_path:
                self.cleanup_temp_file(temp_video_path)
    
    def _process_video_evaluation(self, interview_answer) -> 'AiEvaluation':
        """
        Traite l'évaluation complète d'une réponse vidéo.
        
        Args:
            interview_answer: Instance InterviewAnswer
            
        Returns:
            AiEvaluation: L'évaluation créée ou mise à jour
        """
        from datetime import datetime
        
        # Récupérer l'URL vidéo
        video_url = interview_answer.cloudinary_secure_url or interview_answer.cloudinary_url
        
        # Créer ou récupérer l'évaluation IA
        ai_evaluation, created = AiEvaluation.objects.get_or_create(
            interview_answer=interview_answer,
            defaults={
                'status': 'processing',
                'ai_provider': 'gemini'
            }
        )
        
        if not created:
            ai_evaluation.status = 'processing'
            ai_evaluation.save()
        
        try:
            start_time = datetime.now()
            
            # 1. Télécharger la vidéo
            temp_video_path = self.download_video_from_cloudinary(video_url)
            
            # 2. Transcrire avec Whisper
            transcription_result = self.transcribe_video_with_whisper(temp_video_path)
            
            # 3. Évaluer avec Gemini
            context = f"Question: {interview_answer.question.text}\nPoste: {interview_answer.question.campaign.job_offer.title}"
            evaluation_result = self.evaluate_with_gemini(
                transcription_result['text'], 
                context
            )
            
            # 4. Calculer le temps de traitement
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # 5. Sauvegarder les résultats
            ai_evaluation.transcription = transcription_result['text']
            ai_evaluation.transcription_language = transcription_result.get('language', 'fr')
            ai_evaluation.transcription_confidence = transcription_result.get('confidence', 0.0)
            ai_evaluation.communication_score = evaluation_result['communication_score']
            ai_evaluation.relevance_score = evaluation_result['relevance_score']
            ai_evaluation.confidence_score = evaluation_result['confidence_score']
            ai_evaluation.overall_ai_score = evaluation_result['overall_score']
            ai_evaluation.strengths = evaluation_result['strengths']
            ai_evaluation.weaknesses = evaluation_result['weaknesses']
            ai_evaluation.ai_feedback = evaluation_result['feedback']
            ai_evaluation.processing_time = processing_time
            ai_evaluation.status = 'completed'
            ai_evaluation.completed_at = datetime.now()
            ai_evaluation.save()
            
            # 6. Nettoyer le fichier temporaire
            self.cleanup_temp_file(temp_video_path)
            
            logger.info(f"Évaluation IA terminée pour réponse {interview_answer.id}")
            
            # Retourner un dictionnaire sérialisable au lieu de l'objet Django
            return {
                'evaluation_id': ai_evaluation.id,
                'status': 'completed',
                'transcription': ai_evaluation.transcription,
                'scores': {
                    'communication': ai_evaluation.communication_score,
                    'relevance': ai_evaluation.relevance_score,
                    'confidence': ai_evaluation.confidence_score,
                    'overall': ai_evaluation.overall_ai_score
                },
                'feedback': ai_evaluation.ai_feedback,
                'strengths': ai_evaluation.strengths,
                'weaknesses': ai_evaluation.weaknesses,
                'processing_time': processing_time
            }
            
        except Exception as e:
            # Marquer comme échoué
            ai_evaluation.status = 'failed'
            ai_evaluation.error_message = str(e)
            ai_evaluation.save()
            
            logger.error(f"Erreur évaluation IA réponse {interview_answer.id}: {e}")
            raise
    
    def evaluate_video_answer(self, interview_answer_id: int) -> Optional[Dict[str, Any]]:
        """
        Point d'entrée principal pour évaluer une réponse vidéo d'entretien.
        
        Args:
            interview_answer_id: ID de la réponse d'entretien à évaluer
            
        Returns:
            Dict contenant les résultats de l'évaluation ou None en cas d'erreur
        """
        try:
            logger.info(f"🔍 [DEBUG] Début evaluate_video_answer pour ID: {interview_answer_id}")
            
            # Récupérer la réponse d'entretien
            interview_answer = InterviewAnswer.objects.select_related(
                'question__campaign__job_offer',
                'candidate'
            ).get(id=interview_answer_id)
            
            logger.info(f"🔍 [DEBUG] Réponse trouvée - Candidat: {interview_answer.candidate.username}")
            logger.info(f"🔍 [DEBUG] Question: {interview_answer.question.text[:50]}...")
            
            # Vérifier qu'une vidéo existe - LOGS DÉTAILLÉS
            logger.info(f"🔍 [DEBUG] cloudinary_url: {repr(interview_answer.cloudinary_url)}")
            logger.info(f"🔍 [DEBUG] cloudinary_secure_url: {repr(interview_answer.cloudinary_secure_url)}")
            logger.info(f"🔍 [DEBUG] video_file: {repr(interview_answer.video_file)}")
            
            video_url = interview_answer.cloudinary_secure_url or interview_answer.cloudinary_url
            logger.info(f"🔍 [DEBUG] video_url final: {repr(video_url)}")
            logger.info(f"🔍 [DEBUG] bool(video_url): {bool(video_url)}")
            
            if not video_url:
                error_msg = f"Aucune vidéo Cloudinary associée à cette réponse (ID: {interview_answer_id})"
                logger.error(f"❌ [DEBUG] {error_msg}")
                logger.error(f"❌ [DEBUG] cloudinary_url is None: {interview_answer.cloudinary_url is None}")
                logger.error(f"❌ [DEBUG] cloudinary_secure_url is None: {interview_answer.cloudinary_secure_url is None}")
                raise ValueError(error_msg)
            
            logger.info(f"Début évaluation IA pour réponse {interview_answer_id}")
            
            # Lancer la pipeline d'évaluation
            result = self._process_video_evaluation(interview_answer)
            
            # Retourner les résultats (déjà sous forme de dictionnaire)
            return result
            
        except InterviewAnswer.DoesNotExist:
            logger.error(f"Réponse d'entretien {interview_answer_id} introuvable")
            return None
        except Exception as e:
            logger.error(f"Erreur évaluation réponse {interview_answer_id}: {e}")
            return None


# Instance globale du service
ai_evaluation_service = AIVideoEvaluationService()
