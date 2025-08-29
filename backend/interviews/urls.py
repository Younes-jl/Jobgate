from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    JobOfferViewSet, InterviewCampaignViewSet, InterviewQuestionViewSet, 
    JobApplicationViewSet, CampaignLinkViewSet, InterviewAnswerViewSet,
    AIQuestionGeneratorView, AIQuestionAnalysisView, AIQuestionTemplatesView
)

router = DefaultRouter()
router.register(r'offers', JobOfferViewSet, basename='job-offers')
router.register(r'campaigns', InterviewCampaignViewSet, basename='interview-campaigns')
router.register(r'questions', InterviewQuestionViewSet, basename='interview-questions')
router.register(r'applications', JobApplicationViewSet, basename='job-applications')
router.register(r'campaign-links', CampaignLinkViewSet, basename='campaign-links')
router.register(r'answers', InterviewAnswerViewSet, basename='interview-answers')

urlpatterns = [
    path('', include(router.urls)),
    # Ajouter l'URL pour le dashboard des offres
    path('jobs/dashboard/', JobOfferViewSet.as_view({'get': 'dashboard'}), name='job-dashboard'),
    # Ajouter l'URL pour la création d'offres
    path('jobs/offers/', JobOfferViewSet.as_view({'post': 'create'}), name='job-offers-create'),
    # URLs pour les candidatures
    path('applications/my/', JobApplicationViewSet.as_view({'get': 'my_applications'}), name='my-applications'),
    path('applications/job/', JobApplicationViewSet.as_view({'get': 'job_applications'}), name='job-applications'),
    # URLs publiques pour les liens d'entretien (accès sans authentification)
    path('offers/<int:pk>/public/', JobOfferViewSet.as_view({'get': 'public_detail'}), name='job-offer-public-detail'),
    path('campaigns/<int:pk>/public/', InterviewCampaignViewSet.as_view({'get': 'public_detail'}), name='campaign-public-detail'),
    
    # ========== URLs IA pour Génération de Questions ==========
    path('ai/generate-questions/', AIQuestionGeneratorView.as_view(), name='ai-generate-questions'),
    path('ai/analyze-question/', AIQuestionAnalysisView.as_view(), name='ai-analyze-question'),
    path('ai/question-templates/', AIQuestionTemplatesView.as_view(), name='ai-question-templates'),
]
