from django.contrib import admin
from .models import JobOffer, InterviewCampaign, InterviewQuestion, CampaignLink, InterviewAnswer, JobApplication

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
