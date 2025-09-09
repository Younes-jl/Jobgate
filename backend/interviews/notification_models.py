from django.db import models
from django.utils import timezone
from users.models import CustomUser
from .models import JobApplication, CampaignLink

class Notification(models.Model):
    """
    Modèle pour gérer les notifications des utilisateurs
    """
    NOTIFICATION_TYPES = [
        ('APPLICATION_STATUS', 'Changement de statut de candidature'),
        ('INTERVIEW_INVITATION', 'Invitation à un entretien'),
        ('INTERVIEW_REMINDER', 'Rappel d\'entretien'),
        ('JOB_MATCH', 'Nouvelle opportunité correspondante'),
        ('PROFILE_UPDATE', 'Mise à jour de profil'),
        ('SYSTEM', 'Notification système'),
    ]
    
    PRIORITY_LEVELS = [
        ('LOW', 'Faible'),
        ('MEDIUM', 'Moyenne'),
        ('HIGH', 'Élevée'),
        ('URGENT', 'Urgente'),
    ]
    
    recipient = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name='notifications',
        verbose_name="Destinataire"
    )
    title = models.CharField(max_length=255, verbose_name="Titre")
    message = models.TextField(verbose_name="Message")
    notification_type = models.CharField(
        max_length=50, 
        choices=NOTIFICATION_TYPES,
        verbose_name="Type de notification"
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_LEVELS,
        default='MEDIUM',
        verbose_name="Priorité"
    )
    
    # Relations optionnelles pour lier la notification à des objets spécifiques
    job_application = models.ForeignKey(
        JobApplication,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        verbose_name="Candidature liée"
    )
    campaign_link = models.ForeignKey(
        CampaignLink,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        verbose_name="Lien de campagne"
    )
    
    # Métadonnées
    is_read = models.BooleanField(default=False, verbose_name="Lu")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    read_at = models.DateTimeField(null=True, blank=True, verbose_name="Date de lecture")
    
    # URL optionnelle pour redirection
    action_url = models.URLField(null=True, blank=True, verbose_name="URL d'action")
    
    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.recipient.email}"
    
    def mark_as_read(self):
        """Marquer la notification comme lue"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    def get_icon_class(self):
        """Retourne la classe d'icône Bootstrap Icons selon le type"""
        icon_map = {
            'APPLICATION_STATUS': 'bi-briefcase',
            'INTERVIEW_INVITATION': 'bi-camera-video',
            'INTERVIEW_REMINDER': 'bi-alarm',
            'JOB_MATCH': 'bi-star',
            'PROFILE_UPDATE': 'bi-person-gear',
            'SYSTEM': 'bi-info-circle',
        }
        return icon_map.get(self.notification_type, 'bi-bell')
    
    def get_priority_color(self):
        """Retourne la couleur selon la priorité"""
        color_map = {
            'LOW': 'secondary',
            'MEDIUM': 'info',
            'HIGH': 'warning',
            'URGENT': 'danger',
        }
        return color_map.get(self.priority, 'info')
