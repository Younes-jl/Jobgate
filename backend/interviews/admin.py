from django.contrib import admin
from .models import JobOffer, InterviewCampaign, InterviewQuestion, CampaignLink, InterviewAnswer, JobApplication, AiEvaluation

class InterviewQuestionInline(admin.TabularInline):
    model = InterviewQuestion
    extra = 1

@admin.register(JobOffer)
class JobOfferAdmin(admin.ModelAdmin):
    list_display = ('title', 'recruiter', 'location', 'created_at')
    list_filter = ('recruiter', 'created_at')
    search_fields = ('title', 'description', 'recruiter__email')

@admin.register(InterviewCampaign)
class InterviewCampaignAdmin(admin.ModelAdmin):
    list_display = ('title', 'job_offer', 'start_date', 'end_date', 'active', 'created_at')
    list_filter = ('active', 'start_date', 'end_date', 'job_offer')
    search_fields = ('title', 'description', 'job_offer__title')
    inlines = [InterviewQuestionInline]

@admin.register(InterviewQuestion)
class InterviewQuestionAdmin(admin.ModelAdmin):
    list_display = ('text', 'campaign', 'time_limit', 'order')
    list_filter = ('campaign', 'time_limit')
    search_fields = ('text', 'campaign__title')


@admin.register(CampaignLink)
class CampaignLinkAdmin(admin.ModelAdmin):
    list_display = (
        'campaign', 'candidate', 'email', 'token', 'expires_at', 'uses_count', 'max_uses', 'revoked', 'created_at'
    )
    list_filter = ('campaign', 'revoked', 'expires_at', 'created_at')
    search_fields = ('token', 'campaign__title', 'email', 'candidate__email', 'candidate__username')
    readonly_fields = ('token', 'created_at', 'used_at', 'uses_count')


@admin.register(InterviewAnswer)
class InterviewAnswerAdmin(admin.ModelAdmin):
    list_display = (
        'candidate', 'question_summary', 'campaign_title', 'duration_formatted', 
        'status', 'score', 'created_at'
    )
    list_filter = ('status', 'question__campaign', 'created_at', 'score')
    search_fields = (
        'candidate__username', 'candidate__email', 
        'question__campaign__title', 'question__text'
    )
    readonly_fields = ('created_at', 'updated_at', 'duration', 'file_size', 'video_link')
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('question', 'candidate', 'status')
        }),
        ('Fichier vidéo', {
            'fields': ('video_file', 'video_link', 'duration', 'file_size')
        }),
        ('Évaluation', {
            'fields': ('score', 'recruiter_notes')
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def question_summary(self, obj):
        """Résumé court de la question"""
        return f"Q{obj.question.order}: {obj.question.text[:50]}{'...' if len(obj.question.text) > 50 else ''}"
    question_summary.short_description = "Question"
    
    def campaign_title(self, obj):
        """Titre de la campagne"""
        return obj.question.campaign.title
    campaign_title.short_description = "Campagne"
    
    def duration_formatted(self, obj):
        """Durée formatée"""
        return obj.get_duration_formatted()
    duration_formatted.short_description = "Durée"
    
    def video_link(self, obj):
        """Lien vers la vidéo"""
        if obj.video_file:
            video_url = obj.get_video_url()
            if video_url:
                return f'<a href="{video_url}" target="_blank">Voir la vidéo</a>'
            else:
                return "URL non disponible"
        return "Pas de vidéo"
    video_link.allow_tags = True
    video_link.short_description = "Lien vidéo"


@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = (
        'candidate', 'job_offer_title', 'status', 'created_at', 'updated_at'
    )
    list_filter = ('status', 'created_at', 'updated_at', 'job_offer__recruiter')
    search_fields = (
        'candidate__username', 'candidate__email', 
        'job_offer__title', 'job_offer__recruiter__username'
    )
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('job_offer', 'candidate', 'status')
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def job_offer_title(self, obj):
        """Titre de l'offre d'emploi"""
        return obj.job_offer.title
    job_offer_title.short_description = "Offre d'emploi"
    
    # Actions personnalisées
    actions = ['mark_as_accepted', 'mark_as_rejected', 'mark_as_under_review']
    
    def mark_as_accepted(self, request, queryset):
        """Marquer les candidatures comme acceptées"""
        updated = queryset.update(status='accepted')
        self.message_user(request, f'{updated} candidature(s) marquée(s) comme acceptée(s).')
    mark_as_accepted.short_description = "Marquer comme accepté"
    
    def mark_as_rejected(self, request, queryset):
        """Marquer les candidatures comme rejetées"""
        updated = queryset.update(status='rejected')
        self.message_user(request, f'{updated} candidature(s) marquée(s) comme rejetée(s).')
    mark_as_rejected.short_description = "Marquer comme rejeté"
    
    def mark_as_under_review(self, request, queryset):
        """Marquer les candidatures comme en cours d'évaluation"""
        updated = queryset.update(status='under_review')
        self.message_user(request, f'{updated} candidature(s) marquée(s) comme en cours d\'évaluation.')
    mark_as_under_review.short_description = "Marquer comme en cours d'évaluation"


@admin.register(AiEvaluation)
class AiEvaluationAdmin(admin.ModelAdmin):
    list_display = (
        'interview_answer', 'ai_provider', 'ai_score', 'status', 
        'processing_time', 'created_at'
    )
    list_filter = ('ai_provider', 'status', 'created_at', 'ai_score')
    search_fields = (
        'interview_answer__candidate__username',
        'interview_answer__candidate__email',
        'interview_answer__question__text',
        'ai_feedback'
    )
    readonly_fields = ('created_at', 'updated_at', 'processing_time')
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('interview_answer', 'status')
        }),
        ('Analyse IA', {
            'fields': ('ai_provider', 'ai_score', 'ai_feedback', 'transcription')
        }),
        ('Compétences attendues', {
            'fields': ('expected_skills',)
        }),
        ('Performance', {
            'fields': ('processing_time', 'error_message'),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        """Optimiser les requêtes avec select_related"""
        return super().get_queryset(request).select_related(
            'interview_answer__candidate',
            'interview_answer__question__campaign'
        )
    
    def candidate_name(self, obj):
        """Nom du candidat"""
        return obj.interview_answer.candidate.username
    candidate_name.short_description = "Candidat"
    
    def question_text(self, obj):
        """Texte de la question"""
        text = obj.interview_answer.question.text
        return f"{text[:50]}{'...' if len(text) > 50 else ''}"
    question_text.short_description = "Question"
    
    def score_grade(self, obj):
        """Note sur 5 étoiles"""
        return obj.get_score_grade()
    score_grade.short_description = "Note (/5)"
    
    # Actions personnalisées
    actions = ['reprocess_evaluation', 'mark_as_completed']
    
    def reprocess_evaluation(self, request, queryset):
        """Relancer l'évaluation IA"""
        updated = queryset.update(status='pending')
        self.message_user(request, f'{updated} évaluation(s) marquée(s) pour retraitement.')
    reprocess_evaluation.short_description = "Relancer l'évaluation IA"
    
    def mark_as_completed(self, request, queryset):
        """Marquer comme terminé"""
        updated = queryset.update(status='completed')
        self.message_user(request, f'{updated} évaluation(s) marquée(s) comme terminée(s).')
    mark_as_completed.short_description = "Marquer comme terminé"
