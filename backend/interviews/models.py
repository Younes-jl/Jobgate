from django.db import models
from django.utils import timezone
from datetime import timedelta
import secrets
from users.models import CustomUser
from django.conf import settings
from django.db.models import Q, UniqueConstraint

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
    
    start_date = models.DateField(verbose_name="Date de début", null=True, blank=True)
    end_date = models.DateField(verbose_name="Date de fin", null=True, blank=True)
    
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
        if not self.active:
            return False
        
        today = timezone.now().date()
        
        # Si pas de dates définies, la campagne est active si le flag active est True
        if not self.start_date or not self.end_date:
            return True
            
        return self.start_date <= today <= self.end_date

class InterviewQuestion(models.Model):
    """
    Modèle représentant une question d'entretien.
    Chaque question appartient à une campagne et a un temps limite de réponse.
    """
    QUESTION_TYPES = [
        ('technique', 'Technique'),
        ('comportementale', 'Comportementale'),
        ('generale', 'Générale'),
    ]
    
    campaign = models.ForeignKey(InterviewCampaign, on_delete=models.CASCADE, related_name="questions", verbose_name="Campagne")
    text = models.TextField(verbose_name="Texte de la question")
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, default='generale', verbose_name="Type de question")
    time_limit = models.PositiveIntegerField(default=60, verbose_name="Limite de temps (secondes)")
    order = models.PositiveIntegerField(default=0, verbose_name="Ordre")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    
    class Meta:
        verbose_name = "Question d'entretien"
        verbose_name_plural = "Questions d'entretien"
        ordering = ['campaign', 'order']
    
    def __str__(self):
        return f"{self.campaign.title} - Question {self.order}"


class InterviewAnswer(models.Model):
    """
    Modèle représentant une réponse d'entretien vidéo d'un candidat.
    Chaque réponse est liée à une question spécifique et à un candidat.
    """
    question = models.ForeignKey(
        InterviewQuestion, 
        on_delete=models.CASCADE, 
        related_name="answers", 
        verbose_name="Question"
    )
    candidate = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name="interview_answers", 
        verbose_name="Candidat"
    )
    
    # Fichier vidéo de la réponse (stockage local, maintenant optionnel)
    video_file = models.FileField(
        upload_to='interview_answers/%Y/%m/%d/', 
        verbose_name="Fichier vidéo (local)",
        help_text="Réponse vidéo du candidat (legacy, si pas sur Cloudinary)",
        null=True,
        blank=True
    )

    # Champs pour l'intégration Cloudinary
    cloudinary_public_id = models.CharField(
        max_length=255, 
        blank=True, 
        null=True, 
        verbose_name="Cloudinary Public ID"
    )
    cloudinary_url = models.URLField(
        max_length=512, 
        blank=True, 
        null=True, 
        verbose_name="Cloudinary URL"
    )
    cloudinary_secure_url = models.URLField(
        max_length=512, 
        blank=True, 
        null=True, 
        verbose_name="Cloudinary Secure URL"
    )
    
    # Métadonnées de l'enregistrement
    duration = models.PositiveIntegerField(
        verbose_name="Durée (secondes)",
        help_text="Durée de l'enregistrement en secondes",
        null=True, 
        blank=True
    )
    file_size = models.PositiveIntegerField(
        verbose_name="Taille du fichier (bytes)",
        null=True, 
        blank=True
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière mise à jour")
    
    # Statut de la réponse
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('processing', 'En cours de traitement'),
        ('completed', 'Terminée'),
        ('failed', 'Échec'),
    ]
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending', 
        verbose_name="Statut"
    )
    
    # Notes optionnelles du recruteur
    recruiter_notes = models.TextField(
        blank=True, 
        null=True, 
        verbose_name="Notes du recruteur"
    )
    
    # Score optionnel (peut être utilisé pour évaluation)
    score = models.PositiveIntegerField(
        null=True, 
        blank=True, 
        verbose_name="Score",
        help_text="Score sur 100"
    )
    
    class Meta:
        verbose_name = "Réponse d'entretien"
        verbose_name_plural = "Réponses d'entretien"
        ordering = ['-created_at']
        # Un candidat ne peut donner qu'une seule réponse par question
        unique_together = ['question', 'candidate']
    
    def __str__(self):
        return f"Réponse de {self.candidate.username} - {self.question.campaign.title} - Question {self.question.order}"
    
    @property
    def campaign(self):
        """Accès rapide à la campagne via la question"""
        return self.question.campaign
    
    @property
    def job_offer(self):
        """Accès rapide à l'offre d'emploi via la campagne"""
        return self.question.campaign.job_offer
    
    def get_duration_formatted(self):
        """Retourne la durée formatée (MM:SS)"""
        minutes = self.duration // 60
        seconds = self.duration % 60
        return f"{minutes:02d}:{seconds:02d}"
    
    def get_file_size_formatted(self):
        """Retourne la taille du fichier formatée (MB, KB, etc.)"""
        if not self.file_size:
            return "N/A"
        
        if self.file_size < 1024:
            return f"{self.file_size} B"
        elif self.file_size < 1024 * 1024:
            return f"{self.file_size / 1024:.1f} KB"
        elif self.file_size < 1024 * 1024 * 1024:
            return f"{self.file_size / (1024 * 1024):.1f} MB"
        else:
            return f"{self.file_size / (1024 * 1024 * 1024):.1f} GB"
    
    def get_video_url(self):
        """Retourne l'URL de téléchargement/visualisation de la vidéo"""
        return self.video_file.url if self.video_file else None


