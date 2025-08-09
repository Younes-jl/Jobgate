# backend/JobsInterview/admin.py (Version Corrigée)

from django.contrib import admin
from .models import JobOffer, InterviewCampaign, Question

@admin.register(JobOffer)
class JobOfferAdmin(admin.ModelAdmin):
    list_display = ('title', 'location', 'created_by', 'created_at')
    list_filter = ('created_at', 'location')
    search_fields = ('title', 'description')
    
    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

class QuestionInline(admin.TabularInline):
    model = Question
    extra = 1

@admin.register(InterviewCampaign)
class InterviewCampaignAdmin(admin.ModelAdmin):
    list_display = ('title', 'job_offer', 'submission_deadline')
    search_fields = ('title', 'job_offer__title')
    inlines = [QuestionInline] 

