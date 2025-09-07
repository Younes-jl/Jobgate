#!/usr/bin/env python
"""
Test simple pour vérifier l'API Gemini
"""
import requests
import json
import sys

def test_api():
    """Test simple de l'API"""
    print("🧪 TEST API GEMINI - VERSION SIMPLE")
    print("=" * 50)
    
    url = "http://localhost:8000/api/interviews/generate-questions/"
    
    data = {
        "job_title": "Data Engineer",
        "job_description": "Poste de Data Engineer avec Python et Spark",
        "requirements": ["Python", "Spark"],
        "number_of_questions": 2
    }
    
    try:
        print("📡 Test de connexion...")
        response = requests.get("http://localhost:8000/api/", timeout=5)
        print(f"✅ Backend accessible: {response.status_code}")
        
        print("📡 Envoi requête génération...")
        response = requests.post(url, json=data, timeout=30)
        
        print(f"📊 Status: {response.status_code}")
        print(f"📄 Response: {response.text[:200]}...")
        
        if response.status_code == 200:
            result = response.json()
            questions = result.get('questions', [])
            print(f"✅ {len(questions)} questions générées!")
            
            for i, q in enumerate(questions, 1):
                print(f"Q{i}: {q.get('question', 'N/A')[:50]}...")
        else:
            print(f"❌ Erreur: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connexion impossible")
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    test_api()
