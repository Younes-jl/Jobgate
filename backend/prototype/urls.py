
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
# On importe notre vue personnalisée depuis l'app 'users'
from users.serializers import MyTokenObtainPairView
from users.views import UserViewSet, register_user
from interviews.views import JobOfferViewSet, job_applications_api

# Création du routeur pour les vues de type ViewSet
router = DefaultRouter()
router.register(r'users', UserViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # URLs d'authentification
    path('api/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # URL d'enregistrement
    path('api/register/', register_user, name='register'),
    
    # Endpoint pour le dashboard des offres d'emploi
    path('api/jobs/dashboard/', JobOfferViewSet.as_view({'get': 'dashboard'}), name='job-dashboard'),
    
    # Endpoint pour la création d'offres d'emploi
    path('api/jobs/offers/', JobOfferViewSet.as_view({'post': 'create'}), name='job-offers-create'),
    
    # Endpoint pour récupérer toutes les offres (pour les candidats)
    path('api/jobs/all-offers/', JobOfferViewSet.as_view({'get': 'all_offers'}), name='job-all-offers'),
    
    # Endpoint pour récupérer une offre par son ID (pour les détails)
    path('api/jobs/offers/<int:pk>/', JobOfferViewSet.as_view({'get': 'retrieve'}), name='job-offer-detail'),
    
    # Endpoint direct pour les candidatures (pour corriger l'erreur 404)
    path('api/interviews/applications/job/', job_applications_api, name='job-applications-api'),
    
    # Inclure les URLs de l'application interviews
    path('api/interviews/', include('interviews.urls')),
    
    # Inclure toutes les URLs générées par le routeur
    path('api/', include(router.urls)),
]

# Servir les fichiers média en mode développement local uniquement
if settings.DEBUG and not getattr(settings, 'USE_FIREBASE_STORAGE', False):
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
