from django.db import models
from django.utils import timezone
from users.models import CustomUser

class JobOffer(models.Model):
    """
    Modèle représentant une offre d'emploi.
    """
    CONTRACT_TYPES = [
        ('CDI', 'Contrat à Durée Indéterminée'),
        ('CDD', 'Contrat à Durée Déterminée'),
        ('STAGE', 'Stage'),
        ('ALTERNANCE', 'Alternance'),
        ('FREELANCE', 'Freelance'),
        ('INTERIM', 'Intérim'),
    ]
    
    title = models.CharField(max_length=255, verbose_name="Titre de l'offre")
    description = models.TextField(verbose_name="Description")
    recruiter = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="job_offers", verbose_name="Recruteur")
    location = models.CharField(max_length=255, verbose_name="Lieu")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    
    # Nouveaux champs
    salary = models.CharField(max_length=255, verbose_name="Salaire", blank=True, null=True)
    prerequisites = models.TextField(verbose_name="Prérequis", blank=True, null=True)
    contract_type = models.CharField(max_length=20, choices=CONTRACT_TYPES, default='CDI', verbose_name="Type de contrat")
    
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


class JobApplication(models.Model):
    """
    Modèle représentant une candidature à une offre d'emploi.
    Candidature simplifiée avec juste le lien entre candidat et offre.
    """
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('under_review', 'En cours d\'évaluation'),
        ('accepted', 'Acceptée'),
        ('rejected', 'Refusée'),
    ]

    job_offer = models.ForeignKey(JobOffer, on_delete=models.CASCADE, related_name="applications", verbose_name="Offre d'emploi")
    candidate = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="applications", verbose_name="Candidat")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="Statut")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de candidature")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière mise à jour")
    
    class Meta:
        verbose_name = "Candidature"
        verbose_name_plural = "Candidatures"
        ordering = ['-created_at']
        # Un candidat ne peut postuler qu'une seule fois à la même offre
        unique_together = ['job_offer', 'candidate']
    
    def __str__(self):
        return f"Candidature de {self.candidate.username} pour {self.job_offer.title}"
