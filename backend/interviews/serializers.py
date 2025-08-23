from rest_framework import serializers
from .models import JobOffer, InterviewCampaign, InterviewQuestion, JobApplication, CampaignLink
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
        fields = ['id', 'text', 'time_limit', 'order', 'created_at']
        read_only_fields = ['id', 'created_at']

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
    """Serializer pour les candidatures simplifiées"""
    candidate_name = serializers.SerializerMethodField()
    job_title = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    candidate = UserSerializer(read_only=True)  # Utiliser UserSerializer pour inclure plus de détails
    
    class Meta:
        model = JobApplication
        fields = ['id', 'job_offer', 'candidate', 'status', 
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
