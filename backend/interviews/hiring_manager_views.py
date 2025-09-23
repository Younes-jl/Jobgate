"""
Vues spécifiques pour l'accès des Hiring Managers
"""
import jwt
from datetime import datetime, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.conf import settings
import logging

from .models import InterviewCampaign, InterviewAnswer, GlobalInterviewEvaluation, JobApplication

logger = logging.getLogger(__name__)

class HiringManagerAccessView(APIView):
    """
    Vue pour l'accès des Hiring Managers via token JWT
    """
    permission_classes = [AllowAny]
    
    def get(self, request, token):
        """
        Vérifie le token JWT et retourne les données de la campagne pour le Hiring Manager
        """
        try:
            # Décoder le token JWT
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            
            # Vérifier que c'est bien un token pour Hiring Manager
            if payload.get('type') != 'hiring_manager_access':
                return Response(
                    {"detail": "Token invalide."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            campaign_id = payload.get('campaign_id')
            if not campaign_id:
                return Response(
                    {"detail": "Token invalide - campagne non spécifiée."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Récupérer la campagne
            try:
                campaign = InterviewCampaign.objects.get(pk=campaign_id)
                logger.info(f"Campagne trouvée: {campaign.id} - {campaign.title}")
            except InterviewCampaign.DoesNotExist:
                logger.error(f"Campagne {campaign_id} introuvable")
                return Response(
                    {"detail": f"Campagne {campaign_id} introuvable."},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Récupérer toutes les réponses pour cette campagne
            try:
                answers = InterviewAnswer.objects.filter(
                    question__campaign=campaign
                ).select_related(
                    'candidate', 'question'
                ).order_by('candidate__username', 'question__order')
                
                logger.info(f"Nombre de réponses trouvées: {answers.count()}")
            except Exception as e:
                logger.error(f"Erreur lors de la récupération des réponses: {str(e)}")
                answers = []
            
            # Organiser les données par candidat
            candidates_data = {}
            for answer in answers:
                candidate_key = answer.candidate.id
                if candidate_key not in candidates_data:
                    candidates_data[candidate_key] = {
                        'candidate': {
                            'id': answer.candidate.id,
                            'username': answer.candidate.username,
                            'first_name': answer.candidate.first_name,
                            'last_name': answer.candidate.last_name,
                            'email': answer.candidate.email,
                        },
                        'answers': []
                    }
                
                # Ajouter les évaluations du recruteur
                recruiter_evaluations = []
                try:
                    for eval in answer.recruiter_evaluations.all():
                        recruiter_evaluations.append({
                            'id': eval.id,
                            'communication_score': eval.communication_score,
                            'communication_feedback': eval.communication_feedback,
                            'confidence_score': eval.confidence_score,
                            'confidence_feedback': eval.confidence_feedback,
                            'relevance_score': eval.relevance_score,
                            'relevance_feedback': eval.relevance_feedback,
                            'overall_score': eval.overall_score,
                            'overall_feedback': eval.overall_feedback,
                            'recommendation': eval.recommendation,
                            'recruiter_name': f"{eval.recruiter.first_name} {eval.recruiter.last_name}".strip() or eval.recruiter.username,
                            'created_at': eval.created_at
                        })
                except Exception as e:
                    logger.warning(f"Erreur lors de la récupération des évaluations recruteur pour la réponse {answer.id}: {str(e)}")
                    recruiter_evaluations = []
                
                # Ajouter l'évaluation IA si elle existe
                ai_evaluation = None
                try:
                    if hasattr(answer, 'ai_evaluation') and answer.ai_evaluation:
                        ai_evaluation = {
                            'communication_score': answer.ai_evaluation.communication_score,
                            'relevance_score': answer.ai_evaluation.relevance_score,
                            'confidence_score': answer.ai_evaluation.confidence_score,
                            'overall_ai_score': answer.ai_evaluation.overall_ai_score,
                            'ai_feedback': answer.ai_evaluation.ai_feedback,
                            'strengths': answer.ai_evaluation.strengths,
                            'weaknesses': answer.ai_evaluation.weaknesses,
                            'transcription': answer.ai_evaluation.transcription,
                            'transcription_language': answer.ai_evaluation.transcription_language,
                            'transcription_confidence': answer.ai_evaluation.transcription_confidence,
                            'ai_provider': answer.ai_evaluation.ai_provider,
                            'processing_time': answer.ai_evaluation.processing_time
                        }
                except Exception as e:
                    logger.warning(f"Erreur lors de la récupération de l'évaluation IA pour la réponse {answer.id}: {str(e)}")
                    ai_evaluation = None
                
                candidates_data[candidate_key]['answers'].append({
                    'id': answer.id,
                    'question': {
                        'id': answer.question.id,
                        'text': answer.question.text,
                        'question_type': answer.question.question_type,
                        'time_limit': answer.question.time_limit,
                        'order': answer.question.order
                    },
                    'video_url': answer.cloudinary_secure_url or answer.cloudinary_url,
                    'duration': answer.duration,
                    'status': answer.status,
                    'created_at': answer.created_at,
                    'recruiter_evaluations': recruiter_evaluations,
                    'ai_evaluation': ai_evaluation
                })
            
            # Ajouter l'évaluation globale pour chaque candidat
            for candidate_key, candidate_data in candidates_data.items():
                try:
                    # Chercher une candidature pour ce candidat et cette campagne
                    job_application = JobApplication.objects.filter(
                        candidate_id=candidate_key,
                        job_offer=campaign.job_offer
                    ).first()
                    
                    global_evaluation = None
                    if job_application:
                        try:
                            global_eval = GlobalInterviewEvaluation.objects.get(
                                job_application=job_application
                            )
                            logger.info(f"Évaluation globale trouvée pour le candidat {candidate_key}: {global_eval}")
                            global_evaluation = {
                                'id': global_eval.id,
                                'technical_skills': global_eval.technical_skills,
                                'communication_skills': global_eval.communication_skills,
                                'problem_solving': global_eval.problem_solving,
                                'cultural_fit': global_eval.cultural_fit,
                                'motivation': global_eval.motivation,
                                'overall_score': global_eval.overall_score,
                                'final_recommendation': global_eval.final_recommendation,
                                'strengths': global_eval.strengths,
                                'weaknesses': global_eval.weaknesses,
                                'general_comments': global_eval.general_comments,
                                'next_steps': global_eval.next_steps,
                                'recruiter_name': f"{global_eval.recruiter.first_name} {global_eval.recruiter.last_name}".strip() or global_eval.recruiter.username,
                                'created_at': global_eval.created_at,
                                'updated_at': global_eval.updated_at
                            }
                            logger.info(f"Données d'évaluation globale: {global_evaluation}")
                        except GlobalInterviewEvaluation.DoesNotExist:
                            logger.info(f"Aucune évaluation globale trouvée pour le candidat {candidate_key}")
                            pass
                    
                    candidate_data['global_evaluation'] = global_evaluation
                    
                except Exception as e:
                    logger.warning(f"Erreur lors de la récupération de l'évaluation globale pour le candidat {candidate_key}: {str(e)}")
                    candidate_data['global_evaluation'] = None
            
            # Préparer la réponse
            response_data = {
                'campaign': {
                    'id': campaign.id,
                    'title': campaign.title,
                    'description': campaign.description,
                    'job_offer': {
                        'id': campaign.job_offer.id,
                        'title': campaign.job_offer.title,
                        'description': campaign.job_offer.description,
                        'location': campaign.job_offer.location,
                        'company': payload.get('company', 'JobGate')
                    }
                },
                'recruiter': {
                    'name': payload.get('recruiter_name'),
                    'email': payload.get('email')
                },
                'candidates': list(candidates_data.values()),
                'access_info': {
                    'hiring_manager_email': payload.get('email'),
                    'expires_at': payload.get('exp'),
                    'access_type': 'read_only'
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except jwt.ExpiredSignatureError:
            return Response(
                {"detail": "Le lien d'accès a expiré. Contactez le recruteur pour un nouveau lien."},
                status=status.HTTP_403_FORBIDDEN
            )
        except jwt.InvalidTokenError:
            return Response(
                {"detail": "Lien d'accès invalide."},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            logger.error(f"Erreur accès Hiring Manager: {str(e)}")
            return Response(
                {"detail": "Erreur lors de l'accès aux données."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
