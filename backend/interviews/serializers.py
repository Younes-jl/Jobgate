from rest_framework import serializers
from .models import (
    JobOffer, InterviewCampaign, InterviewQuestion, CampaignLink, 
    InterviewAnswer, JobApplication, RecruiterEvaluation, GlobalInterviewEvaluation
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
    
    class Meta:
        model = JobApplication
        fields = ['id', 'job_offer', 'candidate', 'status', 'lettre_motivation', 'filiere',
                  'created_at', 'updated_at', 'candidate_name', 'job_title', 'status_display']
        read_only_fields = ['id', 'created_at', 'updated_at', 'candidate_name', 'job_title', 'status_display']
    
    def get_candidate_name(self, obj):
        return f"{obj.candidate.first_name} {obj.candidate.last_name}" if obj.candidate.first_name else obj.candidate.username
    
    def get_job_title(self, obj):
        return obj.job_offer.title
    
    def get_status_display(self, obj):
        return dict(JobApplication.STATUS_CHOICES)[obj.status]
    
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
    """Serializer pour l'évaluation globale d'entretien"""
    candidate_name = serializers.CharField(source='candidate.get_full_name', read_only=True)
    recruiter_name = serializers.CharField(source='recruiter.get_full_name', read_only=True)
    job_title = serializers.CharField(source='job_application.job_offer.title', read_only=True)
    overall_score_display = serializers.SerializerMethodField()
    recommendation_display = serializers.CharField(source='get_final_recommendation_display', read_only=True)
    
    class Meta:
        model = GlobalInterviewEvaluation
        fields = [
            'id', 'job_application', 'candidate', 'recruiter',
            'candidate_name', 'recruiter_name', 'job_title',
            'technical_skills', 'communication_skills', 'problem_solving',
            'cultural_fit', 'motivation', 'final_recommendation', 'recommendation_display',
            'strengths', 'weaknesses', 'general_comments', 'next_steps',
            'overall_score', 'overall_score_display',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'overall_score', 'created_at', 'updated_at']
    
    def get_overall_score_display(self, obj):
        """Score global formaté"""
        if obj.overall_score is not None:
            return f"{obj.overall_score:.1f}/100"
        return "Non calculé"
    
    def validate(self, attrs):
        """Validation des scores (0-100)"""
        score_fields = ['technical_skills', 'communication_skills', 'problem_solving', 'cultural_fit', 'motivation']
        
        for field in score_fields:
            score = attrs.get(field)
            if score is not None and (score < 0 or score > 100):
                raise serializers.ValidationError({
                    field: "Le score doit être compris entre 0 et 100"
                })
        
        return attrs


