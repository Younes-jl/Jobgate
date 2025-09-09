from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import JobApplication, CampaignLink
from .notification_service import NotificationService

@receiver(pre_save, sender=JobApplication)
def track_application_status_change(sender, instance, **kwargs):
    """Suivre les changements de statut des candidatures"""
    if instance.pk:  # Si l'objet existe déjà
        try:
            old_instance = JobApplication.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except JobApplication.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None

@receiver(post_save, sender=JobApplication)
def create_application_status_notification(sender, instance, created, **kwargs):
    """Créer une notification lors du changement de statut d'une candidature"""
    if not created and hasattr(instance, '_old_status'):
        old_status = instance._old_status
        new_status = instance.status
        
        # Créer une notification seulement si le statut a changé
        if old_status != new_status and old_status is not None:
            NotificationService.create_application_status_notification(
                instance, old_status, new_status
            )

@receiver(post_save, sender=CampaignLink)
def create_interview_invitation_notification(sender, instance, created, **kwargs):
    """Créer une notification lors de l'envoi d'une invitation d'entretien"""
    if created:
        NotificationService.create_interview_invitation_notification(instance)
