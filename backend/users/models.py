from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    """
    Notre modèle utilisateur personnalisé.
    Hérite de AbstractUser pour garder tous les champs de base de Django.
    
    Deux rôles principaux sont définis :
    - RECRUTEUR : Utilisateur avec des droits d'administration
    - CANDIDAT : Utilisateur standard
    """

    # On définit les choix possibles pour le rôle de manière propre et lisible.
    class Role(models.TextChoices):
        RECRUTEUR = "RECRUTEUR", "Recruteur"
        CANDIDAT = "CANDIDAT", "Candidat"

    # C'est notre champ personnalisé que nous ajoutons au modèle de base.
    role = models.CharField(max_length=50, choices=Role.choices, default=Role.CANDIDAT)

    def __str__(self):
        return self.username
        
    def is_recruteur(self):
        """Vérifie si l'utilisateur est un recruteur."""
        return self.role == self.Role.RECRUTEUR
        
    def is_candidat(self):
        """Vérifie si l'utilisateur est un candidat."""
        return self.role == self.Role.CANDIDAT