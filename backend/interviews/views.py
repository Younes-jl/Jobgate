from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.viewsets import ModelViewSet
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from users.models import CustomUser
from django.utils import timezone
from django.http import JsonResponse
from django.db.models import Q
from .models import (
    JobOffer, InterviewCampaign, InterviewQuestion, CampaignLink, 
    InterviewAnswer, JobApplication, RecruiterEvaluation, GlobalInterviewEvaluation,
    AiEvaluation
)
from .serializers import (
    JobOfferSerializer, InterviewCampaignSerializer, InterviewCampaignCreateSerializer,
    InterviewQuestionSerializer, CampaignLinkSerializer, InterviewAnswerSerializer,
    JobApplicationSerializer, RecruiterEvaluationSerializer, 
    GlobalInterviewEvaluationSerializer, AiEvaluationSerializer,
    AiEvaluationCreateSerializer, AiEvaluationBulkSerializer
)
from .ai_service import AIInterviewQuestionGenerator, analyze_question_quality
from django.core.mail import send_mail
from .cloudinary_service import CloudinaryVideoService
from .services.ai_video_evaluation_service import AIVideoEvaluationService
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class CloudinaryVideoUploadView(APIView):
    """
    Vue pour l'upload de vidéos sur Cloudinary.
    """
    permission_classes = [AllowAny]  # Permet l'accès avec token candidat
    
    def post(self, request):
        """
        Upload une vidéo sur Cloudinary.
        
        Body attendu:
        {
            "video_file": "fichier vidéo",
            "question_id": "ID de la question",
            "candidate_token": "token du candidat"
        }
        """
        video_file = request.FILES.get('video_file')
        question_id = request.data.get('question_id')
        candidate_token = request.data.get('candidate_token')
        
        if not video_file:
            return Response({
                "error": "Le fichier vidéo est obligatoire."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Vérifier que le token candidat est valide
        if not candidate_token:
            return Response({
                "error": "Token candidat requis."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Vérifier que le token correspond à un lien valide
        try:
            link = CampaignLink.objects.get(token=candidate_token)
            # Pour l'upload vidéo, on vérifie seulement l'expiration et la révocation
            # Pas la validation complète car le candidat peut être en train de passer l'entretien
            if link.revoked or link.is_expired:
                return Response({
                    "error": "Token candidat invalide ou expiré."
                }, status=status.HTTP_403_FORBIDDEN)
        except CampaignLink.DoesNotExist:
            return Response({
                "error": "Token candidat invalide ou expiré."
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Générer un public_id unique pour la vidéo
            public_id = f"interview_{question_id}_{candidate_token}_{timezone.now().strftime('%Y%m%d_%H%M%S')}"
            
            logger.info(f"Tentative d'upload vidéo - Token: {candidate_token}, Question: {question_id}")
            
            # Utiliser le service Cloudinary pour uploader la vidéo
            result = CloudinaryVideoService.upload_video(
                video_file, 
                public_id=public_id,
                folder="jobgate/interviews"
            )
            
            if not result:
                logger.error("CloudinaryVideoService.upload_video a retourné None")
                return Response({
                    "error": "Erreur lors de l'upload sur Cloudinary."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            logger.info(f"Upload Cloudinary réussi: {result.get('public_id')}")
            
            # Identifier le candidat via le token pour sauvegarder dans InterviewAnswer
            candidate = None
            if link.candidate:
                candidate = link.candidate
            elif link.email:
                try:
                    candidate = CustomUser.objects.get(email=link.email)
                except CustomUser.DoesNotExist:
                    logger.warning(f"Candidat introuvable pour email: {link.email}")
            
            # Sauvegarder dans le modèle InterviewAnswer si candidat et question_id disponibles
            answer_saved = False
            if candidate and question_id:
                try:
                    question = InterviewQuestion.objects.get(pk=question_id)
                    
                    # Vérifier si une réponse existe déjà
                    existing_answer = InterviewAnswer.objects.filter(
                        question=question, 
                        candidate=candidate
                    ).first()
                    
                    if existing_answer:
                        # Mettre à jour la réponse existante
                        existing_answer.cloudinary_public_id = result.get('public_id')
                        existing_answer.cloudinary_url = result.get('url')
                        existing_answer.cloudinary_secure_url = result.get('secure_url')
                        existing_answer.duration = result.get('duration', 0)
                        existing_answer.status = 'completed'
                        existing_answer.save()
                        logger.info(f"Réponse mise à jour: ID {existing_answer.id}")
                        answer_saved = True
                    else:
                        # Créer une nouvelle réponse
                        new_answer = InterviewAnswer.objects.create(
                            question=question,
                            candidate=candidate,
                            cloudinary_public_id=result.get('public_id'),
                            cloudinary_url=result.get('url'),
                            cloudinary_secure_url=result.get('secure_url'),
                            duration=result.get('duration', 0),
                            file_size=video_file.size,
                            status='completed'
                        )
                        logger.info(f"Nouvelle réponse créée: ID {new_answer.id}")
                        answer_saved = True
                        
                except InterviewQuestion.DoesNotExist:
                    logger.warning(f"Question {question_id} introuvable pour sauvegarde")
                except Exception as e:
                    logger.error(f"Erreur sauvegarde InterviewAnswer: {str(e)}")
            
            return Response({
                "success": True,
                "cloudinary_public_id": result.get('public_id'),
                "cloudinary_url": result.get('url'),
                "cloudinary_secure_url": result.get('secure_url'),
                "duration": result.get('duration'),
                "format": result.get('format'),
                "resource_type": result.get('resource_type'),
                "answer_saved_to_db": answer_saved
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Erreur upload Cloudinary: {str(e)}")
            logger.error(f"Type d'erreur: {type(e).__name__}")
            return Response({
                "error": "Erreur lors de l'upload de la vidéo.",
                "details": str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Ajouter une vue API simple pour les candidatures
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def job_applications_api(request):
    """
    Vue API directe pour récupérer les candidatures pour une offre d'emploi spécifique.
    """
    logger.error(f"Accès à l'API directe de candidatures avec user={request.user}, auth={request.auth}")
    
    job_offer_id = request.query_params.get('job_offer_id')
    if not job_offer_id:
        logger.error("L'ID de l'offre d'emploi est manquant")
        return Response(
            {"detail": "L'ID de l'offre d'emploi est requis."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Vérifier si l'utilisateur est le recruteur de l'offre
    try:
        job_offer = JobOffer.objects.get(pk=job_offer_id)
        logger.error(f"Offre trouvée: {job_offer.id}, recruteur={job_offer.recruiter.id}")
    except JobOffer.DoesNotExist:
        logger.error(f"L'offre d'emploi {job_offer_id} n'existe pas")
        return Response(
            {"detail": "L'offre d'emploi spécifiée n'existe pas."},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.user != job_offer.recruiter and not request.user.is_staff:
        logger.error(f"Accès non autorisé: user={request.user.id}, recruteur={job_offer.recruiter.id}")
        return Response(
            {"detail": "Vous n'êtes pas autorisé à voir les candidatures pour cette offre."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    applications = JobApplication.objects.filter(job_offer=job_offer).order_by('-created_at')
    logger.error(f"Candidatures trouvées: {applications.count()}")
    serializer = JobApplicationSerializer(applications, many=True)
    return Response(serializer.data)

class JobOfferViewSet(viewsets.ModelViewSet):
    serializer_class = JobOfferSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        """
        Instantiate and return the list of permissions that this view requires.
        """
        if self.action == 'public_detail':
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return JobOffer.objects.all()
        if hasattr(user, 'role') and user.role == 'CANDIDAT':
            # Les candidats peuvent voir toutes les offres
            return JobOffer.objects.all()
        # Les recruteurs ne voient que leurs propres offres
        return JobOffer.objects.filter(recruiter=user)
    
    def create(self, request, *args, **kwargs):
        logger.error(f'Données reçues: {request.data}')
        try:
            return super().create(request, *args, **kwargs)
        except ValidationError as e:
            logger.error(f'Erreur de validation: {str(e)}')
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f'Erreur inattendue: {str(e)}')
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def perform_create(self, serializer):
        logger.error(f'Données validées: {serializer.validated_data}')
        job_offer = serializer.save(recruiter=self.request.user)
    
    
    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def public_detail(self, request, pk=None):
        """Endpoint public pour récupérer les détails d'une offre (pour les liens d'entretien)"""
        try:
            job_offer = JobOffer.objects.get(pk=pk)
            serializer = self.get_serializer(job_offer)
            return Response(serializer.data)
        except JobOffer.DoesNotExist:
            return Response(
                {"detail": "Offre d'emploi introuvable."},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({'detail': 'Non authentifié'}, status=status.HTTP_401_UNAUTHORIZED)
        offers = JobOffer.objects.filter(recruiter=user).order_by('-created_at')
        serializer = self.get_serializer(offers, many=True)
        return Response(serializer.data)
        
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def all_offers(self, request):
        """Endpoint pour récupérer toutes les offres d'emploi pour les candidats"""
        # Récupérer toutes les offres, indépendamment du recruteur
        offers = JobOffer.objects.all().order_by('-created_at')
        
        # Sérialiser les données
        serializer = self.get_serializer(offers, many=True)
        return Response(serializer.data)


class InterviewCampaignViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les campagnes d'entretiens.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        """
        Instantiate and return the list of permissions that this view requires.
        """
        if self.action in ['public_detail', 'questions']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_serializer_class(self):
        """Utilise un sérialiseur différent pour la création"""
        if self.action in ['create', 'update', 'partial_update']:
            return InterviewCampaignCreateSerializer
        return InterviewCampaignSerializer
    
    def get_queryset(self):
        """Filtre les campagnes par offres d'emploi du recruteur"""
        user = self.request.user
        job_offer_id = self.request.query_params.get('job_offer')
        
        if user.is_staff:
            queryset = InterviewCampaign.objects.all()
        else:
            queryset = InterviewCampaign.objects.filter(job_offer__recruiter=user)
        
        # Filtrer par job_offer si spécifié dans les paramètres
        if job_offer_id:
            logger.info(f"Filtrage des campagnes pour job_offer={job_offer_id}")
            queryset = queryset.filter(job_offer=job_offer_id)
            logger.info(f"Campagnes trouvées: {queryset.count()}")
            for campaign in queryset:
                logger.info(f"Campagne ID: {campaign.id}, Titre: {campaign.title}, Job Offer: {campaign.job_offer.id}")
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        logger.error(f'Données de campagne reçues: {request.data}')
        try:
            return super().create(request, *args, **kwargs)
        except ValidationError as e:
            logger.error(f'Erreur de validation campagne: {str(e)}')
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f'Erreur inattendue campagne: {str(e)}')
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def public_detail(self, request, pk=None):
        """Endpoint public pour récupérer les détails d'une campagne (pour les liens d'entretien)"""
        try:
            campaign = InterviewCampaign.objects.get(pk=pk)
            serializer = self.get_serializer(campaign)
            return Response(serializer.data)
        except InterviewCampaign.DoesNotExist:
            return Response(
                {"detail": "Campagne d'entretien introuvable."},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def questions(self, request, pk=None):
        """Endpoint public pour récupérer les questions d'une campagne (pour les entretiens)"""
        try:
            campaign = InterviewCampaign.objects.get(pk=pk)
            questions = campaign.questions.all().order_by('order')
            logger.info(f"=== DEBUG BACKEND QUESTIONS ===")
            logger.info(f"Campaign ID: {pk}")
            logger.info(f"Campaign title: {campaign.title}")
            logger.info(f"Questions count: {questions.count()}")
            logger.info(f"Questions IDs: {[q.id for q in questions]}")
            logger.info(f"Questions texts: {[q.text[:50] + '...' if len(q.text) > 50 else q.text for q in questions]}")
            serializer = InterviewQuestionSerializer(questions, many=True)
            return Response(serializer.data)
        except InterviewCampaign.DoesNotExist:
            return Response(
                {"detail": "Campagne d'entretien introuvable."},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def add_question(self, request, pk=None):
        """Ajoute une question à une campagne existante"""
        campaign = self.get_object()
        serializer = InterviewQuestionSerializer(data=request.data)
        
        if serializer.is_valid():
            # Définir l'ordre comme le dernier + 1
            order = campaign.questions.count() + 1
            serializer.save(campaign=campaign, order=order)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['delete'])
    def remove_question(self, request, pk=None):
        """Supprime une question d'une campagne"""
        campaign = self.get_object()
        question_id = request.data.get('question_id')
        
        if not question_id:
            return Response({"error": "L'ID de la question est requis"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            question = campaign.questions.get(id=question_id)
            question.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except InterviewQuestion.DoesNotExist:
            return Response({"error": "Question non trouvée"}, status=status.HTTP_404_NOT_FOUND)


class InterviewQuestionViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les questions d'entretien.
    """
    serializer_class = InterviewQuestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filtre les questions par campagnes appartenant au recruteur"""
        user = self.request.user
        if user.is_staff:
            return InterviewQuestion.objects.all()
        return InterviewQuestion.objects.filter(campaign__job_offer__recruiter=user)


class JobApplicationViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les candidatures aux offres d'emploi.
    """
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Retourne les candidatures selon le rôle de l'utilisateur:
        - Recruteurs: candidatures pour leurs offres
        - Candidats: leurs propres candidatures
        - Admin: toutes les candidatures
        """
        user = self.request.user
        
        if user.is_staff:
            return JobApplication.objects.all()
        
        if hasattr(user, 'role'):
            if user.role == 'RECRUTEUR':
                # Les recruteurs voient les candidatures pour leurs offres
                return JobApplication.objects.filter(job_offer__recruiter=user)
            elif user.role == 'CANDIDAT':
                # Les candidats ne voient que leurs propres candidatures
                return JobApplication.objects.filter(candidate=user)
        
        return JobApplication.objects.none()
    
    def create(self, request, *args, **kwargs):
        """Créer une nouvelle candidature avec un simple clic"""
        # Vérifier si l'utilisateur est un candidat
        if not hasattr(request.user, 'role') or request.user.role != 'CANDIDAT':
            return Response(
                {"detail": "Seuls les candidats peuvent postuler à des offres d'emploi."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Vérifier si l'offre existe
        job_offer_id = request.data.get('job_offer')
        try:
            job_offer = JobOffer.objects.get(pk=job_offer_id)
        except JobOffer.DoesNotExist:
            return Response(
                {"detail": "L'offre d'emploi spécifiée n'existe pas."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Vérifier si l'utilisateur a déjà postulé à cette offre
        if JobApplication.objects.filter(job_offer=job_offer, candidate=request.user).exists():
            return Response(
                {"detail": "Vous avez déjà postulé à cette offre."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Créer la candidature avec tous les champs du formulaire
        application = JobApplication.objects.create(
            job_offer=job_offer,
            candidate=request.user,
            status='pending',
            lettre_motivation=request.data.get('motivation', ''),
            filiere=request.data.get('field', '')
        )
        
        serializer = self.get_serializer(application)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def update_status(self, request, pk=None):
        """Mettre à jour le statut d'une candidature (pour les recruteurs)"""
        application = self.get_object()
        
        # Vérifier si l'utilisateur est le recruteur de l'offre
        if request.user != application.job_offer.recruiter and not request.user.is_staff:
            return Response(
                {"detail": "Seul le recruteur qui a publié l'offre peut modifier le statut de la candidature."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Mettre à jour le statut
        new_status = request.data.get('status')
        if not new_status or new_status not in [s[0] for s in JobApplication.STATUS_CHOICES]:
            return Response(
                {"detail": f"Statut invalide. Choisissez parmi: {', '.join([s[0] for s in JobApplication.STATUS_CHOICES])}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        application.status = new_status
        application.save()
        
        return Response(self.get_serializer(application).data)
    
    @action(detail=False, methods=['get'])
    def recruiter_applications(self, request):
        """Liste des candidatures reçues par le recruteur connecté"""
        if not hasattr(request.user, 'role') or request.user.role != 'RECRUTEUR':
            return Response(
                {"detail": "Seuls les recruteurs peuvent accéder à cette ressource."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Récupérer toutes les candidatures pour les offres du recruteur
        applications = JobApplication.objects.filter(job_offer__recruiter=request.user).order_by('-created_at')
        serializer = self.get_serializer(applications, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_applications(self, request):
        """Liste des candidatures du candidat connecté"""
        if not hasattr(request.user, 'role') or request.user.role != 'CANDIDAT':
            return Response(
                {"detail": "Cette action est réservée aux candidats."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        applications = JobApplication.objects.filter(candidate=request.user).order_by('-created_at')
        serializer = self.get_serializer(applications, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='technical-interview')
    def technical_interview(self, request, pk=None):
        """Programmer un entretien technique et envoyer un email au candidat"""
        logger.info(f"🎯 Tentative de programmation d'entretien technique - User: {request.user.id}, Application ID: {pk}")
        
        try:
            application = self.get_object()
            logger.info(f"✅ Application trouvée: {application.id} - Candidat: {application.candidate.email}")
            logger.info(f"📋 Offre: {application.job_offer.title} - Recruteur: {application.job_offer.recruiter.id}")
        except Exception as e:
            logger.error(f"❌ Erreur lors de la récupération de l'application: {e}")
            return Response(
                {"detail": f"Application non trouvée: {e}"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Vérifier si l'utilisateur est le recruteur de l'offre
        logger.info(f"🔐 Vérification permissions - User: {request.user.id} vs Recruteur: {application.job_offer.recruiter.id}")
        if request.user != application.job_offer.recruiter and not request.user.is_staff:
            logger.error(f"❌ Permission refusée - User {request.user.id} n'est pas le recruteur {application.job_offer.recruiter.id}")
            return Response(
                {"detail": "Seul le recruteur qui a publié l'offre peut programmer un entretien technique."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Récupérer les données de l'entretien
        interview_date = request.data.get('date')
        interview_time = request.data.get('time')
        interview_location = request.data.get('location')
        candidate_email = request.data.get('candidate_email')
        
        # Validation des données
        if not all([interview_date, interview_time, interview_location]):
            return Response(
                {"detail": "La date, l'heure et le lieu de l'entretien sont obligatoires."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validation de l'email du candidat
        if not candidate_email or candidate_email != application.candidate.email:
            return Response(
                {"detail": "Email du candidat invalide."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Formatage de la date et heure pour l'email
            from datetime import datetime
            interview_datetime = f"{interview_date} à {interview_time}"
            
            # Préparation du contenu de l'email
            candidate_name = f"{application.candidate.first_name} {application.candidate.last_name}".strip()
            if not candidate_name.strip():
                candidate_name = application.candidate.username
            
            recruiter_name = f"{request.user.first_name} {request.user.last_name}".strip()
            if not recruiter_name.strip():
                recruiter_name = request.user.username
            
            subject = f"🎯 Invitation à l'entretien technique - {application.job_offer.title}"
            
            message = f"""Bonjour {candidate_name},

Félicitations ! Nous avons le plaisir de vous inviter à un entretien technique pour le poste :

📋 **{application.job_offer.title}**
🏢 Entreprise : {recruiter_name}
📍 Lieu : {application.job_offer.location}

📅 **DÉTAILS DE L'ENTRETIEN TECHNIQUE :**

🗓️ **Date et heure :** {interview_datetime}
📍 **Lieu de l'entretien :** {interview_location}
⏱️ **Durée estimée :** 1 heure

📝 **PRÉPARATION RECOMMANDÉE :**
• Préparez vos projets et réalisations techniques
• Apportez votre CV et portfolio si disponible
• Révisez les compétences techniques mentionnées dans l'offre
• Préparez des questions sur le poste et l'entreprise

💼 **CE QUI VOUS ATTEND :**
• Discussion sur votre parcours technique
• Questions sur vos compétences et expériences
• Présentation éventuelle de vos projets
• Échanges sur les missions du poste

⚠️ **IMPORTANT :**
• Merci de confirmer votre présence en répondant à cet email
• En cas d'empêchement, contactez-nous au plus tôt pour reprogrammer
• Arrivez 10 minutes avant l'heure prévue

Pour toute question ou information complémentaire, n'hésitez pas à nous contacter.

Nous avons hâte de vous rencontrer et d'échanger avec vous !

Cordialement,
{recruiter_name}
L'équipe {application.job_offer.recruiter.get_full_name() if hasattr(application.job_offer.recruiter, 'get_full_name') else 'JobGate'}

---
🔒 Ce message est confidentiel et destiné uniquement à la personne mentionnée."""
            
            # Envoi de l'email
            send_mail(
                subject=subject,
                message=message,
                from_email=None,  # Utilise DEFAULT_FROM_EMAIL
                recipient_list=[candidate_email],
                fail_silently=False
            )
            
            logger.info(f"Email d'entretien technique envoyé à {candidate_email} pour la candidature {application.id}")
            
            return Response({
                "detail": "Entretien technique programmé avec succès",
                "interview_details": {
                    "date": interview_date,
                    "time": interview_time,
                    "location": interview_location,
                    "candidate_email": candidate_email,
                    "datetime_formatted": interview_datetime
                },
                "email_sent": True
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi de l'email d'entretien technique: {str(e)}")
            return Response(
                {"detail": f"Erreur lors de l'envoi de l'email: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CampaignLinkViewSet(viewsets.ViewSet):
    """Endpoints pour créer/obtenir des liens de campagne et valider les tokens."""
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        """Créer/obtenir un lien unique pour une candidature.
        Body attendu: { application_id: number, response_deadline_hours: number (optionnel) }
        """
        logger.error(f"Données reçues pour création de lien: {request.data}")
        
        application_id = request.data.get('application_id')
        response_deadline_hours = request.data.get('response_deadline_hours', 168)  # 7 jours par défaut
        
        logger.error(f"application_id extrait: {application_id}")
        logger.error(f"response_deadline_hours extrait: {response_deadline_hours}")
        
        if not application_id:
            logger.error("Erreur: application_id manquant dans la requête")
            return Response({"detail": "application_id requis"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Valider le délai en heures
        try:
            response_deadline_hours = int(response_deadline_hours)
            if response_deadline_hours < 1 or response_deadline_hours > 8760:  # Max 1 an
                raise ValueError()
        except (ValueError, TypeError):
            return Response({"detail": "response_deadline_hours doit être un nombre entier entre 1 et 8760 heures"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            app = JobApplication.objects.select_related('job_offer', 'candidate').get(pk=application_id)
        except JobApplication.DoesNotExist:
            return Response({"detail": "Candidature introuvable"}, status=status.HTTP_404_NOT_FOUND)

        # Autorisation: seul le recruteur de l'offre (ou staff)
        if request.user != app.job_offer.recruiter and not request.user.is_staff:
            return Response({"detail": "Non autorisé"}, status=status.HTTP_403_FORBIDDEN)

        # Chercher une campagne active pour cette offre
        campaign = (
            InterviewCampaign.objects
            .filter(job_offer=app.job_offer, active=True)
            .order_by('-start_date')
            .first()
        )
        if not campaign:
            return Response({"detail": "Aucune campagne active pour cette offre"}, status=status.HTTP_400_BAD_REQUEST)

        # Un lien unique par (campaign, candidate)
        link, _created = CampaignLink.objects.get_or_create(
            campaign=campaign,
            candidate=app.candidate,
            defaults={},
        )

        # Si le lien n'est pas valide, régénérer avec nouvelle expiration
        if not link.is_valid:
            link.revoked = False
            link.expires_at = timezone.now() + timedelta(hours=response_deadline_hours)
            link.token = ''  # force regeneration in save()
            link.save()
        else:
            # Mettre à jour l'expiration même si le lien existe déjà
            link.expires_at = timezone.now() + timedelta(hours=response_deadline_hours)
            link.save()

        serializer = CampaignLinkSerializer(link, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action == 'retrieve':
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def retrieve(self, request, pk=None):
        """Valider un token: pk est le token. Accès public pour les candidats."""
        try:
            link = CampaignLink.objects.get(token=pk)
        except CampaignLink.DoesNotExist:
            return Response({"valid": False, "detail": "Token invalide"}, status=status.HTTP_404_NOT_FOUND)

        # Ne pas marquer automatiquement comme utilisé ici
        # Le lien sera marqué comme utilisé seulement quand le candidat soumet une réponse

        data = {
            "valid": link.is_valid,
            "expires_at": link.expires_at,
            "revoked": link.revoked,
            "uses_count": link.uses_count,
            "max_uses": link.max_uses,
            "campaign_id": link.campaign_id,
            "candidate_id": link.candidate_id,
        }
        return Response(data)
    
    @action(detail=True, methods=['post'])
    def send_invite(self, request, pk=None):
        """Envoie un email d'invitation au candidat pour ce lien."""
        logger.error(f"Tentative d'envoi d'invitation pour le lien ID: {pk}")
        
        link = get_object_or_404(CampaignLink, pk=pk)
        logger.error(f"Lien trouvé: {link}, candidat: {link.candidate}, email candidat: {link.candidate.email if link.candidate else 'N/A'}")
        
        # Autorisation: seul le recruteur de l'offre (ou staff)
        if request.user != link.campaign.job_offer.recruiter and not request.user.is_staff:
            logger.error(f"Autorisation refusée: utilisateur {request.user.id} vs recruteur {link.campaign.job_offer.recruiter.id}")
            return Response({"detail": "Non autorisé"}, status=status.HTTP_403_FORBIDDEN)
        
        # Vérification détaillée de la validité du lien
        logger.error(f"Vérification validité: revoked={link.revoked}, expired={link.is_expired}, expires_at={link.expires_at}")
        logger.error(f"Uses: {link.uses_count}/{link.max_uses}")
        
        # Vérifier les réponses existantes
        from .models import InterviewAnswer
        existing_answers = InterviewAnswer.objects.filter(
            question__campaign=link.campaign,
            candidate=link.candidate
        )
        logger.error(f"Réponses existantes pour ce candidat/campagne: {existing_answers.count()}")
        
        # Pour l'envoi d'invitation, on autorise même s'il y a des réponses existantes
        # car le recruteur peut vouloir renvoyer une invitation
        if link.revoked:
            logger.error("Lien révoqué")
            return Response({"detail": "Lien révoqué"}, status=status.HTTP_400_BAD_REQUEST)
        
        if link.is_expired:
            logger.error("Lien expiré")
            return Response({"detail": "Lien expiré"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Déterminer l'email cible
        to_email = link.email or (link.candidate.email if link.candidate and link.candidate.email else None)
        logger.error(f"Email cible déterminé: {to_email}")
        
        if not to_email:
            logger.error("Aucun email disponible pour ce candidat")
            return Response({"detail": "Aucun email disponible pour ce candidat"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculer les heures restantes jusqu'à l'expiration
        time_until_expiration = link.expires_at - timezone.now()
        hours_until_expiration = int(time_until_expiration.total_seconds() / 3600)
        days_until_expiration = hours_until_expiration // 24
        remaining_hours = hours_until_expiration % 24
        
        # Formatage du délai d'expiration
        if days_until_expiration > 0:
            expiration_text = f"{days_until_expiration} jour{'s' if days_until_expiration > 1 else ''}"
            if remaining_hours > 0:
                expiration_text += f" et {remaining_hours} heure{'s' if remaining_hours > 1 else ''}"
        else:
            expiration_text = f"{hours_until_expiration} heure{'s' if hours_until_expiration > 1 else ''}"
        
        subject = f"🎯 Invitation à l'entretien vidéo - {link.campaign.job_offer.title}"
        start_url = link.get_start_url()
        
        # Template d'email amélioré
        message = f"""Bonjour {link.candidate.first_name if link.candidate and link.candidate.first_name else ''},

Nous avons le plaisir de vous inviter à passer un entretien vidéo pour le poste :
📋 **{link.campaign.job_offer.title}**
🏢 Entreprise : {link.campaign.job_offer.recruiter.get_full_name() if link.campaign.job_offer.recruiter else 'JobGate'}

🎥 **INSTRUCTIONS POUR L'ENTRETIEN :**

1. Cliquez sur le lien ci-dessous pour accéder à votre entretien :
   👉 {start_url}

2. ⚠️ **IMPORTANT - Délai d'expiration :**
   • Ce lien expirera dans {expiration_text}
   • Date limite : {link.expires_at.strftime('%d/%m/%Y à %H:%M')}
   • Le lien ne peut être utilisé qu'UNE SEULE FOIS

3. 📝 **Préparation recommandée :**
   • Testez votre caméra et microphone
   • Choisissez un environnement calme et bien éclairé
   • Préparez vos réponses aux questions sur votre parcours

4. 🕒 **Durée estimée :** 15-30 minutes selon les questions

⚡ **RAPPEL IMPORTANT :**
Ce lien d'invitation est personnel et confidentiel. Il ne peut être utilisé qu'une seule fois et expirera automatiquement après le délai indiqué. Nous vous recommandons de passer l'entretien dès que possible.

Si vous rencontrez des difficultés techniques ou avez des questions, n'hésitez pas à nous contacter.

Bonne chance pour votre entretien !

Cordialement,
L'équipe JobGate

---
🔒 Ce message est confidentiel et destiné uniquement à la personne mentionnée."""
        
        send_mail(subject, message, None, [to_email], fail_silently=False)
        return Response({"detail": "Invitation envoyée", "email": to_email, "start_url": start_url})
    
    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def start_interview(self, request, pk=None):
        """Marque l'entretien comme commencé (en cours)."""
        try:
            link = CampaignLink.objects.get(token=pk)
        except CampaignLink.DoesNotExist:
            return Response({"valid": False, "detail": "Token invalide"}, status=status.HTTP_404_NOT_FOUND)
        
        if not link.is_valid:
            return Response({"valid": False, "detail": "Lien invalide ou expiré"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Marquer comme en cours
        link.mark_in_progress()
        
        return Response({
            "detail": "Entretien marqué comme en cours",
            "status": link.status
        })
    
    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def complete_interview(self, request, pk=None):
        """Marque l'entretien comme terminé avec succès."""
        try:
            link = CampaignLink.objects.get(token=pk)
        except CampaignLink.DoesNotExist:
            return Response({"valid": False, "detail": "Token invalide"}, status=status.HTTP_404_NOT_FOUND)
        
        # Marquer comme terminé
        link.mark_completed()
        
        return Response({
            "detail": "Entretien terminé avec succès",
            "status": link.status,
            "completed_at": link.completed_at
        })
    
    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def abandon_interview(self, request, pk=None):
        """Marque l'entretien comme abandonné par le candidat."""
        try:
            link = CampaignLink.objects.get(token=pk)
        except CampaignLink.DoesNotExist:
            return Response({"valid": False, "detail": "Token invalide"}, status=status.HTTP_404_NOT_FOUND)
        
        # Marquer comme abandonné
        link.mark_abandoned()
        
        return Response({
            "detail": "Entretien marqué comme abandonné",
            "status": link.status,
            "completed_at": link.completed_at
        })
    
    @action(detail=True, methods=['post'])
    def reset_interview(self, request, pk=None):
        """Réinitialise un entretien pour permettre une nouvelle tentative."""
        try:
            link = CampaignLink.objects.get(pk=pk)
        except CampaignLink.DoesNotExist:
            return Response({"detail": "Lien introuvable"}, status=status.HTTP_404_NOT_FOUND)
        
        # Vérifier les permissions - seul le recruteur peut réinitialiser
        if request.user != link.campaign.job_offer.recruiter and not request.user.is_staff:
            return Response({"detail": "Non autorisé"}, status=status.HTTP_403_FORBIDDEN)
        
        # Supprimer toutes les réponses existantes pour ce candidat/campagne
        from .models import InterviewAnswer
        deleted_count = InterviewAnswer.objects.filter(
            question__campaign=link.campaign,
            candidate=link.candidate
        ).delete()[0]
        
        # Réinitialiser le statut du lien
        link.status = 'active'
        link.completed_at = None
        link.used_at = None
        link.uses_count = 0
        link.save(update_fields=['status', 'completed_at', 'used_at', 'uses_count'])
        
        return Response({
            "detail": f"Entretien réinitialisé avec succès. {deleted_count} réponse(s) supprimée(s).",
            "status": link.status,
            "deleted_answers": deleted_count
        })
    
    @action(detail=False, methods=['get'])
    def job_applications(self, request):
        """Liste des candidatures pour une offre spécifique"""
        job_offer_id = request.query_params.get('job_offer_id')
        if not job_offer_id:
            return Response(
                {"detail": "L'ID de l'offre d'emploi est requis."},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Vérifier si l'utilisateur est le recruteur de l'offre
        try:
            job_offer = JobOffer.objects.get(pk=job_offer_id)
        except JobOffer.DoesNotExist:
            return Response(
                {"detail": "L'offre d'emploi spécifiée n'existe pas."},
                status=status.HTTP_404_NOT_FOUND
            )
        if request.user != job_offer.recruiter and not request.user.is_staff:
            return Response(
                {"detail": "Vous n'êtes pas autorisé à voir les candidatures pour cette offre."},
                status=status.HTTP_403_FORBIDDEN
            )
        applications = JobApplication.objects.filter(job_offer=job_offer).order_by('-created_at')
        serializer = JobApplicationSerializer(applications, many=True)
        return Response(serializer.data)


class InterviewAnswerViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les réponses d'entretien vidéo des candidats.
    """
    serializer_class = InterviewAnswerSerializer
    
    def get_permissions(self):
        """
        Gestion des permissions selon l'action.
        """
        if self.action == 'create':
            # Seuls les candidats authentifiés peuvent soumettre des réponses
            permission_classes = [permissions.AllowAny]  # Temporaire pour les liens publics
        else:
            # Les autres actions nécessitent une authentification
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """
        Retourne les réponses selon le rôle de l'utilisateur.
        """
        user = self.request.user
        
        if not user.is_authenticated:
            return InterviewAnswer.objects.none()
        
        if user.is_staff:
            return InterviewAnswer.objects.all()
        
        if hasattr(user, 'role'):
            if user.role == 'RECRUTEUR':
                # Les recruteurs voient les réponses pour leurs campagnes
                return InterviewAnswer.objects.filter(
                    question__campaign__job_offer__recruiter=user
                )
            elif user.role == 'CANDIDAT':
                # Les candidats ne voient que leurs propres réponses
                return InterviewAnswer.objects.filter(candidate=user)
        
        return InterviewAnswer.objects.none()
    
    def create(self, request, *args, **kwargs):
        """
        Créer une nouvelle réponse vidéo.
        Accepte les données multipart/form-data avec le fichier vidéo.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"📹 Tentative de sauvegarde de réponse vidéo")
        logger.info(f"Données reçues: {list(request.data.keys())}")
        logger.info(f"Fichiers reçus: {list(request.FILES.keys())}")
        logger.info(f"Utilisateur: {request.user} (authentifié: {request.user.is_authenticated})")
        
        # Vérifier les données requises
        question_id = request.data.get('question_id')
        candidate_identifier = request.data.get('candidate_identifier')  # email ou token
        duration = request.data.get('duration')
        video_file = request.FILES.get('video_file')
        
        logger.info(f"question_id: {question_id}")
        logger.info(f"candidate_identifier: {candidate_identifier}")
        logger.info(f"duration: {duration}")
        logger.info(f"video_file: {video_file}")
        
        if not all([question_id, candidate_identifier, duration, video_file]):
            missing = []
            if not question_id: missing.append("question_id")
            if not candidate_identifier: missing.append("candidate_identifier") 
            if not duration: missing.append("duration")
            if not video_file: missing.append("video_file")
            
            logger.error(f"❌ Données manquantes: {missing}")
            return Response({
                "detail": f"Données manquantes. Requis: {', '.join(missing)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Trouver la question
        try:
            question = InterviewQuestion.objects.get(pk=question_id)
            logger.info(f"✅ Question trouvée: {question.text[:50]}...")
        except InterviewQuestion.DoesNotExist:
            logger.error(f"❌ Question introuvable: {question_id}")
            return Response({
                "detail": "Question d'entretien introuvable."
            }, status=status.HTTP_404_NOT_FOUND)

        # Identifier le candidat (TOUJOURS via le token pour les réponses vidéo)
        candidate = None
        logger.info(f"🔍 Identification du candidat via token...")
        
        # Pour les réponses d'entretien vidéo, on utilise TOUJOURS le token
        # même si un utilisateur est authentifié (évite que le recruteur se stocke comme candidat)
        logger.info(f"🔗 Recherche via token/lien: {candidate_identifier}")
        try:
            link = CampaignLink.objects.get(token=candidate_identifier)
            logger.info(f"✅ Lien trouvé - Email: {link.email}, Candidat: {link.candidate}")
            
            if link.candidate:
                candidate = link.candidate
                logger.info(f"✅ Candidat via lien: {candidate.email}")
            elif link.email:
                # Chercher l'utilisateur par email
                try:
                    candidate = CustomUser.objects.get(email=link.email)
                    logger.info(f"✅ Candidat trouvé par email: {candidate.email}")
                except CustomUser.DoesNotExist:
                    logger.error(f"❌ Candidat introuvable pour email: {link.email}")
                    return Response({
                        "detail": "Candidat introuvable pour ce lien."
                    }, status=status.HTTP_404_NOT_FOUND)
        except CampaignLink.DoesNotExist:
            logger.error(f"❌ Token d'invitation invalide: {candidate_identifier}")
            return Response({
                "detail": "Token d'invitation invalide."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not candidate:
            logger.error(f"❌ Impossible d'identifier le candidat")
            return Response({
                "detail": "Impossible d'identifier le candidat."
            }, status=status.HTTP_400_BAD_REQUEST)

        logger.info(f"✅ Candidat identifié: {candidate.email} (ID: {candidate.id})")

        # Vérifier si une réponse existe déjà pour cette question/candidat
        existing_answer = InterviewAnswer.objects.filter(question=question, candidate=candidate).first()
        
        if existing_answer:
            logger.warning(f"⚠️ Réponse déjà existante pour question {question_id} et candidat {candidate.id}")
            logger.info(f"🔄 Mise à jour de la réponse existante (ID: {existing_answer.id})")
            
            # Mettre à jour la réponse existante
            try:
                existing_answer.video_file = video_file
                existing_answer.duration = int(duration)
                existing_answer.file_size = video_file.size
                existing_answer.status = 'completed'
                existing_answer.save()
                
                logger.info(f"✅ Réponse mise à jour avec succès: ID {existing_answer.id}")
                
                serializer = self.get_serializer(existing_answer)
                return Response(serializer.data, status=status.HTTP_200_OK)
                
            except Exception as e:
                logger.error(f"❌ Erreur lors de la mise à jour de la réponse: {str(e)}")
                return Response({
                    "detail": f"Erreur lors de la mise à jour: {str(e)}"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            # Créer une nouvelle réponse
            try:
                logger.info(f"💾 Création d'une nouvelle réponse...")
                answer = InterviewAnswer.objects.create(
                    question=question,
                    candidate=candidate,
                    video_file=video_file,
                    duration=int(duration),
                    file_size=video_file.size,
                    status='completed'
                )
                logger.info(f"✅ Réponse créée avec succès: ID {answer.id}")
                
                # Marquer le lien comme utilisé maintenant que l'entretien est passé
                try:
                    link = CampaignLink.objects.get(
                        campaign=question.campaign,
                        candidate=candidate
                    )
                    if not link.used_at:  # Marquer seulement si pas encore marqué
                        link.mark_used()
                        logger.info(f"🔒 Lien marqué comme utilisé pour candidat {candidate.id}")
                except CampaignLink.DoesNotExist:
                    logger.warning(f"Aucun lien trouvé pour candidat {candidate.id} et campagne {question.campaign.id}")
                
                serializer = self.get_serializer(answer)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                logger.error(f"❌ Erreur lors de la création de la réponse: {str(e)}")
                return Response({
                    "detail": f"Erreur lors de la sauvegarde: {str(e)}"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def by_campaign(self, request):
        """
        Récupère toutes les réponses pour une campagne donnée (pour les recruteurs).
        """
        campaign_id = request.query_params.get('campaign_id')
        if not campaign_id:
            return Response({
                "detail": "L'ID de la campagne est requis."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            campaign = InterviewCampaign.objects.get(pk=campaign_id)
        except InterviewCampaign.DoesNotExist:
            return Response({
                "detail": "Campagne introuvable."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Vérifier si l'utilisateur est le recruteur de cette campagne
        if request.user != campaign.job_offer.recruiter and not request.user.is_staff:
            return Response({
                "detail": "Non autorisé à voir les réponses de cette campagne."
            }, status=status.HTTP_403_FORBIDDEN)
        
        answers = InterviewAnswer.objects.filter(
            question__campaign=campaign
        ).select_related('candidate', 'question').order_by('-created_at')
        
        # Filtrer les réponses qui ont des URLs Cloudinary valides
        valid_answers = []
        for answer in answers:
            if answer.cloudinary_secure_url or answer.cloudinary_url:
                # Vérifier si la vidéo existe encore sur Cloudinary
                try:
                    from .cloudinary_service import CloudinaryVideoService
                    if answer.cloudinary_public_id:
                        video_info = CloudinaryVideoService.get_video_info(answer.cloudinary_public_id)
                        if video_info:
                            valid_answers.append(answer)
                        else:
                            # Vidéo supprimée de Cloudinary, nettoyer l'enregistrement
                            logger.warning(f"Vidéo supprimée de Cloudinary, nettoyage de l'enregistrement {answer.id}")
                            answer.cloudinary_public_id = None
                            answer.cloudinary_url = None
                            answer.cloudinary_secure_url = None
                            answer.status = 'deleted'
                            answer.save()
                    else:
                        valid_answers.append(answer)
                except Exception as e:
                    logger.error(f"Erreur vérification Cloudinary pour réponse {answer.id}: {e}")
                    valid_answers.append(answer)  # Garder en cas d'erreur de vérification
            else:
                valid_answers.append(answer)
        
        serializer = self.get_serializer(valid_answers, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def candidate_evaluation(self, request):
        """
        Endpoint spécialisé pour l'évaluation d'un candidat par campagne.
        Format: [{"question": "text", "video_url": "url", "score": 0, "recruiter_notes": ""}]
        """
        campaign_id = request.query_params.get('campaign_id')
        candidate_id = request.query_params.get('candidate_id')
        
        if not campaign_id or not candidate_id:
            return Response({
                "detail": "Les paramètres campaign_id et candidate_id sont requis."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            campaign = InterviewCampaign.objects.get(pk=campaign_id)
            candidate = CustomUser.objects.get(pk=candidate_id)
        except InterviewCampaign.DoesNotExist:
            return Response({
                "detail": "Campagne introuvable."
            }, status=status.HTTP_404_NOT_FOUND)
        except CustomUser.DoesNotExist:
            return Response({
                "detail": "Candidat introuvable."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Vérifier les permissions
        if request.user != campaign.job_offer.recruiter and not request.user.is_staff:
            return Response({
                "detail": "Non autorisé à voir les réponses de cette campagne."
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Récupérer les réponses du candidat pour cette campagne
        answers = InterviewAnswer.objects.filter(
            question__campaign=campaign,
            candidate=candidate,
            status='completed'
        ).select_related('question').order_by('question__order')
        
        # Formater les données selon le format demandé
        evaluation_data = []
        for answer in answers:
            # Vérifier que la vidéo existe sur Cloudinary
            video_url = None
            if answer.cloudinary_secure_url:
                try:
                    from .cloudinary_service import CloudinaryVideoService
                    if answer.cloudinary_public_id:
                        video_info = CloudinaryVideoService.get_video_info(answer.cloudinary_public_id)
                        if video_info:
                            video_url = answer.cloudinary_secure_url
                        else:
                            # Nettoyer l'enregistrement si la vidéo n'existe plus
                            answer.cloudinary_public_id = None
                            answer.cloudinary_url = None
                            answer.cloudinary_secure_url = None
                            answer.status = 'deleted'
                            answer.save()
                            continue
                    else:
                        video_url = answer.cloudinary_secure_url
                except Exception as e:
                    logger.error(f"Erreur vérification Cloudinary pour réponse {answer.id}: {e}")
                    video_url = answer.cloudinary_secure_url
            
            if video_url:
                evaluation_data.append({
                    "id": answer.id,
                    "question": answer.question.text,
                    "video_url": video_url,
                    "score": answer.score,
                    "recruiter_notes": answer.recruiter_notes or "",
                    "duration": answer.duration,
                    "created_at": answer.created_at.isoformat(),
                    "question_order": answer.question.order
                })
        
        return Response(evaluation_data)
    
    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def update_evaluation(self, request, pk=None):
        """
        Met à jour le score et les notes du recruteur pour une réponse spécifique.
        """
        try:
            answer = self.get_object()
        except InterviewAnswer.DoesNotExist:
            return Response({
                "detail": "Réponse introuvable."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Vérifier les permissions
        if request.user != answer.question.campaign.job_offer.recruiter and not request.user.is_staff:
            return Response({
                "detail": "Non autorisé à modifier cette évaluation."
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Mettre à jour les champs autorisés
        score = request.data.get('score')
        recruiter_notes = request.data.get('recruiter_notes')
        
        if score is not None:
            if not isinstance(score, int) or score < 0 or score > 100:
                return Response({
                    "detail": "Le score doit être un entier entre 0 et 100."
                }, status=status.HTTP_400_BAD_REQUEST)
            answer.score = score
        
        if recruiter_notes is not None:
            answer.recruiter_notes = recruiter_notes
        
        answer.save()
        
        return Response({
            "id": answer.id,
            "score": answer.score,
            "recruiter_notes": answer.recruiter_notes,
            "updated_at": answer.updated_at.isoformat()
        })


# ========== Vues IA pour Génération de Questions ==========

class AIQuestionGeneratorView(APIView):
    """
    Vue pour générer des questions d'entrevue avec l'IA.
    POST /api/ai/generate-questions/
    """
    permission_classes = [IsAuthenticated]
    

    def post(self, request):
        """
        Génère des questions d'entrevue basées sur l'offre d'emploi avec Google Gemini.
        Body attendu:
        {
            "job_title": "string",
            "job_description": "string",
            "required_skills": ["skill1", "skill2"],
            "experience_level": "junior|intermediate|senior",
            "question_count": 5,
            "difficulty_level": "easy|medium|hard"
        }
        """
        # Sécurité: Seuls les recruteurs ou staff
        if not hasattr(request.user, 'role') or (request.user.role != 'RECRUTEUR' and not request.user.is_staff):
            return Response({
                'error': 'Seuls les recruteurs peuvent générer des questions IA.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Récupération des données
        job_title = request.data.get('job_title', '').strip()
        job_description = request.data.get('job_description', '').strip()
        required_skills = request.data.get('required_skills', [])
        experience_level = request.data.get('experience_level', 'intermediate')
        try:
            question_count = int(request.data.get('question_count', 5))
        except (ValueError, TypeError):
            question_count = 5
        difficulty_level = request.data.get('difficulty_level', 'medium')

        # Validation
        if not job_title or not job_description:
            return Response({'error': 'Le titre et la description du poste sont obligatoires.'}, status=status.HTTP_400_BAD_REQUEST)
        if question_count < 1 or question_count > 20:
            return Response({'error': 'Le nombre de questions doit être entre 1 et 20.'}, status=status.HTTP_400_BAD_REQUEST)
        if experience_level not in ['junior', 'intermediate', 'senior']:
            return Response({'error': 'Niveau d\'expérience invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        if difficulty_level not in ['easy', 'medium', 'hard']:
            return Response({'error': 'Niveau de difficulté invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        # Extraction des prérequis depuis les données reçues
        requirements_list = request.data.get('required_skills', [])
        if isinstance(requirements_list, list):
            requirements = ', '.join(requirements_list)
        else:
            requirements = str(requirements_list) if requirements_list else ''

        # Extraction des compteurs de questions spécifiques
        behavioral_count = request.data.get('behavioral_count')
        technical_count = request.data.get('technical_count')

        # Récupérer les questions statiques existantes de la campagne
        existing_questions_count = request.data.get('existing_questions_count', 0)

        # Calculer le nombre de questions IA à générer
        # Si on veut 5 questions au total et qu'il y en a déjà 1 statique, générer seulement 4
        ai_questions_needed = max(0, question_count - existing_questions_count)

        try:
            # Appel au service IA pour générer les questions (uniquement dynamique)
            ai_generator = AIInterviewQuestionGenerator()
            questions = ai_generator.generate_questions(
                offer_title=job_title,
                offer_description=job_description,
                number_of_questions=ai_questions_needed,
                difficulty=difficulty_level,
                requirements=requirements,
                behavioral_count=behavioral_count,
                technical_count=technical_count
            )

            # Analyser la qualité des questions générées
            quality_analysis = analyze_question_quality(questions, job_title, requirements)
            analyzed_questions = []
            for question in questions:
                analyzed_questions.append({
                    **question,
                    'quality_score': quality_analysis.get('score', 0),
                    'quality_feedback': quality_analysis.get('feedback', [])
                })

            logger.info(f"Questions IA générées avec succès pour l'utilisateur {getattr(request.user, 'id', 'inconnu')}")

            return Response({
                'success': True,
                'questions': analyzed_questions,
                'metadata': {
                    'job_title': job_title,
                    'experience_level': experience_level,
                    'difficulty_level': difficulty_level,
                    'generated_count': len(analyzed_questions),
                    'ai_provider': 'google_gemini'
                }
            }, status=status.HTTP_200_OK)

        except ValueError as e:
            # Erreurs de validation ou de configuration
            logger.error(f"Erreur de validation lors de la génération: {str(e)}")
            return Response({
                'error': str(e),
                'type': 'validation_error'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Erreur technique lors de la génération de questions IA: {str(e)}")
            return Response({
                'error': 'Erreur technique lors de la génération des questions. Veuillez vérifier votre configuration Gemini.',
                'details': str(e) if getattr(settings, 'DEBUG', False) else None,
                'type': 'technical_error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AIQuestionAnalysisView(APIView):
    """
    Vue pour analyser la qualité d'une question existante.
    POST /api/ai/analyze-question/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Analyse la qualité d'une question d'entrevue.
        
        Body attendu:
        {
            "question": "string"
        }
        """
        # Vérifier que l'utilisateur est un recruteur
        if request.user.role != 'RECRUTEUR' and not request.user.is_staff:
            return Response({
                'error': 'Seuls les recruteurs peuvent analyser les questions.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        question_text = request.data.get('question', '').strip()
        
        if not question_text:
            return Response({
                'error': 'La question à analyser est obligatoire.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(question_text) < 10:
            return Response({
                'error': 'La question doit contenir au moins 10 caractères.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Analyser la qualité de la question
            analysis = analyze_question_quality([{"question": question_text, "type": "custom"}], "Question personnalisée", "")
            
            logger.info(f"Analyse de qualité effectuée pour une question de l'utilisateur {request.user.id}")
            
            return Response({
                'success': True,
                'question': question_text,
                'analysis': analysis
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erreur lors de l'analyse de question: {str(e)}")
            return Response({
                'error': 'Erreur lors de l\'analyse de la question. Veuillez réessayer.',
                'details': str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AIQuestionTemplatesView(APIView):
    """
    Vue pour obtenir des modèles de questions prédéfinies par catégorie.
    GET /api/ai/question-templates/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Retourne des modèles de questions organisés par catégorie.
        
        Query params:
        - category: (optionnel) Filtrer par catégorie spécifique
        - experience_level: (optionnel) Filtrer par niveau d'expérience
        """
        # Vérifier que l'utilisateur est un recruteur
        if request.user.role != 'RECRUTEUR' and not request.user.is_staff:
            return Response({
                'error': 'Seuls les recruteurs peuvent accéder aux modèles.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        category_filter = request.query_params.get('category')
        experience_filter = request.query_params.get('experience_level')
        
        try:
            # Obtenir les modèles de questions prédéfinies
            templates = ai_generator._get_fallback_questions()
            
            # Appliquer les filtres si spécifiés
            if category_filter or experience_filter:
                filtered_templates = []
                for question in templates:
                    include_question = True
                    
                    if category_filter and question.get('category', '').lower() != category_filter.lower():
                        include_question = False
                    
                    if experience_filter and question.get('difficulty', '').lower() != experience_filter.lower():
                        include_question = False
                    
                    if include_question:
                        filtered_templates.append(question)
                        
                templates = filtered_templates
            
            # Organiser par catégories
            categories = {}
            for question in templates:
                category = question.get('category', 'General')
                if category not in categories:
                    categories[category] = []
                categories[category].append(question)
            
            logger.info(f"Modèles de questions récupérés pour l'utilisateur {request.user.id}")
            
            return Response({
                'success': True,
                'templates': categories,
                'total_questions': len(templates),
                'categories_count': len(categories)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des modèles: {str(e)}")
            return Response({
                'error': 'Erreur lors de la récupération des modèles de questions.',
                'details': str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




class RecruiterEvaluationViewSet(ModelViewSet):
    """
    ViewSet pour les évaluations des recruteurs sur les réponses vidéo.
    Permet aux recruteurs d'évaluer les candidats avec scores détaillés.
    """
    serializer_class = RecruiterEvaluationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtre les évaluations selon le rôle de l'utilisateur"""
        user = self.request.user
        
        if user.role == 'RECRUTEUR':
            # Les recruteurs ne voient que leurs propres évaluations
            return RecruiterEvaluation.objects.filter(
                recruiter=user
            ).select_related(
                'interview_answer__candidate',
                'interview_answer__question__campaign__job_offer',
                'recruiter'
            ).order_by('-created_at')
        
        elif user.role == 'CANDIDAT':
            # Les candidats voient les évaluations de leurs réponses
            return RecruiterEvaluation.objects.filter(
                interview_answer__candidate=user
            ).select_related(
                'interview_answer__candidate',
                'interview_answer__question__campaign__job_offer',
                'recruiter'
            ).order_by('-created_at')
        
        else:
            # Admins voient tout
            return RecruiterEvaluation.objects.all().select_related(
                'interview_answer__candidate',
                'interview_answer__question__campaign__job_offer',
                'recruiter'
            ).order_by('-created_at')
    
    def perform_create(self, serializer):
        """Assigne automatiquement le recruteur connecté"""
        serializer.save(recruiter=self.request.user)
    
    @action(detail=False, methods=['get'])
    def by_campaign(self, request):
        """Récupère toutes les évaluations pour une campagne donnée"""
        campaign_id = request.query_params.get('campaign_id')
        
        if not campaign_id:
            return Response({
                'error': 'campaign_id est requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            campaign = InterviewCampaign.objects.get(id=campaign_id)
            
            # Vérifier que le recruteur a accès à cette campagne
            if request.user.role == 'RECRUTEUR' and campaign.job_offer.recruiter != request.user:
                return Response({
                    'error': 'Accès non autorisé à cette campagne'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Récupérer toutes les évaluations pour cette campagne
            evaluations = RecruiterEvaluation.objects.filter(
                interview_answer__question__campaign=campaign
            ).select_related(
                'interview_answer__candidate',
                'interview_answer__question',
                'recruiter'
            ).order_by('interview_answer__candidate__username', 'interview_answer__question__order')
            
            serializer = self.get_serializer(evaluations, many=True)
            
            return Response({
                'campaign_id': campaign_id,
                'campaign_title': campaign.title,
                'evaluations': serializer.data,
                'total_evaluations': evaluations.count()
            }, status=status.HTTP_200_OK)
            
        except InterviewCampaign.DoesNotExist:
            return Response({
                'error': 'Campagne introuvable'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def by_answer(self, request):
        """Récupère l'évaluation pour une réponse d'entretien spécifique"""
        answer_id = request.query_params.get('answer_id')
        
        if not answer_id:
            return Response({
                'error': 'answer_id est requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            answer = InterviewAnswer.objects.get(id=answer_id)
            
            # Vérifier les permissions
            if request.user.role == 'RECRUTEUR':
                if answer.question.campaign.job_offer.recruiter != request.user:
                    return Response({
                        'error': 'Accès non autorisé à cette réponse'
                    }, status=status.HTTP_403_FORBIDDEN)
            elif request.user.role == 'CANDIDAT':
                if answer.candidate != request.user:
                    return Response({
                        'error': 'Accès non autorisé à cette réponse'
                    }, status=status.HTTP_403_FORBIDDEN)
            
            try:
                evaluation = RecruiterEvaluation.objects.get(interview_answer=answer)
                serializer = self.get_serializer(evaluation)
                
                return Response({
                    'evaluation': serializer.data
                }, status=status.HTTP_200_OK)
                
            except RecruiterEvaluation.DoesNotExist:
                return Response({
                    'message': 'Aucune évaluation trouvée pour cette réponse',
                    'evaluation': None
                }, status=status.HTTP_200_OK)
            
        except InterviewAnswer.DoesNotExist:
            return Response({
                'error': 'Réponse d\'entretien introuvable'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def by_application(self, request):
        """Récupère l'évaluation globale pour une candidature donnée"""
        application_id = request.query_params.get('application_id')
        
        if not application_id:
            return Response({
                'error': 'application_id est requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            application = JobApplication.objects.get(id=application_id)
            
            # Vérifier les permissions
            if request.user.role == 'RECRUTEUR':
                if application.job_offer.recruiter != request.user:
                    return Response({
                        'error': 'Accès non autorisé à cette candidature'
                    }, status=status.HTTP_403_FORBIDDEN)
            elif request.user.role == 'CANDIDAT':
                if application.candidate != request.user:
                    return Response({
                        'error': 'Accès non autorisé à cette candidature'
                    }, status=status.HTTP_403_FORBIDDEN)
            
            # Chercher une évaluation globale pour cette candidature
            try:
                evaluation = GlobalInterviewEvaluation.objects.get(
                    job_application=application,
                    recruiter=request.user
                )
                # Retourner les données globales
                return Response({
                    'job_application': application.id,
                    'technical_skills': evaluation.technical_skills or 0,
                    'communication_skills': evaluation.communication_skills or 0,
                    'problem_solving': evaluation.problem_solving or 0,
                    'cultural_fit': evaluation.cultural_fit or 0,
                    'motivation': evaluation.motivation or 0,
                    'final_recommendation': evaluation.final_recommendation or '',
                    'strengths': evaluation.strengths or '',
                    'weaknesses': evaluation.weaknesses or '',
                    'general_comments': evaluation.general_comments or '',
                    'next_steps': evaluation.next_steps or '',
                    'overall_score': evaluation.overall_score or 0
                }, status=status.HTTP_200_OK)
            except GlobalInterviewEvaluation.DoesNotExist:
                return Response({
                    'message': 'Aucune évaluation globale trouvée'
                }, status=status.HTTP_200_OK)
                
        except JobApplication.DoesNotExist:
            return Response({
                'error': 'Candidature introuvable'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def create_or_update(self, request):
        """Crée ou met à jour une évaluation globale"""
        application_id = request.data.get('job_application')
        
        if not application_id:
            return Response({
                'error': 'job_application est requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            application = JobApplication.objects.get(id=application_id)
            
            # Vérifier les permissions
            if request.user.role == 'RECRUTEUR':
                if application.job_offer.recruiter != request.user:
                    return Response({
                        'error': 'Accès non autorisé à cette candidature'
                    }, status=status.HTTP_403_FORBIDDEN)
            
            # Trouver ou créer une évaluation pour cette candidature
            # On prend la première réponse du candidat pour cette campagne
            first_answer = InterviewAnswer.objects.filter(
                candidate=application.candidate,
                question__campaign__job_offer=application.job_offer
            ).first()
            
            if not first_answer:
                return Response({
                    'error': 'Aucune réponse trouvée pour cette candidature'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Créer ou mettre à jour l'évaluation
            evaluation, created = RecruiterEvaluation.objects.get_or_create(
                interview_answer=first_answer,
                recruiter=request.user,
                defaults={
                    'overall_score': 0,
                    'recommendation': 'average',
                    'overall_feedback': '',
                    'candidate': first_answer.candidate
                }
            )
            
            # Mettre à jour les champs globaux
            evaluation.technical_skills = request.data.get('technical_skills', evaluation.technical_skills)
            evaluation.communication_skills = request.data.get('communication_skills', evaluation.communication_skills)
            evaluation.problem_solving = request.data.get('problem_solving', evaluation.problem_solving)
            evaluation.cultural_fit = request.data.get('cultural_fit', evaluation.cultural_fit)
            evaluation.motivation = request.data.get('motivation', evaluation.motivation)
            evaluation.final_recommendation = request.data.get('final_recommendation', evaluation.final_recommendation)
            evaluation.strengths = request.data.get('strengths', evaluation.strengths)
            evaluation.weaknesses = request.data.get('weaknesses', evaluation.weaknesses)
            evaluation.general_comments = request.data.get('general_comments', evaluation.general_comments)
            evaluation.next_steps = request.data.get('next_steps', evaluation.next_steps)
            
            evaluation.save()
            
            # Retourner la réponse
            response_data = {
                'job_application': application.id,
                'technical_skills': evaluation.technical_skills or 0,
                'communication_skills': evaluation.communication_skills or 0,
                'problem_solving': evaluation.problem_solving or 0,
                'cultural_fit': evaluation.cultural_fit or 0,
                'motivation': evaluation.motivation or 0,
                'final_recommendation': evaluation.final_recommendation or '',
                'strengths': evaluation.strengths or '',
                'weaknesses': evaluation.weaknesses or '',
                'general_comments': evaluation.general_comments or '',
                'next_steps': evaluation.next_steps or '',
                'overall_score': evaluation.overall_score or 0
            }
            
            return Response({
                'evaluation': response_data,
                'message': 'Évaluation globale sauvegardée avec succès'
            }, status=status.HTTP_200_OK)
                
        except JobApplication.DoesNotExist:
            return Response({
                'error': 'Candidature introuvable'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def evaluate_answer(self, request):
        """Crée ou met à jour une évaluation pour une réponse d'entretien"""
        import logging
        logger = logging.getLogger(__name__)
        
        # Log des données reçues pour débogage
        logger.info(f"Données reçues pour evaluate_answer: {request.data}")
        
        answer_id = request.data.get('interview_answer')
        
        if not answer_id:
            logger.error("interview_answer manquant dans les données")
            return Response({
                'error': 'interview_answer est requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            answer = InterviewAnswer.objects.get(id=answer_id)
            logger.info(f"Réponse trouvée: {answer.id} pour candidat {answer.candidate.username}")
            
            # Vérifier que le recruteur a accès à cette réponse
            if answer.question.campaign.job_offer.recruiter != request.user:
                logger.warning(f"Accès refusé: recruteur {request.user.id} vs propriétaire {answer.question.campaign.job_offer.recruiter.id}")
                return Response({
                    'error': 'Vous n\'avez pas l\'autorisation d\'évaluer cette réponse'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Vérifier s'il existe déjà une évaluation
            try:
                evaluation = RecruiterEvaluation.objects.get(
                    interview_answer=answer,
                    recruiter=request.user
                )
                logger.info(f"Évaluation existante trouvée: {evaluation.id}")
                # Mise à jour de l'évaluation existante
                serializer = self.get_serializer(evaluation, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    logger.info("Évaluation mise à jour avec succès")
                    return Response({
                        'message': 'Évaluation mise à jour avec succès',
                        'evaluation': serializer.data
                    }, status=status.HTTP_200_OK)
                else:
                    logger.error(f"Erreurs de validation lors de la mise à jour: {serializer.errors}")
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                    
            except RecruiterEvaluation.DoesNotExist:
                logger.info("Création d'une nouvelle évaluation")
                # Création d'une nouvelle évaluation
                serializer = self.get_serializer(data=request.data)
                if serializer.is_valid():
                    serializer.save(recruiter=request.user, candidate=answer.candidate)
                    logger.info("Nouvelle évaluation créée avec succès")
                    return Response({
                        'message': 'Évaluation créée avec succès',
                        'evaluation': serializer.data
                    }, status=status.HTTP_201_CREATED)
                else:
                    logger.error(f"Erreurs de validation lors de la création: {serializer.errors}")
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except InterviewAnswer.DoesNotExist:
            logger.error(f"Réponse d'entretien {answer_id} introuvable")
            return Response({
                'error': 'Réponse d\'entretien introuvable'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Erreur inattendue dans evaluate_answer: {str(e)}")
            return Response({
                'error': 'Erreur interne du serveur'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GlobalInterviewEvaluationViewSet(ModelViewSet):
    """
    ViewSet pour les évaluations globales d'entretien.
    Permet de gérer l'évaluation finale après toutes les questions.
    """
    serializer_class = GlobalInterviewEvaluationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtre les évaluations selon le rôle de l'utilisateur"""
        user = self.request.user
        
        if user.role == 'RECRUTEUR':
            return GlobalInterviewEvaluation.objects.filter(
                recruiter=user
            ).select_related(
                'candidate', 'job_application__job_offer', 'recruiter'
            ).order_by('-created_at')
        
        elif user.role == 'CANDIDAT':
            return GlobalInterviewEvaluation.objects.filter(
                candidate=user
            ).select_related(
                'candidate', 'job_application__job_offer', 'recruiter'
            ).order_by('-created_at')
        
        else:
            return GlobalInterviewEvaluation.objects.all().select_related(
                'candidate', 'job_application__job_offer', 'recruiter'
            ).order_by('-created_at')
    
    def perform_create(self, serializer):
        """Assigne automatiquement le recruteur et candidat"""
        job_application = serializer.validated_data['job_application']
        serializer.save(
            recruiter=self.request.user,
            candidate=job_application.candidate
        )
    
    @action(detail=False, methods=['get'])
    def by_application(self, request):
        """Récupère l'évaluation globale pour une candidature donnée"""
        application_id = request.query_params.get('application_id')
        
        if not application_id:
            return Response({
                'error': 'application_id est requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            application = JobApplication.objects.get(id=application_id)
            
            # Vérifier les permissions
            if request.user.role == 'RECRUTEUR':
                if application.job_offer.recruiter != request.user:
                    return Response({
                        'error': 'Accès non autorisé à cette candidature'
                    }, status=status.HTTP_403_FORBIDDEN)
            elif request.user.role == 'CANDIDAT':
                if application.candidate != request.user:
                    return Response({
                        'error': 'Accès non autorisé à cette candidature'
                    }, status=status.HTTP_403_FORBIDDEN)
            
            try:
                evaluation = GlobalInterviewEvaluation.objects.get(
                    job_application=application,
                    recruiter=request.user
                )
                serializer = self.get_serializer(evaluation)
                return Response(serializer.data, status=status.HTTP_200_OK)
                
            except GlobalInterviewEvaluation.DoesNotExist:
                return Response({
                    'message': 'Aucune évaluation globale trouvée'
                }, status=status.HTTP_200_OK)
                
        except JobApplication.DoesNotExist:
            return Response({
                'error': 'Candidature introuvable'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def create_or_update(self, request):
        """Crée ou met à jour une évaluation globale"""
        application_id = request.data.get('job_application')
        
        if not application_id:
            return Response({
                'error': 'job_application est requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            application = JobApplication.objects.get(id=application_id)
            
            # Vérifier les permissions
            if request.user.role == 'RECRUTEUR':
                if application.job_offer.recruiter != request.user:
                    return Response({
                        'error': 'Accès non autorisé à cette candidature'
                    }, status=status.HTTP_403_FORBIDDEN)
            
            # Créer ou mettre à jour l'évaluation globale
            evaluation, created = GlobalInterviewEvaluation.objects.get_or_create(
                job_application=application,
                recruiter=request.user,
                defaults={
                    'candidate': application.candidate
                }
            )
            
            # Mettre à jour les champs
            for field in ['technical_skills', 'communication_skills', 'problem_solving', 
                         'cultural_fit', 'motivation', 'final_recommendation',
                         'strengths', 'weaknesses', 'general_comments', 'next_steps']:
                if field in request.data:
                    setattr(evaluation, field, request.data[field])
            
            evaluation.save()
            
            serializer = self.get_serializer(evaluation)
            
            return Response({
                'evaluation': serializer.data,
                'message': 'Évaluation globale sauvegardée avec succès',
                'created': created
            }, status=status.HTTP_200_OK)
                
        except JobApplication.DoesNotExist:
            return Response({
                'error': 'Candidature introuvable'
            }, status=status.HTTP_404_NOT_FOUND)


class AiEvaluationViewSet(ModelViewSet):
    """
    ViewSet pour gérer les évaluations IA des réponses vidéo.
    """
    serializer_class = AiEvaluationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtrage des évaluations selon le rôle de l'utilisateur"""
        user = self.request.user
        
        if user.role == 'RECRUTEUR':
            # Le recruteur voit les évaluations des offres qu'il a créées
            return AiEvaluation.objects.filter(
                interview_answer__question__campaign__job_offer__recruiter=user
            ).select_related(
                'interview_answer__question__campaign',
                'interview_answer__candidate'
            ).order_by('-created_at')
        
        elif user.role == 'CANDIDAT':
            # Le candidat voit ses propres évaluations
            return AiEvaluation.objects.filter(
                interview_answer__candidate=user
            ).select_related(
                'interview_answer__question__campaign'
            ).order_by('-created_at')
        
        else:
            # Administrateur voit tout
            return AiEvaluation.objects.all().select_related(
                'interview_answer__question__campaign',
                'interview_answer__candidate'
            ).order_by('-created_at')
    
    @action(detail=False, methods=['post'])
    def evaluate_video(self, request):
        """
        Déclenche l'évaluation IA d'une réponse vidéo spécifique.
        
        Body attendu:
        {
            "interview_answer_id": 123,
            "force_reevaluation": false
        }
        """
        serializer = AiEvaluationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'error': 'Données invalides',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        interview_answer_id = serializer.validated_data['interview_answer_id']
        force_reevaluation = serializer.validated_data.get('force_reevaluation', False)
        
        try:
            interview_answer = InterviewAnswer.objects.select_related(
                'question__campaign__job_offer',
                'candidate'
            ).get(id=interview_answer_id)
            
            # Vérifier les permissions
            if request.user.role == 'RECRUTEUR':
                if interview_answer.question.campaign.job_offer.recruiter != request.user:
                    return Response({
                        'error': 'Accès non autorisé à cette réponse'
                    }, status=status.HTTP_403_FORBIDDEN)
            elif request.user.role == 'CANDIDAT':
                if interview_answer.candidate != request.user:
                    return Response({
                        'error': 'Accès non autorisé à cette réponse'
                    }, status=status.HTTP_403_FORBIDDEN)
            
            # Vérifier si une évaluation existe déjà
            existing_evaluation = AiEvaluation.objects.filter(
                interview_answer=interview_answer
            ).first()
            
            if existing_evaluation and not force_reevaluation:
                return Response({
                    'message': 'Évaluation IA déjà existante',
                    'evaluation': AiEvaluationSerializer(existing_evaluation).data
                }, status=status.HTTP_200_OK)
            
            # Créer ou mettre à jour l'évaluation
            ai_evaluation, created = AiEvaluation.objects.get_or_create(
                interview_answer=interview_answer,
                defaults={
                    'status': 'pending',
                    'ai_provider': 'gemini'
                }
            )
            
            if not created and force_reevaluation:
                # Réinitialiser l'évaluation existante
                ai_evaluation.status = 'pending'
                ai_evaluation.error_message = None
                ai_evaluation.save()
            
            # Lancer l'évaluation IA en arrière-plan
            try:
                logger.info(f"🔍 [API DEBUG] Début évaluation IA pour réponse ID: {interview_answer.id}")
                logger.info(f"🔍 [API DEBUG] Candidat: {interview_answer.candidate.username}")
                logger.info(f"🔍 [API DEBUG] Question: {interview_answer.question.text[:50]}...")
                
                ai_service = AIVideoEvaluationService()
                
                # Marquer comme en cours de traitement
                ai_evaluation.status = 'processing'
                ai_evaluation.save()
                
                logger.info(f"🔍 [API DEBUG] Appel de evaluate_interview_answer avec ID: {interview_answer.id}")
                
                # Effectuer l'évaluation
                result = ai_service.evaluate_interview_answer(interview_answer.id)
                
                logger.info(f"🔍 [API DEBUG] Évaluation terminée avec succès")
                
                return Response({
                    'message': 'Évaluation IA démarrée avec succès',
                    'evaluation_id': ai_evaluation.id,
                    'status': 'processing',
                    'result': result if result else None
                }, status=status.HTTP_202_ACCEPTED)
                
            except Exception as e:
                ai_evaluation.status = 'failed'
                ai_evaluation.error_message = str(e)
                ai_evaluation.save()
                
                logger.error(f"❌ [API DEBUG] Erreur lors de l'évaluation IA: {str(e)}")
                logger.error(f"❌ [API DEBUG] Type d'erreur: {type(e).__name__}")
                logger.error(f"❌ [API DEBUG] Réponse ID qui a échoué: {interview_answer.id}")
                
                return Response({
                    'error': 'Erreur lors du lancement de l\'évaluation IA',
                    'details': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        except InterviewAnswer.DoesNotExist:
            return Response({
                'error': 'Réponse d\'entretien introuvable'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def bulk_evaluate(self, request):
        """
        Déclenche l'évaluation IA en lot pour une campagne.
        
        Body attendu:
        {
            "campaign_id": 123,
            "candidate_ids": [1, 2, 3],  // optionnel, tous si vide
            "force_reevaluation": false
        }
        """
        serializer = AiEvaluationBulkSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'error': 'Données invalides',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        campaign_id = serializer.validated_data['campaign_id']
        candidate_ids = serializer.validated_data.get('candidate_ids', [])
        force_reevaluation = serializer.validated_data.get('force_reevaluation', False)
        
        try:
            campaign = InterviewCampaign.objects.select_related('job_offer').get(id=campaign_id)
            
            # Vérifier les permissions
            if request.user.role == 'RECRUTEUR':
                if campaign.job_offer.recruiter != request.user:
                    return Response({
                        'error': 'Accès non autorisé à cette campagne'
                    }, status=status.HTTP_403_FORBIDDEN)
            
            # Construire la requête pour les réponses
            answers_query = InterviewAnswer.objects.filter(
                question__campaign=campaign
            ).exclude(
                Q(cloudinary_secure_url__isnull=True) & Q(cloudinary_url__isnull=True)
            )
            
            if candidate_ids:
                answers_query = answers_query.filter(candidate_id__in=candidate_ids)
            
            answers = answers_query.select_related('candidate', 'question')
            
            if not answers.exists():
                return Response({
                    'error': 'Aucune réponse vidéo trouvée pour cette campagne'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Statistiques de traitement
            stats = {
                'total_answers': answers.count(),
                'evaluations_created': 0,
                'evaluations_updated': 0,
                'evaluations_skipped': 0,
                'errors': []
            }
            
            ai_service = AIVideoEvaluationService()
            
            for answer in answers:
                try:
                    # Vérifier si une évaluation existe déjà
                    existing_evaluation = AiEvaluation.objects.filter(
                        interview_answer=answer
                    ).first()
                    
                    if existing_evaluation and not force_reevaluation:
                        stats['evaluations_skipped'] += 1
                        continue
                    
                    # Créer ou mettre à jour l'évaluation
                    ai_evaluation, created = AiEvaluation.objects.get_or_create(
                        interview_answer=answer,
                        defaults={
                            'status': 'pending',
                            'ai_provider': 'gemini'
                        }
                    )
                    
                    if created:
                        stats['evaluations_created'] += 1
                    else:
                        stats['evaluations_updated'] += 1
                        ai_evaluation.status = 'pending'
                        ai_evaluation.error_message = None
                        ai_evaluation.save()
                    
                    # Marquer comme en cours de traitement
                    ai_evaluation.status = 'processing'
                    ai_evaluation.save()
                    
                    # Lancer l'évaluation
                    ai_service.evaluate_interview_answer(answer.id)
                    
                except Exception as e:
                    error_msg = f"Erreur pour la réponse {answer.id}: {str(e)}"
                    stats['errors'].append(error_msg)
                    logger.error(error_msg)
            
            return Response({
                'message': 'Évaluation IA en lot démarrée',
                'campaign_id': campaign_id,
                'statistics': stats
            }, status=status.HTTP_202_ACCEPTED)
        
        except InterviewCampaign.DoesNotExist:
            return Response({
                'error': 'Campagne d\'entretien introuvable'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def by_campaign(self, request):
        """Récupère les évaluations IA pour une campagne spécifique"""
        campaign_id = request.query_params.get('campaign_id')
        
        if not campaign_id:
            return Response({
                'error': 'campaign_id est requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            campaign = InterviewCampaign.objects.select_related('job_offer').get(id=campaign_id)
            
            # Vérifier les permissions
            if request.user.role == 'RECRUTEUR':
                if campaign.job_offer.recruiter != request.user:
                    return Response({
                        'error': 'Accès non autorisé à cette campagne'
                    }, status=status.HTTP_403_FORBIDDEN)
            
            evaluations = AiEvaluation.objects.filter(
                interview_answer__question__campaign=campaign
            ).select_related(
                'interview_answer__candidate',
                'interview_answer__question'
            ).order_by('interview_answer__candidate', 'interview_answer__question__order')
            
            serializer = self.get_serializer(evaluations, many=True)
            
            return Response({
                'campaign_id': campaign_id,
                'campaign_title': campaign.title,
                'evaluations': serializer.data,
                'total_count': evaluations.count()
            }, status=status.HTTP_200_OK)
        
        except InterviewCampaign.DoesNotExist:
            return Response({
                'error': 'Campagne d\'entretien introuvable'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def by_candidate(self, request):
        """Récupère les évaluations IA pour un candidat spécifique"""
        candidate_id = request.query_params.get('candidate_id')
        campaign_id = request.query_params.get('campaign_id')
        
        if not candidate_id:
            return Response({
                'error': 'candidate_id est requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            candidate = CustomUser.objects.get(id=candidate_id, role='CANDIDAT')
            
            # Construire la requête
            evaluations_query = AiEvaluation.objects.filter(
                interview_answer__candidate=candidate
            )
            
            if campaign_id:
                evaluations_query = evaluations_query.filter(
                    interview_answer__question__campaign_id=campaign_id
                )
                
                # Vérifier les permissions pour la campagne
                if request.user.role == 'RECRUTEUR':
                    campaign = InterviewCampaign.objects.select_related('job_offer').get(id=campaign_id)
                    if campaign.job_offer.recruiter != request.user:
                        return Response({
                            'error': 'Accès non autorisé à cette campagne'
                        }, status=status.HTTP_403_FORBIDDEN)
            
            # Vérifier les permissions pour le candidat
            if request.user.role == 'CANDIDAT' and request.user != candidate:
                return Response({
                    'error': 'Accès non autorisé aux évaluations de ce candidat'
                }, status=status.HTTP_403_FORBIDDEN)
            elif request.user.role == 'RECRUTEUR':
                # Le recruteur ne peut voir que les évaluations de ses offres
                evaluations_query = evaluations_query.filter(
                    interview_answer__question__campaign__job_offer__recruiter=request.user
                )
            
            evaluations = evaluations_query.select_related(
                'interview_answer__question__campaign',
                'interview_answer__question'
            ).order_by('interview_answer__question__campaign', 'interview_answer__question__order')
            
            serializer = self.get_serializer(evaluations, many=True)
            
            return Response({
                'candidate_id': candidate_id,
                'candidate_name': f"{candidate.first_name} {candidate.last_name}" if candidate.first_name else candidate.username,
                'evaluations': serializer.data,
                'total_count': evaluations.count()
            }, status=status.HTTP_200_OK)
        
        except CustomUser.DoesNotExist:
            return Response({
                'error': 'Candidat introuvable'
            }, status=status.HTTP_404_NOT_FOUND)
        except InterviewCampaign.DoesNotExist:
            return Response({
                'error': 'Campagne d\'entretien introuvable'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def by_answer(self, request):
        """
        Récupère l'évaluation IA existante pour une réponse d'entretien spécifique.
        
        Query params:
        - answer_id: ID de la réponse d'entretien
        """
        answer_id = request.query_params.get('answer_id')
        
        if not answer_id:
            return Response({
                'error': 'answer_id est requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            answer = InterviewAnswer.objects.select_related(
                'question__campaign__job_offer',
                'candidate'
            ).get(id=answer_id)
            
            # Vérifier les permissions
            if request.user.role == 'RECRUTEUR':
                if answer.question.campaign.job_offer.recruiter != request.user:
                    return Response({
                        'error': 'Accès non autorisé à cette réponse'
                    }, status=status.HTTP_403_FORBIDDEN)
            elif request.user.role == 'CANDIDAT':
                if answer.candidate != request.user:
                    return Response({
                        'error': 'Accès non autorisé à cette réponse'
                    }, status=status.HTTP_403_FORBIDDEN)
            
            try:
                ai_evaluation = AiEvaluation.objects.get(interview_answer=answer)
                serializer = self.get_serializer(ai_evaluation)
                
                return Response({
                    'evaluation': serializer.data,
                    'has_evaluation': True,
                    'status': ai_evaluation.status
                }, status=status.HTTP_200_OK)
                
            except AiEvaluation.DoesNotExist:
                return Response({
                    'message': 'Aucune évaluation IA trouvée pour cette réponse',
                    'evaluation': None,
                    'has_evaluation': False,
                    'status': None
                }, status=status.HTTP_200_OK)
            
        except InterviewAnswer.DoesNotExist:
            return Response({
                'error': 'Réponse d\'entretien introuvable'
            }, status=status.HTTP_404_NOT_FOUND)


