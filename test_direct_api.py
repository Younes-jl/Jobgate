#!/usr/bin/env python
"""
Test direct de l'API sans dépendances externes
"""
import urllib.request
import json
import sys

def test_direct_api():
    """Test direct de l'API de génération de questions"""
    
    url = "http://localhost:8000/api/interviews/generate-questions/"
    
    data = {
        "job_title": "Développeur Python",
        "job_description": "Développement d'applications web avec Django",
        "requirements": ["Python", "Django"],
        "number_of_questions": 2,
        "difficulty_level": "medium"
    }
    
    print("🧪 TEST DIRECT API - GÉNÉRATION QUESTIONS")
    print("=" * 50)
    
    try:
        # Test de connexion basique
        print("📡 Test connexion backend...")
        req = urllib.request.Request("http://localhost:8000/api/")
        with urllib.request.urlopen(req, timeout=5) as response:
            print(f"✅ Backend accessible: {response.status}")
        
        # Test endpoint génération
        print("📡 Test génération questions...")
        json_data = json.dumps(data).encode('utf-8')
        
        req = urllib.request.Request(
            url,
            data=json_data,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            print(f"✅ Status: {response.status}")
            
            if response.status == 200:
                questions = result.get('questions', [])
                print(f"✅ {len(questions)} questions générées!")
                
                for i, q in enumerate(questions, 1):
                    print(f"Q{i}: {q.get('question', 'N/A')[:60]}...")
                
                print("✅ API FONCTIONNELLE!")
                return True
            else:
                print(f"❌ Erreur: {response.status}")
                print(f"Response: {result}")
                return False
                
    except urllib.error.HTTPError as e:
        print(f"❌ Erreur HTTP: {e.code}")
        try:
            error_data = json.loads(e.read().decode('utf-8'))
            print(f"Détails: {error_data}")
        except:
            print(f"Réponse brute: {e.read()}")
        return False
        
    except urllib.error.URLError as e:
        print(f"❌ Connexion impossible: {e}")
        print("💡 Vérifiez que les conteneurs sont démarrés")
        return False
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

if __name__ == "__main__":
    success = test_direct_api()
    sys.exit(0 if success else 1)
