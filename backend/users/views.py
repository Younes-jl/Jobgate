from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from django.contrib.auth import get_user_model
from .serializers import UserSerializer

User = get_user_model()

class IsRecruteurPermission(permissions.BasePermission):
    """
    Permission personnalisée pour vérifier si l'utilisateur est un recruteur.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == User.Role.RECRUTEUR


class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint pour la gestion des utilisateurs.
    
    Seuls les recruteurs peuvent créer, modifier et lister tous les utilisateurs.
    Les candidats peuvent uniquement voir et modifier leur propre profil.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def get_permissions(self):
        """
        Définit les permissions en fonction de l'action demandée:
        - list, create: uniquement les recruteurs
        - retrieve, update, partial_update: l'utilisateur lui-même ou un recruteur
        - destroy: uniquement les recruteurs
        """
        if self.action == 'list' or self.action == 'create':
            permission_classes = [IsRecruteurPermission]
        elif self.action in ['retrieve', 'update', 'partial_update']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action == 'destroy':
            permission_classes = [IsRecruteurPermission]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """
        Les recruteurs peuvent voir tous les utilisateurs.
        Les candidats ne peuvent voir que leur propre profil.
        """
        user = self.request.user
        if user.role == User.Role.RECRUTEUR:
            return User.objects.all()
        return User.objects.filter(id=user.id)
    
    def check_object_permissions(self, request, obj):
        """
        Vérifie que l'utilisateur a les permissions pour accéder à cet objet.
        Un candidat ne peut accéder qu'à son propre profil.
        """
        super().check_object_permissions(request, obj)
        if request.user.role == User.Role.CANDIDAT and obj.id != request.user.id:
            self.permission_denied(request, message="Vous n'avez pas la permission d'accéder à ce profil.")
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Endpoint pour récupérer le profil de l'utilisateur connecté.
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get', 'put'], url_path='profile')
    def profile(self, request):
        """
        Endpoint pour récupérer et mettre à jour le profil complet de l'utilisateur connecté.
        """
        if request.method == 'GET':
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)
        
        elif request.method == 'PUT':
            serializer = self.get_serializer(request.user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], permission_classes=[IsRecruteurPermission])
    def recruteurs(self, request):
        """
        Endpoint pour récupérer tous les recruteurs.
        """
        recruteurs = User.objects.filter(role=User.Role.RECRUTEUR)
        serializer = self.get_serializer(recruteurs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsRecruteurPermission])
    def candidats(self, request):
        """
        Endpoint pour récupérer tous les candidats.
        """
        candidats = User.objects.filter(role=User.Role.CANDIDAT)
        serializer = self.get_serializer(candidats, many=True)
        return Response(serializer.data)


@api_view(['POST'])
def register_user(request):
    """
    Endpoint pour l'enregistrement d'un nouvel utilisateur (candidat).
    Par défaut, le rôle est CANDIDAT.
    """
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(role=User.Role.CANDIDAT)  # Toujours créer avec le rôle candidat par défaut
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
