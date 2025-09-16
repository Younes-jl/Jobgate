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
    Candidature complète avec lettre de motivation et filière.
    """
    STATUS_CHOICES = [
        ('pending', 'En cours'),
        ('accepted', 'Acceptées'),
        ('rejected', 'Refusées'),
    ]

    job_offer = models.ForeignKey(JobOffer, on_delete=models.CASCADE, related_name="applications", verbose_name="Offre d'emploi")
    candidate = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="applications", verbose_name="Candidat")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="Statut")
    
    # Nouveaux champs pour la candidature
    lettre_motivation = models.TextField(verbose_name="Lettre de motivation", help_text="Lettre de motivation du candidat")
    filiere = models.CharField(max_length=255, verbose_name="Filière", help_text="Filière d'études ou domaine de spécialisation")
    
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



class RecruiterEvaluation(models.Model):
    """
    Modèle représentant l'évaluation d'un recruteur sur une réponse vidéo d'entretien.
    Permet au recruteur d'évaluer la communication, confiance et pertinence avec scores et commentaires.
    """
    # Relations
    interview_answer = models.ForeignKey(
        InterviewAnswer,
        on_delete=models.CASCADE,
        related_name="recruiter_evaluations",
        verbose_name="Réponse d'entretien"
    )
    recruiter = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="recruiter_evaluations",
        verbose_name="Recruteur évaluateur"
    )
    candidate = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="received_evaluations",
        verbose_name="Candidat évalué",
        help_text="Candidat qui passe l'entretien"
    )
    
    # Évaluation Communication
    communication_score = models.FloatField(
        verbose_name="Score Communication (0-100)",
        help_text="Clarté, fluidité, structure de la réponse",
        null=True,
        blank=True
    )
    communication_feedback = models.TextField(
        verbose_name="Commentaire Communication",
        help_text="Ex: 'Réponse claire, mais manque de concision'",
        blank=True,
        null=True
    )
    
    # Évaluation Confiance/Assurance
    confidence_score = models.FloatField(
        verbose_name="Score Confiance (0-100)",
        help_text="Ton affirmatif, peu d'hésitation",
        null=True,
        blank=True
    )
    confidence_feedback = models.TextField(
        verbose_name="Commentaire Confiance",
        help_text="Ex: 'Ton confiant, mais quelques hésitations'",
        blank=True,
        null=True
    )
    
    # Évaluation Pertinence
    relevance_score = models.FloatField(
        verbose_name="Score Pertinence (0-100)",
        help_text="Réponse alignée avec la question posée",
        null=True,
        blank=True
    )
    relevance_feedback = models.TextField(
        verbose_name="Commentaire Pertinence",
        help_text="Ex: 'Réponse bien ciblée, couvre 80% du sujet'",
        blank=True,
        null=True
    )
    
    # Score global et commentaire général
    overall_score = models.FloatField(
        verbose_name="Score Global (0-100)",
        help_text="Score global calculé ou saisi par le recruteur",
        null=True,
        blank=True
    )
    overall_feedback = models.TextField(
        verbose_name="Commentaire Global",
        help_text="Commentaire général du recruteur sur la réponse",
        blank=True,
        null=True
    )
    
    
    # Recommandation pour cette réponse spécifique
    RECOMMENDATION_CHOICES = [
        ('excellent', 'Excellente réponse'),
        ('good', 'Bonne réponse'),
        ('average', 'Réponse moyenne'),
        ('below_average', 'Réponse faible'),
        ('poor', 'Réponse insuffisante'),
    ]
    recommendation = models.CharField(
        max_length=20,
        choices=RECOMMENDATION_CHOICES,
        verbose_name="Recommandation pour cette réponse",
        null=True,
        blank=True
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière mise à jour")
    
    class Meta:
        verbose_name = "Évaluation Recruteur"
        verbose_name_plural = "Évaluations Recruteur"
        ordering = ['-created_at']
        unique_together = ('interview_answer', 'recruiter')
    
    def __str__(self):
        return f"Évaluation de {self.recruiter.username} - Question {self.interview_answer.question.order} - {self.interview_answer.candidate.username}"
    
    @property
    def question(self):
        """Accès rapide à la question via la réponse d'entretien"""
        return self.interview_answer.question
    
    @property
    def campaign(self):
        """Accès rapide à la campagne via la réponse d'entretien"""
        return self.interview_answer.question.campaign
    
    def calculate_overall_score(self):
        """Calcule le score global basé sur les scores individuels pour cette réponse"""
        scores = []
        if self.communication_score is not None:
            scores.append(self.communication_score)
        if self.confidence_score is not None:
            scores.append(self.confidence_score)
        if self.relevance_score is not None:
            scores.append(self.relevance_score)
        
        if scores:
            return sum(scores) / len(scores)
        return None
    
    def get_overall_score_display(self):
        """Retourne le score global formaté pour cette réponse"""
        score = self.overall_score or self.calculate_overall_score()
        if score is not None:
            return f"{score:.1f}/100"
        return "Non évalué"
    
    def get_recommendation_display_color(self):
        """Retourne la couleur associée à la recommandation pour l'UI"""
        colors = {
            'excellent': 'success',
            'good': 'info', 
            'average': 'warning',
            'below_average': 'secondary',
            'poor': 'danger',
        }
        return colors.get(self.recommendation, 'secondary')
    
    def save(self, *args, **kwargs):
        """Auto-calcul du score global si non défini"""
        if self.overall_score is None:
            calculated_score = self.calculate_overall_score()
            if calculated_score is not None:
                self.overall_score = calculated_score
        super().save(*args, **kwargs)


