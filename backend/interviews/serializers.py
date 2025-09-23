from rest_framework import serializers
from .models import (
    JobOffer, InterviewCampaign, InterviewQuestion, CampaignLink, 
    InterviewAnswer, JobApplication, RecruiterEvaluation, GlobalInterviewEvaluation, AiEvaluation
)
from users.models import CustomUser
from users.serializers import UserSerializer

class JobOfferSerializer(serializers.ModelSerializer):
    """Serializer pour les offres d'emploi"""
    
    class Meta:
        model = JobOffer
        fields = ['id', 'title', 'description', 'recruiter', 'location', 'created_at',
                  'salary', 'prerequisites', 'contract_type']
        read_only_fields = ['id', 'created_at', 'recruiter']

class InterviewQuestionSerializer(serializers.ModelSerializer):
    """Serializer pour les questions d'entretien"""
    
    class Meta:
        model = InterviewQuestion
        fields = ['id', 'text', 'question_type', 'time_limit', 'order', 'created_at', 'campaign']
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'campaign': {'required': False}  # Rendre le champ campaign optionnel
        }

class InterviewCampaignSerializer(serializers.ModelSerializer):
    """Serializer pour les campagnes d'entretiens"""
    questions = InterviewQuestionSerializer(many=True, required=False, read_only=True)
    job_offer_title = serializers.CharField(source='job_offer.title', read_only=True)
    
    class Meta:
        model = InterviewCampaign
        fields = ['id', 'title', 'description', 'job_offer', 'job_offer_title',
                  'start_date', 'end_date', 'active', 'created_at', 'questions']
        read_only_fields = ['id', 'created_at', 'job_offer_title']

class InterviewCampaignCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de campagnes d'entretiens avec des questions"""
    questions = InterviewQuestionSerializer(many=True, required=False)
    
    class Meta:
        model = InterviewCampaign
        fields = ['id', 'title', 'description', 'job_offer',
                  'start_date', 'end_date', 'active', 'questions']
        read_only_fields = ['id']
    
    def create(self, validated_data):
        """Création d'une campagne avec ses questions"""
        questions_data = validated_data.pop('questions', [])
        campaign = InterviewCampaign.objects.create(**validated_data)
        
        for i, question_data in enumerate(questions_data):
            question_data['order'] = i + 1
            # Mapper le type de question de l'IA vers le modèle
            if 'type' in question_data:
                ai_type = question_data.pop('type')
                if ai_type == 'technique':
                    question_data['question_type'] = 'technique'
                elif ai_type == 'comportementale':
                    question_data['question_type'] = 'comportementale'
                else:
                    question_data['question_type'] = 'generale'
            InterviewQuestion.objects.create(campaign=campaign, **question_data)
        
        return campaign


class CampaignLinkSerializer(serializers.ModelSerializer):
    """Serializer pour exposer un lien d'invitation unique."""
    start_url = serializers.SerializerMethodField()
    campaign_id = serializers.IntegerField(source='campaign.id', read_only=True)
    candidate_id = serializers.IntegerField(source='candidate.id', read_only=True)

    class Meta:
        model = CampaignLink
        fields = [
            'id', 'campaign_id', 'candidate_id', 'email', 'token',
            'expires_at', 'used_at', 'uses_count', 'max_uses', 'revoked', 'start_url', 'created_at'
        ]
        read_only_fields = [
            'id', 'token', 'expires_at', 'used_at', 'uses_count', 'max_uses', 'revoked', 'start_url', 'created_at',
            'campaign_id', 'candidate_id'
        ]

    def get_start_url(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.get_start_path())
        return obj.get_start_path()


class JobApplicationSerializer(serializers.ModelSerializer):
    """Serializer pour les candidatures complètes"""
    candidate_name = serializers.SerializerMethodField()
    job_title = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    candidate = UserSerializer(read_only=True)  # Utiliser UserSerializer pour inclure plus de détails
    job_offer = JobOfferSerializer(read_only=True)  # Inclure les détails complets de l'offre
    campaign_link = serializers.SerializerMethodField()  # Ajouter les infos du lien de campagne
    
    class Meta:
        model = JobApplication
        fields = ['id', 'job_offer', 'candidate', 'status', 'lettre_motivation', 'filiere',
                  'created_at', 'updated_at', 'candidate_name', 'job_title', 'status_display', 'campaign_link']
        read_only_fields = ['id', 'created_at', 'updated_at', 'candidate_name', 'job_title', 'status_display', 'campaign_link']
    
    def get_candidate_name(self, obj):
        return f"{obj.candidate.first_name} {obj.candidate.last_name}" if obj.candidate.first_name else obj.candidate.username
    
    def get_job_title(self, obj):
        return obj.job_offer.title
    
    def get_status_display(self, obj):
        return dict(JobApplication.STATUS_CHOICES)[obj.status]
    
    def get_campaign_link(self, obj):
        """Récupérer les informations du lien de campagne pour cette candidature"""
        try:
            # Chercher une campagne active pour cette offre
            campaign = obj.job_offer.campaigns.filter(active=True).first()
            if not campaign:
                return None
            
            # Chercher le lien de campagne pour ce candidat et cette campagne
            campaign_link = CampaignLink.objects.filter(
                campaign=campaign,
                candidate=obj.candidate
            ).first()
            
            if campaign_link:
                return {
                    'id': campaign_link.id,
                    'status': campaign_link.status,
                    'created_at': campaign_link.created_at,
                    'completed_at': campaign_link.completed_at,
                    'expires_at': campaign_link.expires_at,
                    'revoked': campaign_link.revoked
                }
            return None
        except Exception:
            return None
    
    def create(self, validated_data):
        # Assurez-vous que le candidat est bien celui qui est connecté
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['candidate'] = request.user
        return super().create(validated_data)


class InterviewAnswerSerializer(serializers.ModelSerializer):
    """Serializer pour les réponses d'entretien vidéo"""
    candidate_name = serializers.SerializerMethodField()
    question_text = serializers.CharField(source='question.text', read_only=True)
    campaign_title = serializers.CharField(source='question.campaign.title', read_only=True)
    duration_formatted = serializers.SerializerMethodField()
    file_size_formatted = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()
    
    class Meta:
        model = InterviewAnswer
        fields = [
            'id', 'question', 'candidate', 'video_file', 'duration', 'file_size',
            'status', 'score', 'recruiter_notes', 'created_at', 'updated_at',
            'candidate_name', 'question_text', 'campaign_title', 
            'duration_formatted', 'file_size_formatted', 'video_url',
            'cloudinary_public_id', 'cloudinary_url', 'cloudinary_secure_url',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'candidate_name', 
            'question_text', 'campaign_title', 'duration_formatted', 
            'file_size_formatted', 'video_url'
        ]
    
    def get_candidate_name(self, obj):
        """Nom complet du candidat"""
        if obj.candidate.first_name and obj.candidate.last_name:
            return f"{obj.candidate.first_name} {obj.candidate.last_name}"
        return obj.candidate.username
    
    def get_duration_formatted(self, obj):
        """Durée formatée (MM:SS)"""
        return obj.get_duration_formatted()
    
    def get_file_size_formatted(self, obj):
        """Taille du fichier formatée"""
        return obj.get_file_size_formatted()
    
    def get_video_url(self, obj):
        """URL de téléchargement/visualisation de la vidéo"""
        return obj.get_video_url()
    
    def create(self, validated_data):
        """Création d'une réponse avec gestion automatique de certains champs"""
        # S'assurer que le candidat est celui qui est connecté
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['candidate'] = request.user
        
        # Traiter le fichier vidéo pour extraire des métadonnées
        video_file = validated_data.get('video_file')
        if video_file:
            validated_data['file_size'] = video_file.size
        
        return super().create(validated_data)







class RecruiterEvaluationSerializer(serializers.ModelSerializer):
    """Serializer pour les évaluations des recruteurs"""
    candidate_name = serializers.SerializerMethodField()
    question_text = serializers.CharField(source='interview_answer.question.text', read_only=True)
    campaign_title = serializers.CharField(source='interview_answer.question.campaign.title', read_only=True)
    video_url = serializers.CharField(source='interview_answer.cloudinary_secure_url', read_only=True)
    recruiter_name = serializers.SerializerMethodField()
    overall_score_display = serializers.SerializerMethodField()
    recommendation_display = serializers.SerializerMethodField()
    recommendation_color = serializers.SerializerMethodField()
    
    # Scores formatés
    communication_score_percentage = serializers.SerializerMethodField()
    confidence_score_percentage = serializers.SerializerMethodField()
    relevance_score_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = RecruiterEvaluation
        fields = [
            'id', 'interview_answer', 'recruiter', 'recruiter_name',
            'communication_score', 'communication_feedback',
            'confidence_score', 'confidence_feedback', 
            'relevance_score', 'relevance_feedback',
            'overall_score', 'overall_feedback', 'recommendation',
            'created_at', 'updated_at',
            # Champs calculés pour l'affichage
            'candidate_name', 'question_text', 'campaign_title', 'video_url',
            'overall_score_display', 'recommendation_display', 'recommendation_color',
            'communication_score_percentage', 'confidence_score_percentage', 'relevance_score_percentage'
        ]
        read_only_fields = [
            'id', 'recruiter', 'created_at', 'updated_at', 'candidate_name', 'question_text', 
            'campaign_title', 'video_url', 'recruiter_name', 'overall_score_display',
            'recommendation_display', 'recommendation_color'
        ]
    
    def get_candidate_name(self, obj):
        """Nom complet du candidat"""
        candidate = obj.interview_answer.candidate
        if candidate.first_name and candidate.last_name:
            return f"{candidate.first_name} {candidate.last_name}"
        return candidate.username
    
    def get_recruiter_name(self, obj):
        """Nom complet du recruteur"""
        if obj.recruiter.first_name and obj.recruiter.last_name:
            return f"{obj.recruiter.first_name} {obj.recruiter.last_name}"
        return obj.recruiter.username
    
    def get_overall_score_display(self, obj):
        """Score global formaté"""
        return obj.get_overall_score_display()
    
    def get_recommendation_display(self, obj):
        """Recommandation formatée"""
        if obj.recommendation:
            return dict(RecruiterEvaluation.RECOMMENDATION_CHOICES).get(obj.recommendation, obj.recommendation)
        return "Non définie"
    
    def get_recommendation_color(self, obj):
        """Couleur de la recommandation pour l'UI"""
        return obj.get_recommendation_display_color()
    
    def get_communication_score_percentage(self, obj):
        """Score de communication formaté"""
        if obj.communication_score is not None:
            return f"{obj.communication_score:.1f}%"
        return "N/A"
    
    def get_confidence_score_percentage(self, obj):
        """Score de confiance formaté"""
        if obj.confidence_score is not None:
            return f"{obj.confidence_score:.1f}%"
        return "N/A"
    
    def get_relevance_score_percentage(self, obj):
        """Score de pertinence formaté"""
        if obj.relevance_score is not None:
            return f"{obj.relevance_score:.1f}%"
        return "N/A"
    
    def create(self, validated_data):
        """Création d'une évaluation avec gestion automatique du recruteur"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['recruiter'] = request.user
        return super().create(validated_data)
    
    def validate_interview_answer(self, value):
        """Valide que la réponse d'entretien existe et appartient à une campagne du recruteur"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            # Vérifier que le recruteur a accès à cette réponse via ses offres d'emploi
            campaign = value.question.campaign
            if campaign.job_offer.recruiter != request.user:
                raise serializers.ValidationError(
                    "Vous n'avez pas l'autorisation d'évaluer cette réponse d'entretien"
                )
        return value

    def validate(self, attrs):
        """Validation des scores (0-100)"""
        score_fields = ['communication_score', 'confidence_score', 'relevance_score', 'overall_score']

        def validate_overall_score(value):
            """Valide le score global"""
            if value is not None and (value < 0 or value > 100):
                raise serializers.ValidationError("Le score global doit être entre 0 et 100")
            return value

        for field in score_fields:
            score = attrs.get(field)
            if score is not None and (score < 0 or score > 100):
                raise serializers.ValidationError({
                    field: "Le score doit être compris entre 0 et 100"
                })

        return attrs

    
