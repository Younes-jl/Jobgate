# backend/users/serializers.py
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        # On récupère le jeton par défaut
        token = super().get_token(user)

        # On ajoute n os champs personnalisés (claims) au jeton
        token['username'] = user.username
        token['role'] = user.role  # <-- C'EST L'AJOUT LE PLUS IMPORTANT

        return token

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer