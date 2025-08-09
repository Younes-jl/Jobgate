# backend/JobsInterview/serializers.py
from rest_framework import serializers
from .models import JobOffer, InterviewCampaign, Question

class QuestionSerializer(serializers.ModelSerializer):
    """
    Serializer pour le modèle Question.
    Sera utilisé en lecture seule et pour la création imbriquée.
    """
    class Meta:
        model = Question
        # On n'a pas besoin de 'campaign' car il sera défini par le parent.
        fields = ['id', 'text', 'preparation_time', 'response_duration_limit', 'order']


class InterviewCampaignSerializer(serializers.ModelSerializer):
    """
    Serializer pour le modèle InterviewCampaign.
    Il contient une liste de questions imbriquées.
    """
    # On déclare ici le champ imbriqué. many=True car c'est une liste.
    questions = QuestionSerializer(many=True)

    class Meta:
        model = InterviewCampaign
        # On n'a pas besoin de 'job_offer' car il sera défini par le parent.
        fields = ['id', 'title', 'submission_deadline', 'questions']


class JobOfferSerializer(serializers.ModelSerializer):
    """
    Serializer principal pour le modèle JobOffer.
    Il contient la campagne et ses questions imbriquées.
    """
    # On déclare ici le champ imbriqué. read_only=False pour la création.
    interview_campaign = InterviewCampaignSerializer()
    
    # Champ en lecture seule pour afficher le nom du recruteur.
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = JobOffer
        fields = [
            'id', 
            'title', 
            'description', 
            'location', 
            'created_by', # Ce champ sera rempli automatiquement
            'created_by_username',
            'interview_campaign', 
            'created_at'
        ]
        # On met 'created_by' en lecture seule car on le remplira avec l'utilisateur connecté.
        read_only_fields = ['created_by', 'created_at']

    # C'est ici que la magie de la création imbriquée opère.
    def create(self, validated_data):
        # 1. On extrait les données de la campagne imbriquée
        campaign_data = validated_data.pop('interview_campaign')
        questions_data = campaign_data.pop('questions')

        # 2. On crée l'offre d'emploi principale
        job_offer = JobOffer.objects.create(**validated_data)

        # 3. On crée la campagne d'entretien en la liant à l'offre
        campaign = InterviewCampaign.objects.create(job_offer=job_offer, **campaign_data)

        # 4. On crée chaque question en la liant à la campagne
        for question_data in questions_data:
            Question.objects.create(campaign=campaign, **question_data)

        return job_offer