def default_link_expiration():
    """Retourne une date d'expiration par défaut (24 heures)."""
    return timezone.now() + timedelta(hours=24)


class CampaignLink(models.Model):
    """
    Lien sécurisé et unique permettant d'inviter un candidat à une campagne.
    - Propre à une `InterviewCampaign`
    - Porte un token aléatoire unique (URL-safe)
    - Peut cibler un utilisateur existant (candidate) ou un email libre
    - Expire automatiquement après `expires_at`
    - Compte les usages (par défaut usage unique)
    """

    campaign = models.ForeignKey(
        InterviewCampaign,
        on_delete=models.CASCADE,
        related_name="links",
        verbose_name="Campagne",
    )
    # Si le candidat a déjà un compte sur la plateforme
    candidate = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="campaign_links",
        verbose_name="Candidat",
    )
    # Sinon on peut cibler directement un email (avant création de compte)
    email = models.EmailField(null=True, blank=True, verbose_name="Email destinataire")

    token = models.CharField(max_length=64, unique=True, db_index=True, verbose_name="Token")
    expires_at = models.DateTimeField(default=default_link_expiration, verbose_name="Expire le")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Créé le")
    used_at = models.DateTimeField(null=True, blank=True, verbose_name="Utilisé le")

    max_uses = models.PositiveIntegerField(default=1, verbose_name="Nombre d'usages autorisés")
    uses_count = models.PositiveIntegerField(default=0, verbose_name="Nombre d'usages consommés")
    revoked = models.BooleanField(default=False, verbose_name="Révoqué")

    class Meta:
        verbose_name = "Lien de campagne"
        verbose_name_plural = "Liens de campagne"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(check=models.Q(uses_count__gte=0), name="campaignlink_uses_count_gte_0"),
            models.CheckConstraint(check=models.Q(max_uses__gte=1), name="campaignlink_max_uses_gte_1"),
            # Un lien unique par (campagne, candidat) quand le candidat est défini
            UniqueConstraint(
                fields=["campaign", "candidate"],
                condition=Q(candidate__isnull=False),
                name="unique_link_per_campaign_and_candidate",
            ),
            # Un lien unique par (campagne, email) quand l'email est défini
            UniqueConstraint(
                fields=["campaign", "email"],
                condition=Q(email__isnull=False),
                name="unique_link_per_campaign_and_email",
            ),
        ]

    def __str__(self):
        target = self.candidate.username if self.candidate else (self.email or "(destinataire inconnu)")
        return f"Lien {self.token[:8]}… pour {self.campaign.title} → {target}"

    @staticmethod
    def generate_token(length: int = 10) -> str:
        """Génère un token court et lisible pour l'URL (hexadécimal).
        Par défaut, 10 caractères hex. Exemple: '3f9d8a2b1c'.
        Minimum de sécurité: 6 caractères (3 octets) pour limiter les collisions.
        """
        length = max(6, int(length))
        nbytes = (length + 1) // 2  # arrondi supérieur
        return secrets.token_hex(nbytes)[:length]

    def save(self, *args, **kwargs):
        if not self.token:
            # Garantir l'unicité du token en cas de collision improbable
            candidate_token = self.generate_token()
            while CampaignLink.objects.filter(token=candidate_token).exists():
                candidate_token = self.generate_token()
            self.token = candidate_token
        super().save(*args, **kwargs)

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    @property
    def is_valid(self) -> bool:
        """Retourne True si le lien peut encore être utilisé."""
        if self.revoked:
            return False
        if self.is_expired:
            return False
        
        # Vérifier si le candidat a déjà passé l'entretien pour cette offre
        if self.candidate:
            # Vérifier s'il existe déjà des réponses pour cette campagne/candidat
            existing_answers = InterviewAnswer.objects.filter(
                question__campaign=self.campaign,
                candidate=self.candidate
            ).exists()
            
            if existing_answers:
                return False
        
        if self.uses_count >= self.max_uses:
            return False
        return True

    def mark_used(self, commit: bool = True):
        """Marque le lien comme utilisé (incrémente le compteur et date)."""
        self.uses_count = (self.uses_count or 0) + 1
        self.used_at = timezone.now()
        if commit:
            self.save(update_fields=["uses_count", "used_at"])

    # Helpers d'URL
    def get_start_path(self) -> str:
        """Chemin relatif pour démarrer l'entretien."""
        return f"/interview/start/{self.token}"

    def get_start_url(self, base_url: str | None = None) -> str:
        """Construit l'URL absolue. Utilise settings.FRONTEND_BASE_URL si défini.
        Exemple: https://jobgate.com/interview/start/<token>
        """
        base = base_url or getattr(settings, "FRONTEND_BASE_URL", None) or getattr(settings, "SITE_URL", "")
        return f"{base}{self.get_start_path()}" if base else self.get_start_path()

    @classmethod
    def get_or_create_for_target(cls, campaign: InterviewCampaign, *, candidate: CustomUser | None = None, email: str | None = None, expires_at=None, max_uses: int = 1):
        """Récupère (ou crée) un lien unique pour un candidat ou un email donné, dans une campagne."""
        if not candidate and not email:
            raise ValueError("Un candidate ou un email doit être fourni")
        defaults = {
            "expires_at": expires_at or default_link_expiration(),
            "max_uses": max_uses,
        }
        obj, _created = cls.objects.get_or_create(
            campaign=campaign,
            candidate=candidate,
            email=email,
            defaults=defaults,
        )
        return obj


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


