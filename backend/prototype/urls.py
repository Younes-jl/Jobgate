
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
# On importe notre vue personnalisée depuis l'app 'users'
from users.serializers import MyTokenObtainPairView
from users.views import UserViewSet, register_user
from interviews.views import JobOfferViewSet

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
    
    # Inclure les URLs de l'application interviews
    path('api/interviews/', include('interviews.urls')),
    
    # Inclure toutes les URLs générées par le routeur
    path('api/', include(router.urls)),
]
