from django.db import models
from django.db import models
from django.conf import settings
import uuid

class JobOffer(models.Model):
    """
    Représente une offre d'emploi créée par un recruteur.
    """
    title = models.CharField(max_length=255, verbose_name="Titre de l'offre")
    description = models.TextField(verbose_name="Description du poste")
    location = models.CharField(max_length=150, verbose_name="Lieu")
    
    # Le lien clé : Qui a créé cette offre ?
    # On utilise le modèle utilisateur que vous avez défini dans settings.py.
    # limit_choices_to garantit que seuls les utilisateurs avec le rôle RECRUITER peuvent être choisis.
    created_by = models.ForeignKey( settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name="Créé par", related_name="job_offers")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière mise à jour")

    def __str__(self):
        return self.title




class InterviewCampaign(models.Model):
    """
    Représente la campagne d'entretien vidéo liée à UNE SEULE offre d'emploi.
    """
    # La relation "un-à-un" : chaque offre ne peut avoir qu'une seule campagne vidéo.
    # Si on supprime l'offre, la campagne est supprimée aussi (on_delete=models.CASCADE).
    job_offer = models.OneToOneField( JobOffer, on_delete=models.CASCADE, verbose_name="Offre d'emploi associée", related_name="interview_campaign" )
    title = models.CharField(max_length=255, verbose_name="Titre de la campagne")
    submission_deadline = models.DateField(verbose_name="Date limite de soumission")
    
    # Le champ "created_by" n'est pas nécessaire ici, on peut le retrouver via l'offre d'emploi.

    def __str__(self):
        return f"Campagne pour : {self.job_offer.title}"







class Question(models.Model):
    campaign = models.ForeignKey(InterviewCampaign, on_delete=models.CASCADE, verbose_name="Campagne associée", related_name="questions" )
    text = models.TextField(verbose_name="Texte de la question")
    preparation_time = models.PositiveIntegerField( default=30,  verbose_name="Temps de préparation (secondes)")
    response_duration_limit = models.PositiveIntegerField(  default=180,   verbose_name="Temps de réponse maximum (secondes)")
    order = models.PositiveIntegerField(verbose_name="Ordre de la question")

    class Meta:
       
        unique_together = ('campaign', 'order')
        ordering = ['order']

    def __str__(self):
        return f"Q{self.order}: {self.text[:50]}... pour la campagne '{self.campaign.title}'"
