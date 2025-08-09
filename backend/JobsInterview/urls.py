from django.urls import path
from .views import JobOfferListCreateView,RecruiterDashboardView 

urlpatterns = [
    # L'URL sera /api/jobs/
    path('', JobOfferListCreateView.as_view(), name='joboffer-list-create'),
    # NOUVELLE URL pour le dashboard du recruteur
    path('dashboard/', RecruiterDashboardView.as_view(), name='recruiter-dashboard'),
]