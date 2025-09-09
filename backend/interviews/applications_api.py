from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import JobOffer, JobApplication
from .serializers import JobApplicationSerializer
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def job_applications(request):
    """
    Vue API pour récupérer les candidatures pour une offre d'emploi spécifique.
    """
    logger.error(f"Accès à l'API de candidatures avec user={request.user}, auth={request.auth}")
    
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def candidate_applications(request):
    """
    Vue API pour récupérer les candidatures d'un candidat spécifique.
    Retourne les IDs des offres auxquelles le candidat a déjà postulé.
    """
    if request.user.role != 'CANDIDAT':
        return Response(
            {"detail": "Accès réservé aux candidats."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    applications = JobApplication.objects.filter(candidate=request.user).values_list('job_offer_id', flat=True)
    return Response({"applied_job_offers": list(applications)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def candidate_details(request, candidate_id):
    """
    Vue API pour récupérer les détails complets d'un candidat avec sa candidature.
    Accessible uniquement aux recruteurs.
    """
    if request.user.role != 'RECRUTEUR':
        return Response(
            {"detail": "Accès réservé aux recruteurs."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Récupérer le candidat
    try:
        from users.models import CustomUser
        candidate = CustomUser.objects.get(id=candidate_id, role='CANDIDAT')
    except CustomUser.DoesNotExist:
        return Response(
            {"detail": "Candidat non trouvé."},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Récupérer toutes les candidatures de ce candidat pour les offres du recruteur connecté
    applications = JobApplication.objects.filter(
        candidate=candidate,
        job_offer__recruiter=request.user
    ).order_by('-created_at')
    
    if not applications.exists():
        return Response(
            {"detail": "Aucune candidature trouvée pour ce candidat sur vos offres."},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Sérialiser les candidatures avec tous les détails
    serializer = JobApplicationSerializer(applications, many=True)
    
    # Ajouter les informations personnelles du candidat
    from users.serializers import UserSerializer
    candidate_serializer = UserSerializer(candidate)
    
    return Response({
        "candidate": candidate_serializer.data,
        "applications": serializer.data
    })