class GlobalInterviewEvaluationSerializer(serializers.ModelSerializer):
    """Serializer pour les évaluations globales d'entretien"""
    candidate_name = serializers.SerializerMethodField()
    job_offer_title = serializers.CharField(source='job_application.job_offer.title', read_only=True)
    overall_score_display = serializers.SerializerMethodField()
    
    class Meta:
        model = GlobalInterviewEvaluation
        fields = [
            'id', 'job_application', 'recruiter', 'candidate',
            'technical_skills', 'communication_skills', 'problem_solving',
            'cultural_fit', 'motivation', 'final_recommendation',
            'strengths', 'weaknesses', 'general_comments', 'next_steps',
            'overall_score', 'created_at', 'updated_at',
            # Champs calculés
            'candidate_name', 'job_offer_title', 'overall_score_display'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'overall_score']
    
    def get_candidate_name(self, obj):
        """Nom complet du candidat"""
        candidate = obj.candidate
        if candidate.first_name and candidate.last_name:
            return f"{candidate.first_name} {candidate.last_name}"
        return candidate.username
    
    def get_overall_score_display(self, obj):
        """Score global formaté"""
        if obj.overall_score:
            return f"{obj.overall_score:.1f}/100"
        return "Non calculé"


class AiEvaluationSerializer(serializers.ModelSerializer):
    """Serializer pour les évaluations IA des réponses vidéo"""
    candidate_name = serializers.SerializerMethodField()
    question_text = serializers.CharField(source='interview_answer.question.text', read_only=True)
    question_order = serializers.IntegerField(source='interview_answer.question.order', read_only=True)
    campaign_title = serializers.CharField(source='interview_answer.question.campaign.title', read_only=True)
    video_url = serializers.CharField(source='interview_answer.cloudinary_secure_url', read_only=True)
    
    # Scores formatés et grades
    communication_grade = serializers.SerializerMethodField()
    relevance_grade = serializers.SerializerMethodField()
    confidence_grade = serializers.SerializerMethodField()
    overall_grade = serializers.SerializerMethodField()
    
    # Scores en pourcentage
    communication_percentage = serializers.SerializerMethodField()
    relevance_percentage = serializers.SerializerMethodField()
    confidence_percentage = serializers.SerializerMethodField()
    overall_percentage = serializers.SerializerMethodField()
    
    # Statut formaté
    status_display = serializers.SerializerMethodField()
    processing_time_display = serializers.SerializerMethodField()
    
    class Meta:
        model = AiEvaluation
        fields = [
            'id', 'interview_answer', 'transcription', 'transcription_language',
            'transcription_confidence', 'communication_score', 'relevance_score',
            'confidence_score', 'overall_ai_score', 'ai_feedback', 'strengths',
            'weaknesses', 'ai_provider', 'processing_time', 'status',
            'error_message', 'created_at', 'updated_at', 'completed_at',
            # Champs calculés pour l'affichage
            'candidate_name', 'question_text', 'question_order', 'campaign_title',
            'video_url', 'communication_grade', 'relevance_grade', 'confidence_grade',
            'overall_grade', 'communication_percentage', 'relevance_percentage',
            'confidence_percentage', 'overall_percentage', 'status_display',
            'processing_time_display'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'completed_at', 'processing_time',
            'candidate_name', 'question_text', 'question_order', 'campaign_title',
            'video_url', 'overall_ai_score'
        ]
    
    def get_candidate_name(self, obj):
        """Nom complet du candidat"""
        candidate = obj.candidate
        if candidate.first_name and candidate.last_name:
            return f"{candidate.first_name} {candidate.last_name}"
        return candidate.username
    
    def get_communication_grade(self, obj):
        """Grade communication (A, B, C, D, F)"""
        return obj.get_score_grade(obj.communication_score)
    
    def get_relevance_grade(self, obj):
        """Grade pertinence (A, B, C, D, F)"""
        return obj.get_score_grade(obj.relevance_score)
    
    def get_confidence_grade(self, obj):
        """Grade confiance (A, B, C, D, F)"""
        return obj.get_score_grade(obj.confidence_score)
    
    def get_overall_grade(self, obj):
        """Grade global (A, B, C, D, F)"""
        return obj.get_overall_grade()
    
    def get_communication_percentage(self, obj):
        """Score communication en pourcentage"""
        if obj.communication_score is not None:
            return f"{(obj.communication_score * 10):.0f}%"
        return "N/A"
    
    def get_relevance_percentage(self, obj):
        """Score pertinence en pourcentage"""
        if obj.relevance_score is not None:
            return f"{(obj.relevance_score * 10):.0f}%"
        return "N/A"
    
    def get_confidence_percentage(self, obj):
        """Score confiance en pourcentage"""
        if obj.confidence_score is not None:
            return f"{(obj.confidence_score * 10):.0f}%"
        return "N/A"
    
    def get_overall_percentage(self, obj):
        """Score global en pourcentage"""
        score = obj.overall_ai_score or obj.calculate_overall_score()
        if score is not None:
            return f"{(score * 10):.0f}%"
        return "N/A"
    
    def get_status_display(self, obj):
        """Statut formaté en français"""
        status_map = {
            'pending': 'En attente',
            'processing': 'En cours',
            'completed': 'Terminée',
            'failed': 'Échec'
        }
        return status_map.get(obj.status, obj.status)
    
    def get_processing_time_display(self, obj):
        """Temps de traitement formaté"""
        if obj.processing_time:
            if obj.processing_time < 60:
                return f"{obj.processing_time:.1f}s"
            else:
                minutes = int(obj.processing_time // 60)
                seconds = int(obj.processing_time % 60)
                return f"{minutes}m {seconds}s"
        return "N/A"


class AiEvaluationCreateSerializer(serializers.Serializer):
    """Serializer pour déclencher une évaluation IA"""
    interview_answer_id = serializers.IntegerField()
    force_reevaluation = serializers.BooleanField(default=False)
    
    def validate_interview_answer_id(self, value):
        """Validation de l'ID de la réponse d'entretien"""
        try:
            interview_answer = InterviewAnswer.objects.get(id=value)
            if not (interview_answer.cloudinary_secure_url or interview_answer.cloudinary_url):
                raise serializers.ValidationError(
                    "Cette réponse n'a pas de vidéo Cloudinary associée"
                )
            return value
        except InterviewAnswer.DoesNotExist:
            raise serializers.ValidationError("Réponse d'entretien introuvable")


class AiEvaluationBulkSerializer(serializers.Serializer):
    """Serializer pour évaluation IA en lot"""
    campaign_id = serializers.IntegerField()
    candidate_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="IDs des candidats à évaluer (tous si vide)"
    )
    force_reevaluation = serializers.BooleanField(default=False)
    
    def validate_campaign_id(self, value):
        """Validation de l'ID de la campagne"""
        try:
            InterviewCampaign.objects.get(id=value)
            return value
        except InterviewCampaign.DoesNotExist:
            raise serializers.ValidationError("Campagne d'entretien introuvable")


