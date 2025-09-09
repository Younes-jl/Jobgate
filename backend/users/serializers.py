# backend/users/serializers.py
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        # On récupère le jeton par défaut
        token = super().get_token(user)

        # On ajoute nos champs personnalisés (claims) au jeton
        token['username'] = user.username
        token['role'] = user.role
        token['is_recruteur'] = user.role == User.Role.RECRUTEUR
        token['is_candidat'] = user.role == User.Role.CANDIDAT

        return token

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class UserSerializer(serializers.ModelSerializer):
    """Serializer pour les opérations CRUD sur les utilisateurs."""
    password = serializers.CharField(write_only=True, required=False)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    experience_years_display = serializers.CharField(source='get_experience_years_display', read_only=True)
    education_level_display = serializers.CharField(source='get_education_level_display', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'password', 'role', 'role_display', 'is_active',
            # Informations personnelles étendues
            'phone', 'date_of_birth',
            # Adresse
            'address', 'city', 'postal_code', 'country',
            # Profils professionnels
            'linkedin_profile', 'github_profile', 'portfolio_url',
            # Expérience professionnelle
            'experience_years', 'experience_years_display',
            'current_position', 'education_level', 'education_level_display',
            'skills', 'bio',
            # Métadonnées
            'profile_updated_at'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        # Mettre à jour les autres champs
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance