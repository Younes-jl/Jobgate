from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.core.mail import send_mail
from users.models import CustomUser
from .models import JobOffer, InterviewCampaign, InterviewQuestion, JobApplication, CampaignLink, InterviewAnswer
from .serializers import (
    JobOfferSerializer, 
    InterviewCampaignSerializer, 
    InterviewCampaignCreateSerializer,
    InterviewQuestionSerializer,
    JobApplicationSerializer,
    CampaignLinkSerializer,
    InterviewAnswerSerializer,
)
from .ai_service import ai_generator, analyze_question_quality
from django.conf import settings
import logging
from .ai_service import ai_generator, analyze_question_quality

logger = logging.getLogger(__name__)

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
        serializer.save(recruiter=self.request.user)
    
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
        if user.is_staff:
            return InterviewCampaign.objects.all()
        return InterviewCampaign.objects.filter(job_offer__recruiter=user)
    
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
        
        # Créer la candidature simplifiée
        application = JobApplication.objects.create(
            job_offer=job_offer,
            candidate=request.user,
            status='pending'
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


class CampaignLinkViewSet(viewsets.ViewSet):
    """Endpoints pour créer/obtenir des liens de campagne et valider les tokens."""
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        """Créer/obtenir un lien unique pour une candidature.
        Body attendu: { application_id: number }
        """
        application_id = request.data.get('application_id')
        if not application_id:
            return Response({"detail": "application_id requis"}, status=status.HTTP_400_BAD_REQUEST)
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
            link.expires_at = timezone.now() + timedelta(days=7)
            link.token = ''  # force regeneration in save()
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
        link = get_object_or_404(CampaignLink, pk=pk)
        # Autorisation: seul le recruteur de l'offre (ou staff)
        if request.user != link.campaign.job_offer.recruiter and not request.user.is_staff:
            return Response({"detail": "Non autorisé"}, status=status.HTTP_403_FORBIDDEN)
        if not link.is_valid:
            return Response({"detail": "Lien invalide ou expiré"}, status=status.HTTP_400_BAD_REQUEST)
        # Déterminer l'email cible
        to_email = link.email or (link.candidate.email if link.candidate and link.candidate.email else None)
        if not to_email:
            return Response({"detail": "Aucun email disponible pour ce candidat"}, status=status.HTTP_400_BAD_REQUEST)
        subject = f"Invitation à l'entretien: {link.campaign.title}"
        start_url = link.get_start_url()
        message = (
            f"Bonjour,\n\n"
            f"Vous êtes invité(e) à passer un entretien vidéo pour l'offre '{link.campaign.job_offer.title}'.\n"
            f"Campagne: {link.campaign.title}\n\n"
            f"Cliquez sur ce lien pour démarrer: {start_url}\n\n"
            f"Ce lien expirera le {link.expires_at.strftime('%Y-%m-%d %H:%M')} et est valide {link.max_uses} fois.\n\n"
            f"Cordialement,\nL'équipe JobGate"
        )
        send_mail(subject, message, None, [to_email], fail_silently=False)
        return Response({"detail": "Invitation envoyée", "email": to_email, "start_url": start_url})
    
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
        
        serializer = self.get_serializer(answers, many=True)
        return Response(serializer.data)


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

        try:
            # Appel au service IA (Gemini/GPT)
            questions_data = ai_generator.generate_questions(
                job_title=job_title,
                job_description=job_description,
                required_skills=required_skills,
                experience_level=experience_level,
                question_count=question_count,
                difficulty_level=difficulty_level
            )

            # Analyser la qualité des questions générées
            analyzed_questions = []
            for question in questions_data:
                quality_analysis = analyze_question_quality(question.get('question', ''))
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

        except Exception as e:
            logger.error(f"Erreur lors de la génération de questions IA: {str(e)}")
            return Response({
                'error': 'Erreur lors de la génération des questions IA. Veuillez réessayer.',
                'details': str(e) if getattr(settings, 'DEBUG', False) else None
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
            analysis = analyze_question_quality(question_text)
            
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
