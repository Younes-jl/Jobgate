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

    # Champs de base
    role = models.CharField(max_length=50, choices=Role.choices, default=Role.CANDIDAT)
    
    # Informations personnelles étendues
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Téléphone")
    date_of_birth = models.DateField(blank=True, null=True, verbose_name="Date de naissance")
    
    # Adresse
    address = models.CharField(max_length=255, blank=True, null=True, verbose_name="Adresse")
    city = models.CharField(max_length=100, blank=True, null=True, verbose_name="Ville")
    postal_code = models.CharField(max_length=10, blank=True, null=True, verbose_name="Code postal")
    country = models.CharField(max_length=100, default="Maroc", verbose_name="Pays")
    
    # Profils professionnels
    linkedin_profile = models.URLField(blank=True, null=True, verbose_name="Profil LinkedIn")
    github_profile = models.URLField(blank=True, null=True, verbose_name="Profil GitHub")
    portfolio_url = models.URLField(blank=True, null=True, verbose_name="Portfolio/Site web")
    
    # Expérience professionnelle
    experience_years = models.CharField(
        max_length=20, 
        blank=True, 
        null=True,
        choices=[
            ('0-1', '0-1 an'),
            ('1-3', '1-3 ans'),
            ('3-5', '3-5 ans'),
            ('5-10', '5-10 ans'),
            ('10+', 'Plus de 10 ans'),
        ],
        verbose_name="Années d'expérience"
    )
    current_position = models.CharField(max_length=200, blank=True, null=True, verbose_name="Poste actuel")
    education_level = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        choices=[
            ('BAC', 'Baccalauréat'),
            ('BAC+2', 'BAC+2'),
            ('BAC+3', 'BAC+3 (Licence)'),
            ('BAC+5', 'BAC+5 (Master)'),
            ('BAC+8', 'BAC+8 (Doctorat)'),
        ],
        verbose_name="Niveau d'éducation"
    )
    skills = models.TextField(blank=True, null=True, verbose_name="Compétences")
    bio = models.TextField(blank=True, null=True, verbose_name="Présentation")
    
    # Métadonnées
    profile_updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière mise à jour du profil")

    def __str__(self):
        return self.username
        
    def is_recruteur(self):
        """Vérifie si l'utilisateur est un recruteur."""
        return self.role == self.Role.RECRUTEUR
        
    def is_candidat(self):
        """Vérifie si l'utilisateur est un candidat."""
        return self.role == self.Role.CANDIDAT