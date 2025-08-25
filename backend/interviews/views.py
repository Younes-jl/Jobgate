from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.core.mail import send_mail
from .models import JobOffer, InterviewCampaign, InterviewQuestion, JobApplication, CampaignLink
from .serializers import (
    JobOfferSerializer, 
    InterviewCampaignSerializer, 
    InterviewCampaignCreateSerializer,
    InterviewQuestionSerializer,
    JobApplicationSerializer,
    CampaignLinkSerializer,
)
import logging

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
        if self.action == 'public_detail':
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
