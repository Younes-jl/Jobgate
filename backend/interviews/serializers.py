from rest_framework import serializers
from .models import JobOffer, InterviewCampaign, InterviewQuestion

class JobOfferSerializer(serializers.ModelSerializer):
    """Serializer pour les offres d'emploi"""
    
    class Meta:
        model = JobOffer
        fields = ['id', 'title', 'description', 'recruiter', 'location', 'created_at']
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
