#!/usr/bin/env python
"""
Script de test pour l'endpoint evaluate_answer
Teste l'API d'évaluation recruteur avec des données de test
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
ENDPOINT = "/api/interviews/recruiter-evaluations/evaluate_answer/"

def test_evaluate_endpoint():
    """Test de l'endpoint evaluate_answer"""
    
    # Données de test pour l'évaluation
    test_data = {
        "interview_answer": 1,  # ID de la réponse à évaluer
        "communication_score": 85.0,
        "communication_feedback": "Très bonne communication, claire et structurée",
        "confidence_score": 90.0,
        "confidence_feedback": "Candidat très confiant et assuré",
        "relevance_score": 80.0,
        "relevance_feedback": "Réponse pertinente et bien ciblée",
        "overall_score": 85.0,
        "overall_feedback": "Excellent candidat avec de bonnes compétences",
        "recommendation": "good"
    }
    
    # Headers avec token d'authentification (à remplacer par un vrai token)
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_TOKEN_HERE"  # Remplacer par un vrai token
    }
    
    try:
        print("🧪 Test de l'endpoint evaluate_answer...")
        print(f"URL: {BASE_URL}{ENDPOINT}")
        print(f"Données: {json.dumps(test_data, indent=2)}")
        
        # Faire la requête POST
        response = requests.post(
            f"{BASE_URL}{ENDPOINT}",
            json=test_data,
            headers=headers
        )
        
        print(f"\n📊 Résultat:")
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        try:
            response_data = response.json()
            print(f"Response Body: {json.dumps(response_data, indent=2)}")
        except:
            print(f"Response Text: {response.text}")
            
        if response.status_code == 200:
            print("✅ Test réussi - Évaluation mise à jour")
        elif response.status_code == 201:
            print("✅ Test réussi - Nouvelle évaluation créée")
        elif response.status_code == 400:
            print("❌ Erreur 400 - Données invalides")
        elif response.status_code == 401:
            print("❌ Erreur 401 - Non authentifié")
        elif response.status_code == 403:
            print("❌ Erreur 403 - Accès refusé")
        else:
            print(f"❌ Erreur {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Erreur de connexion - Serveur non accessible")
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")

if __name__ == "__main__":
    print("🚀 Test de l'endpoint d'évaluation recruteur")
    test_evaluate_endpoint()
