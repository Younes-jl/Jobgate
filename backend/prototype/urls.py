
from django.contrib import admin
from django.urls import path,include
from rest_framework_simplejwt.views import TokenRefreshView
# On importe notre vue personnalisée depuis l'app 'users'
from users.serializers import MyTokenObtainPairView


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    
    # L'URL pour rafraîchir un jeton qui a expiré
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/jobs/', include('JobsInterview.urls')),
]
