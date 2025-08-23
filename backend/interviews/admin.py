from django.contrib import admin
from .models import JobOffer, InterviewCampaign, InterviewQuestion, CampaignLink

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
