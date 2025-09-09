from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from users.models import CustomUser
from interviews.models import JobApplication, JobOffer, CampaignLink, InterviewCampaign
from interviews.notification_service import NotificationService

class Command(BaseCommand):
    help = 'Créer des notifications de test pour les candidats'

    def add_arguments(self, parser):
        parser.add_argument(
            '--candidate-email',
            type=str,
            help='Email du candidat pour créer les notifications de test',
        )

    def handle(self, *args, **options):
        candidate_email = options.get('candidate_email')
        
        if candidate_email:
            try:
                candidate = CustomUser.objects.get(email=candidate_email, role='CANDIDAT')
            except CustomUser.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Candidat avec email {candidate_email} non trouvé')
                )
                return
        else:
            # Prendre le premier candidat disponible
            candidate = CustomUser.objects.filter(role='CANDIDAT').first()
            if not candidate:
                self.stdout.write(
                    self.style.ERROR('Aucun candidat trouvé dans la base de données')
                )
                return

        self.stdout.write(f'Création de notifications de test pour: {candidate.email}')

        # 1. Notification d'invitation à un entretien
        try:
            # Créer ou récupérer une offre d'emploi
            recruiter = CustomUser.objects.filter(role='RECRUTEUR').first()
            if recruiter:
                job_offer, created = JobOffer.objects.get_or_create(
                    title="Développeur Full Stack - Test",
                    recruiter=recruiter,
                    defaults={
                        'description': "Poste de développeur Full Stack pour notre équipe technique",
                        'location': "Paris, France",
                        'contract_type': 'CDI',
                        'salary': '45000-55000€'
                    }
                )

                # Créer une campagne d'entretien
                campaign, created = InterviewCampaign.objects.get_or_create(
                    title="Entretien technique - Développeur",
                    job_offer=job_offer,
                    defaults={
                        'description': "Entretien technique pour évaluer les compétences",
                        'start_date': timezone.now().date(),
                        'end_date': (timezone.now() + timedelta(days=7)).date()
                    }
                )

                # Créer un lien de campagne
                campaign_link, created = CampaignLink.objects.get_or_create(
                    campaign=campaign,
                    candidate=candidate,
                    defaults={
                        'expires_at': timezone.now() + timedelta(days=7)
                    }
                )

                NotificationService.create_interview_invitation_notification(campaign_link)
                self.stdout.write(
                    self.style.SUCCESS('✓ Notification d\'invitation à un entretien créée')
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur lors de la création de l\'invitation: {e}')
            )

        # 2. Notification de changement de statut de candidature
        try:
            # Créer une candidature si elle n'existe pas
            job_application, created = JobApplication.objects.get_or_create(
                candidate=candidate,
                job_offer=job_offer,
                defaults={
                    'status': 'EN_ATTENTE',
                    'cover_letter': 'Lettre de motivation de test'
                }
            )

            # Simuler un changement de statut
            NotificationService.create_application_status_notification(
                job_application, 'EN_ATTENTE', 'ACCEPTE'
            )
            self.stdout.write(
                self.style.SUCCESS('✓ Notification de changement de statut créée')
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur lors de la création du changement de statut: {e}')
            )

        # 3. Notification de nouvelle opportunité
        try:
            NotificationService.create_job_match_notification(candidate, job_offer)
            self.stdout.write(
                self.style.SUCCESS('✓ Notification de nouvelle opportunité créée')
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur lors de la création de l\'opportunité: {e}')
            )

        # 4. Notification de rappel d'entretien
        try:
            if 'campaign_link' in locals():
                NotificationService.create_interview_reminder_notification(campaign_link, 1)
                self.stdout.write(
                    self.style.SUCCESS('✓ Notification de rappel d\'entretien créée')
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur lors de la création du rappel: {e}')
            )

        # 5. Notification de mise à jour de profil
        try:
            NotificationService.create_profile_update_notification(candidate)
            self.stdout.write(
                self.style.SUCCESS('✓ Notification de mise à jour de profil créée')
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur lors de la création de la mise à jour: {e}')
            )

        # 6. Notification système
        try:
            NotificationService.create_system_notification(
                candidate,
                "Bienvenue sur JobGate !",
                "Merci de vous être inscrit sur notre plateforme. Explorez les offres d'emploi et postulez dès maintenant !",
                'MEDIUM'
            )
            self.stdout.write(
                self.style.SUCCESS('✓ Notification système créée')
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur lors de la création de la notification système: {e}')
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n🎉 Notifications de test créées avec succès pour {candidate.email}!'
            )
        )
        self.stdout.write(
            'Vous pouvez maintenant tester l\'interface des notifications dans l\'application.'
        )
