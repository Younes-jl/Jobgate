from django.db import models
from django.utils import timezone
from users.models import CustomUser

class JobOffer(models.Model):
    """
    Modèle représentant une offre d'emploi.
    """
    title = models.CharField(max_length=255, verbose_name="Titre de l'offre")
    description = models.TextField(verbose_name="Description")
    recruiter = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="job_offers", verbose_name="Recruteur")
    location = models.CharField(max_length=255, verbose_name="Lieu")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    
    class Meta:
        verbose_name = "Offre d'emploi"
        verbose_name_plural = "Offres d'emploi"
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title

class InterviewCampaign(models.Model):
    """
    Modèle représentant une campagne d'entretiens vidéo.
    Chaque campagne est liée à une offre d'emploi et contient une série de questions.
    """
    title = models.CharField(max_length=255, verbose_name="Titre de la campagne")
    description = models.TextField(verbose_name="Description")
    job_offer = models.ForeignKey(JobOffer, on_delete=models.CASCADE, related_name="campaigns", verbose_name="Offre d'emploi")
    
    start_date = models.DateField(verbose_name="Date de début")
    end_date = models.DateField(verbose_name="Date de fin")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    active = models.BooleanField(default=True, verbose_name="Active")
    
    class Meta:
        verbose_name = "Campagne d'entretiens"
        verbose_name_plural = "Campagnes d'entretiens"
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
    
    def is_active(self):
        """Vérifie si la campagne est active selon les dates et le statut"""
        today = timezone.now().date()
        return self.active and self.start_date <= today <= self.end_date

class InterviewQuestion(models.Model):
    """
    Modèle représentant une question d'entretien.
    Chaque question appartient à une campagne et a un temps limite de réponse.
    """
    campaign = models.ForeignKey(InterviewCampaign, on_delete=models.CASCADE, related_name="questions", verbose_name="Campagne")
    text = models.TextField(verbose_name="Texte de la question")
    time_limit = models.PositiveIntegerField(default=60, verbose_name="Limite de temps (secondes)")
    order = models.PositiveIntegerField(default=0, verbose_name="Ordre")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    
    class Meta:
        verbose_name = "Question d'entretien"
        verbose_name_plural = "Questions d'entretien"
        ordering = ['campaign', 'order']
    
    def __str__(self):
        return f"{self.campaign.title} - Question {self.order}"
