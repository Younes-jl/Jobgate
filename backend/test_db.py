#!/usr/bin/env python
"""
Script simple pour tester la connexion à la base de données et l'authentification.
Exécutez ce script avec Docker Compose :
docker-compose exec backend python test_db.py
"""

import os
import django
import sys

# Configurer les paramètres Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prototype.settings')
django.setup()

# Importer les modèles après la configuration
from django.db import connection
from django.contrib.auth import get_user_model
from django.db.utils import OperationalError

User = get_user_model()

def test_db_connection():
    """Teste la connexion à la base de données."""
    print("Test de la connexion à la base de données...")
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()[0]
            if result == 1:
                print("✅ Connexion à la base de données établie avec succès!")
                return True
            else:
                print("❌ Échec de la connexion à la base de données.")
                return False
    except OperationalError as e:
        print(f"❌ Erreur de connexion à la base de données: {e}")
        return False

def list_users():
    """Liste tous les utilisateurs dans la base de données."""
    if not test_db_connection():
        return
        
    print("\nListe des utilisateurs dans la base de données:")
    users = User.objects.all()
    
    if not users:
        print("Aucun utilisateur trouvé. Création d'un superutilisateur de test...")
        create_test_superuser()
        users = User.objects.all()
    
    for user in users:
        print(f"- {user.username} (ID: {user.id}, Rôle: {user.role})")

def create_test_superuser():
    """Crée un superutilisateur de test si aucun n'existe."""
    try:
        User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="adminpassword",
            role=User.Role.ADMIN
        )
        print("✅ Superutilisateur 'admin' créé avec succès!")
    except Exception as e:
        print(f"❌ Erreur lors de la création du superutilisateur: {e}")

if __name__ == "__main__":
    list_users()
