from django.db import models
from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    """
    Notre modèle utilisateur personnalisé.
    Hérite de AbstractUser pour garder tous les champs de base de Django.
    """

    # On définit les choix possibles pour le rôle de manière propre et lisible.
    class Role(models.TextChoices):
        RECRUITER = 'RECRUITER', 'Recruteur'
        CANDIDATE = 'CANDIDATE', 'Candidat'

    # C'est notre champ personnalisé que nous ajoutons au modèle de base.
    role = models.CharField(max_length=50, choices=Role.choices)

    def __str__(self):
        return self.username