class GlobalInterviewEvaluation(models.Model):
    """
    Modèle pour l'évaluation globale de l'entretien après évaluation de toutes les questions.
    """
    # Relations
    job_application = models.OneToOneField(
        'JobApplication',
        on_delete=models.CASCADE,
        related_name="global_evaluation",
        verbose_name="Candidature"
    )
    recruiter = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="global_evaluations",
        verbose_name="Recruteur évaluateur"
    )
    candidate = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="received_global_evaluations",
        verbose_name="Candidat évalué"
    )
    
    # Scores par compétences (0-100)
    technical_skills = models.FloatField(
        verbose_name="Compétences Techniques",
        help_text="Maîtrise technique et expertise métier",
        null=True,
        blank=True
    )
    communication_skills = models.FloatField(
        verbose_name="Compétences Communication",
        help_text="Clarté, écoute, expression",
        null=True,
        blank=True
    )
    problem_solving = models.FloatField(
        verbose_name="Résolution de Problèmes",
        help_text="Analyse, créativité, logique",
        null=True,
        blank=True
    )
    cultural_fit = models.FloatField(
        verbose_name="Adéquation Culturelle",
        help_text="Alignement avec les valeurs de l'entreprise",
        null=True,
        blank=True
    )
    motivation = models.FloatField(
        verbose_name="Motivation",
        help_text="Intérêt pour le poste et l'entreprise",
        null=True,
        blank=True
    )
    
    # Recommandation finale
    RECOMMENDATION_CHOICES = [
        ('hire_immediately', 'Embaucher immédiatement'),
        ('second_interview', 'Deuxième entretien'),
        ('consider', 'À considérer'),
        ('reject_politely', 'Refuser poliment'),
        ('reject_definitively', 'Refuser définitivement'),
    ]
    final_recommendation = models.CharField(
        max_length=30,
        choices=RECOMMENDATION_CHOICES,
        verbose_name="Recommandation finale",
        null=True,
        blank=True
    )
    
    # Commentaires détaillés
    strengths = models.TextField(
        verbose_name="Points forts",
        help_text="Points positifs identifiés",
        blank=True,
        null=True
    )
    weaknesses = models.TextField(
        verbose_name="Points faibles",
        help_text="Axes d'amélioration identifiés",
        blank=True,
        null=True
    )
    general_comments = models.TextField(
        verbose_name="Commentaires généraux",
        help_text="Impression générale et observations",
        blank=True,
        null=True
    )
    next_steps = models.TextField(
        verbose_name="Prochaines étapes",
        help_text="Actions recommandées",
        blank=True,
        null=True
    )
    
    # Score global calculé
    overall_score = models.FloatField(
        verbose_name="Score Global",
        help_text="Score global calculé automatiquement",
        null=True,
        blank=True
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière mise à jour")
    
    class Meta:
        verbose_name = "Évaluation Globale d'Entretien"
        verbose_name_plural = "Évaluations Globales d'Entretien"
        ordering = ['-created_at']
        unique_together = ('job_application', 'recruiter')
    
    def __str__(self):
        return f"Évaluation globale - {self.candidate.username} - {self.job_application.job_offer.title}"
    
    def calculate_overall_score(self):
        """Calcule le score global basé sur les 5 dimensions"""
        scores = []
        if self.technical_skills is not None:
            scores.append(self.technical_skills)
        if self.communication_skills is not None:
            scores.append(self.communication_skills)
        if self.problem_solving is not None:
            scores.append(self.problem_solving)
        if self.cultural_fit is not None:
            scores.append(self.cultural_fit)
        if self.motivation is not None:
            scores.append(self.motivation)
        
        if scores:
            return sum(scores) / len(scores)
        return None
    
    def save(self, *args, **kwargs):
        """Auto-calcul du score global"""
        if self.overall_score is None:
            calculated_score = self.calculate_overall_score()
            if calculated_score is not None:
                self.overall_score = calculated_score
        super().save(*args, **kwargs)




class AiEvaluation(models.Model):
    """
    Modèle pour stocker les évaluations automatiques par IA des réponses vidéo.
    Chaque évaluation est liée à une réponse d'entretien spécifique.
    """
    # Relation avec la réponse d'entretien
    interview_answer = models.OneToOneField(
        InterviewAnswer,
        on_delete=models.CASCADE,
        related_name="ai_evaluation",
        verbose_name="Réponse d'entretien"
    )
    
    # Transcription de la vidéo
    transcription = models.TextField(
        blank=True,
        null=True,
        verbose_name="Transcription",
        help_text="Texte transcrit de la vidéo via Whisper"
    )
    transcription_language = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        verbose_name="Langue détectée",
        help_text="Langue détectée par Whisper (fr, en, etc.)"
    )
    transcription_confidence = models.FloatField(
        blank=True,
        null=True,
        verbose_name="Confiance transcription",
        help_text="Score de confiance de la transcription (0-1)"
    )
    
    # Scores d'évaluation IA (0-10)
    communication_score = models.FloatField(
        blank=True,
        null=True,
        verbose_name="Score Communication IA",
        help_text="Score de communication donné par l'IA (0-10)"
    )
    relevance_score = models.FloatField(
        blank=True,
        null=True,
        verbose_name="Score Pertinence IA",
        help_text="Score de pertinence donné par l'IA (0-10)"
    )
    confidence_score = models.FloatField(
        blank=True,
        null=True,
        verbose_name="Score Confiance IA",
        help_text="Score de confiance donné par l'IA (0-10)"
    )
    overall_ai_score = models.FloatField(
        blank=True,
        null=True,
        verbose_name="Score Global IA",
        help_text="Score global calculé par l'IA (0-10)"
    )
    
    # Feedback textuel de l'IA
    ai_feedback = models.TextField(
        blank=True,
        null=True,
        verbose_name="Feedback IA",
        help_text="Commentaires détaillés générés par l'IA"
    )
    strengths = models.TextField(
        blank=True,
        null=True,
        verbose_name="Points forts identifiés",
        help_text="Points forts identifiés par l'IA"
    )
    weaknesses = models.TextField(
        blank=True,
        null=True,
        verbose_name="Points faibles identifiés",
        help_text="Axes d'amélioration identifiés par l'IA"
    )
    
    # Métadonnées du traitement
    ai_provider = models.CharField(
        max_length=20,
        choices=[
            ('gemini', 'Google Gemini'),
            ('openai', 'OpenAI'),
            ('huggingface', 'Hugging Face'),
            ('local', 'Modèle Local')
        ],
        verbose_name="Fournisseur IA",
        help_text="Service IA utilisé pour l'évaluation"
    )
    processing_time = models.FloatField(
        blank=True,
        null=True,
        verbose_name="Temps de traitement",
        help_text="Durée totale du traitement en secondes"
    )
    
    # Statut du traitement
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
    error_message = models.TextField(
        blank=True,
        null=True,
        verbose_name="Message d'erreur",
        help_text="Détails de l'erreur en cas d'échec"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière mise à jour")
    completed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Date de completion"
    )
    
    class Meta:
        verbose_name = "Évaluation IA"
        verbose_name_plural = "Évaluations IA"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['ai_provider', 'status']),
        ]
    
    def __str__(self):
        candidate = self.interview_answer.candidate.username
        question_order = self.interview_answer.question.order
        return f"Évaluation IA - {candidate} - Question {question_order}"
    
    @property
    def candidate(self):
        """Accès rapide au candidat"""
        return self.interview_answer.candidate
    
    @property
    def question(self):
        """Accès rapide à la question"""
        return self.interview_answer.question
    
    @property
    def campaign(self):
        """Accès rapide à la campagne"""
        return self.interview_answer.question.campaign
    
    def calculate_overall_score(self):
        """Calcule le score global basé sur les scores individuels"""
        scores = []
        if self.communication_score is not None:
            scores.append(self.communication_score)
        if self.relevance_score is not None:
            scores.append(self.relevance_score)
        if self.confidence_score is not None:
            scores.append(self.confidence_score)
        
        if scores:
            return sum(scores) / len(scores)
        return None
    
    def get_score_grade(self, score):
        """Retourne le grade correspondant au score (A, B, C, D, F)"""
        if score is None:
            return "N/A"
        if score >= 8:
            return "A"
        elif score >= 6:
            return "B"
        elif score >= 4:
            return "C"
        elif score >= 2:
            return "D"
        else:
            return "F"
    
    def get_overall_grade(self):
        """Retourne le grade global"""
        score = self.overall_ai_score or self.calculate_overall_score()
        return self.get_score_grade(score)
    
    def mark_completed(self):
        """Marque l'évaluation comme terminée"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        if self.overall_ai_score is None:
            self.overall_ai_score = self.calculate_overall_score()
        self.save(update_fields=['status', 'completed_at', 'overall_ai_score'])
    
    def mark_failed(self, error_message):
        """Marque l'évaluation comme échouée"""
        self.status = 'failed'
        self.error_message = error_message
        self.save(update_fields=['status', 'error_message'])


# Import du modèle Notification
from .notification_models import Notification
