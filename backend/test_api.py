#!/usr/bin/env python
"""
Script pour tester l'API utilisateur via requests.
"""
import os
import django
import requests
import json

# Configurer les paramètres Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prototype.settings')
django.setup()

# URL de base de l'API
API_BASE = 'http://localhost:8000/api'

def get_token(username, password):
    """Obtient un token JWT pour l'utilisateur spécifié."""
    print(f"\n=== Obtention du token pour {username} ===")
    
    response = requests.post(
        f"{API_BASE}/token/",
        json={"username": username, "password": password}
    )
    
    if response.status_code == 200:
        data = response.json()
        print("Token obtenu avec succès!")
        return data.get('access')
    else:
        print(f"Erreur {response.status_code}: {response.text}")
        return None

def test_users_api(token):
    """Teste l'API des utilisateurs avec le token fourni."""
    print("\n=== Test de l'API utilisateurs ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Liste des utilisateurs
    print("\n-- Liste des utilisateurs --")
    response = requests.get(f"{API_BASE}/users/", headers=headers)
    if response.status_code == 200:
        users = response.json()
        print(f"Nombre d'utilisateurs: {len(users)}")
        for user in users:
            print(f"- {user['username']} (ID: {user['id']}, Rôle: {user['role']})")
    else:
        print(f"Erreur {response.status_code}: {response.text}")
    
    # Profil de l'utilisateur connecté
    print("\n-- Profil de l'utilisateur connecté --")
    response = requests.get(f"{API_BASE}/users/me/", headers=headers)
    if response.status_code == 200:
        user = response.json()
        print(f"Utilisateur connecté: {user['username']} (Rôle: {user['role']})")
    else:
        print(f"Erreur {response.status_code}: {response.text}")
    
    # Liste des recruteurs
    print("\n-- Liste des recruteurs --")
    response = requests.get(f"{API_BASE}/users/recruteurs/", headers=headers)
    if response.status_code == 200:
        recruteurs = response.json()
        print(f"Nombre de recruteurs: {len(recruteurs)}")
        for user in recruteurs:
            print(f"- {user['username']} (ID: {user['id']})")
    else:
        print(f"Erreur {response.status_code}: {response.text}")
    
    # Liste des candidats
    print("\n-- Liste des candidats --")
    response = requests.get(f"{API_BASE}/users/candidats/", headers=headers)
    if response.status_code == 200:
        candidats = response.json()
        print(f"Nombre de candidats: {len(candidats)}")
        for user in candidats:
            print(f"- {user['username']} (ID: {user['id']})")
    else:
        print(f"Erreur {response.status_code}: {response.text}")

def test_register_api():
    """Teste l'API d'enregistrement des utilisateurs."""
    print("\n=== Test de l'API d'enregistrement ===")
    
    username = f"testcandidat_{os.urandom(4).hex()}"
    password = "password123"
    
    print(f"Enregistrement d'un nouveau candidat: {username}")
    response = requests.post(
        f"{API_BASE}/register/",
        json={
            "username": username,
            "email": f"{username}@example.com",
            "password": password,
            "first_name": "Test",
            "last_name": "Candidat"
        }
    )
    
    if response.status_code == 201:
        user = response.json()
        print(f"Utilisateur créé: {user['username']} (ID: {user['id']}, Rôle: {user['role']})")
        
        # Essayer de se connecter avec le nouvel utilisateur
        token = get_token(username, password)
        if token:
            print("Connexion réussie avec le nouvel utilisateur!")
            test_users_api(token)
    else:
        print(f"Erreur {response.status_code}: {response.text}")

if __name__ == "__main__":
    # Test avec un recruteur (admin)
    admin_token = get_token("admin", "adminpassword")
    if admin_token:
        test_users_api(admin_token)
    
    # Test avec un candidat
    candidat_token = get_token("testuser", "password123")
    if candidat_token:
        test_users_api(candidat_token)
    
    # Test de l'enregistrement d'un nouvel utilisateur
    test_register_api()