class AiEvaluation(models.Model):
    """
    Modèle représentant une évaluation IA d'une réponse vidéo d'entretien.
    Stocke la transcription, le score et le feedback généré par l'IA.
    """
    AI_PROVIDER_CHOICES = [
        ('gemini', 'Google Gemini'),
        ('huggingface', 'Hugging Face'),
        ('openai', 'OpenAI'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('processing', 'En cours de traitement'),
        ('completed', 'Terminée'),
        ('failed', 'Échec'),
    ]

    # Relations
    candidate = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name="ai_evaluations", 
        verbose_name="Candidat"
    )
    interview_answer = models.OneToOneField(
        InterviewAnswer,
        on_delete=models.CASCADE,
        related_name="ai_evaluation",
        verbose_name="Réponse d'entretien"
    )
    
    # Données de transcription
    transcription = models.TextField(
        verbose_name="Transcription",
        help_text="Texte transcrit de la vidéo via Whisper",
        blank=True,
        null=True
    )
    
    # Évaluation IA
    ai_score = models.FloatField(
        verbose_name="Score IA",
        help_text="Score généré par l'IA (0-100)",
        null=True,
        blank=True
    )
    ai_feedback = models.TextField(
        verbose_name="Feedback IA",
        help_text="Commentaires détaillés générés par l'IA",
        blank=True,
        null=True
    )
    
    # Métadonnées du traitement
    ai_provider = models.CharField(
        max_length=20,
        choices=AI_PROVIDER_CHOICES,
        verbose_name="Fournisseur IA",
        help_text="Service IA utilisé pour l'évaluation"
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Statut"
    )
    
    # Compétences attendues (JSON ou texte)
    expected_skills = models.JSONField(
        default=list,
        verbose_name="Compétences attendues",
        help_text="Liste des compétences à évaluer"
    )
    
    # Détails techniques
    processing_time = models.FloatField(
        null=True,
        blank=True,
        verbose_name="Temps de traitement (secondes)",
        help_text="Durée totale du traitement IA"
    )
    
    error_message = models.TextField(
        blank=True,
        null=True,
        verbose_name="Message d'erreur",
        help_text="Détails de l'erreur en cas d'échec"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière mise à jour")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Date de completion")
    
    class Meta:
        verbose_name = "Évaluation IA"
        verbose_name_plural = "Évaluations IA"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Évaluation IA - {self.candidate.username} - {self.interview_answer.question.campaign.title}"
    
    @property
    def campaign(self):
        """Accès rapide à la campagne via la réponse d'entretien"""
        return self.interview_answer.question.campaign
    
    @property
    def question(self):
        """Accès rapide à la question via la réponse d'entretien"""
        return self.interview_answer.question
    
    def get_score_percentage(self):
        """Retourne le score sous forme de pourcentage formaté"""
        if self.ai_score is not None:
            return f"{self.ai_score:.1f}%"
        return "N/A"
    
    def get_score_grade(self):
        """Retourne une note qualitative basée sur le score"""
        if self.ai_score is None:
            return "Non évalué"
        elif self.ai_score >= 90:
            return "Excellent"
        elif self.ai_score >= 80:
            return "Très bien"
        elif self.ai_score >= 70:
            return "Bien"
        elif self.ai_score >= 60:
            return "Satisfaisant"
        elif self.ai_score >= 50:
            return "Passable"
        else:
            return "Insuffisant"
