#!/usr/bin/env python
"""
Script pour mettre à jour le mot de passe d'un utilisateur.
"""
import os
import django
import sys

# Configurer les paramètres Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prototype.settings')
django.setup()

# Importer les modèles après la configuration
from django.contrib.auth import get_user_model

User = get_user_model()

def reset_password(username, new_password):
    """Réinitialise le mot de passe d'un utilisateur."""
    try:
        user = User.objects.get(username=username)
        user.set_password(new_password)
        user.save()
        print(f"✅ Mot de passe réinitialisé pour l'utilisateur {username}")
        return True
    except User.DoesNotExist:
        print(f"❌ Utilisateur {username} non trouvé")
        return False
    except Exception as e:
        print(f"❌ Erreur lors de la réinitialisation du mot de passe: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python reset_password.py <username> <new_password>")
        sys.exit(1)
    
    username = sys.argv[1]
    new_password = sys.argv[2]
    
    reset_password(username, new_password)
