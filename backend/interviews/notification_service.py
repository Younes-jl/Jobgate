from django.utils import timezone
from .notification_models import Notification
from .models import JobApplication, CampaignLink

class NotificationService:
    """
    Service pour créer et gérer les notifications
    """
    
    @staticmethod
    def create_application_status_notification(job_application, old_status, new_status):
        """Créer une notification pour un changement de statut de candidature"""
        status_messages = {
            'ACCEPTE': 'Félicitations ! Votre candidature a été acceptée.',
            'REFUSE': 'Votre candidature n\'a pas été retenue cette fois-ci.',
            'EN_COURS': 'Votre candidature est en cours d\'examen.',
            'EN_ATTENTE': 'Votre candidature est en attente de traitement.',
        }
        
        title = f"Candidature {job_application.job_offer.title}"
        message = status_messages.get(new_status, f"Le statut de votre candidature a changé vers {new_status}")
        
        priority = 'HIGH' if new_status in ['ACCEPTE', 'REFUSE'] else 'MEDIUM'
        
        return Notification.objects.create(
            recipient=job_application.candidate,
            title=title,
            message=message,
            notification_type='APPLICATION_STATUS',
            priority=priority,
            job_application=job_application,
            action_url=f'/candidate/dashboard'
        )
    
    @staticmethod
    def create_interview_invitation_notification(campaign_link):
        """Créer une notification pour une invitation à un entretien"""
        title = f"Invitation à un entretien - {campaign_link.campaign.title}"
        message = f"Vous avez été invité(e) à participer à un entretien vidéo pour le poste {campaign_link.campaign.job_offer.title}. Vérifiez votre boîte email pour plus de détails."
        
        return Notification.objects.create(
            recipient=campaign_link.candidate,
            title=title,
            message=message,
            notification_type='INTERVIEW_INVITATION',
            priority='HIGH',
            campaign_link=campaign_link,
            action_url=f'/interview/start/{campaign_link.token}'
        )
    
    @staticmethod
    def create_interview_reminder_notification(campaign_link, days_remaining):
        """Créer une notification de rappel d'entretien"""
        title = f"Rappel - Entretien {campaign_link.campaign.title}"
        
        if days_remaining == 0:
            message = "Votre entretien vidéo expire aujourd'hui ! N'oubliez pas de le compléter."
            priority = 'URGENT'
        elif days_remaining == 1:
            message = "Votre entretien vidéo expire demain. Pensez à le compléter."
            priority = 'HIGH'
        else:
            message = f"Votre entretien vidéo expire dans {days_remaining} jours."
            priority = 'MEDIUM'
        
        return Notification.objects.create(
            recipient=campaign_link.candidate,
            title=title,
            message=message,
            notification_type='INTERVIEW_REMINDER',
            priority=priority,
            campaign_link=campaign_link,
            action_url=f'/interview/start/{campaign_link.token}'
        )
    
    @staticmethod
    def create_job_match_notification(candidate, job_offer):
        """Créer une notification pour une nouvelle opportunité correspondante"""
        title = "Nouvelle opportunité correspondante"
        message = f"Une nouvelle offre correspond à votre profil : {job_offer.title} chez {job_offer.recruiter.company_name or 'cette entreprise'}."
        
        return Notification.objects.create(
            recipient=candidate,
            title=title,
            message=message,
            notification_type='JOB_MATCH',
            priority='MEDIUM',
            action_url=f'/candidate/offers/{job_offer.id}'
        )
    
    @staticmethod
    def create_profile_update_notification(user):
        """Créer une notification pour encourager la mise à jour du profil"""
        title = "Complétez votre profil"
        message = "Complétez votre profil pour augmenter vos chances d'être remarqué par les recruteurs."
        
        return Notification.objects.create(
            recipient=user,
            title=title,
            message=message,
            notification_type='PROFILE_UPDATE',
            priority='LOW',
            action_url='/candidate/infos-personnelles'
        )
    
    @staticmethod
    def create_system_notification(user, title, message, priority='MEDIUM'):
        """Créer une notification système générique"""
        return Notification.objects.create(
            recipient=user,
            title=title,
            message=message,
            notification_type='SYSTEM',
            priority=priority
        )
    
    @staticmethod
    def mark_notifications_as_read(user, notification_ids=None):
        """Marquer des notifications comme lues"""
        queryset = user.notifications.filter(is_read=False)
        
        if notification_ids:
            queryset = queryset.filter(id__in=notification_ids)
        
        return queryset.update(
            is_read=True,
            read_at=timezone.now()
        )
    
    @staticmethod
    def get_unread_count(user):
        """Obtenir le nombre de notifications non lues"""
        return user.notifications.filter(is_read=False).count()
    
    @staticmethod
    def get_recent_notifications(user, limit=5):
        """Obtenir les notifications récentes"""
        return user.notifications.all()[:limit]
