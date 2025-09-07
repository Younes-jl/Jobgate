#!/usr/bin/env python
"""
Test final pour vérifier la génération de questions IA avec Gemini
"""
import requests
import json

def test_api_questions():
    """Test de génération de questions via l'API"""
    
    url = "http://localhost:8000/api/interviews/generate-questions/"
    
    # Données de test simples
    data = {
        "job_title": "Développeur Python Senior",
        "job_description": "Développement d'applications web avec Django et React",
        "requirements": ["Python", "Django", "React", "PostgreSQL"],
        "number_of_questions": 3,
        "difficulty_level": "medium"
    }
    
    print("🧪 TEST FINAL - API GÉNÉRATION QUESTIONS")
    print("=" * 50)
    print(f"Poste: {data['job_title']}")
    print(f"Technologies: {', '.join(data['requirements'])}")
    print()
    
    try:
        print("📡 Envoi requête...")
        response = requests.post(url, json=data, timeout=30)
        
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            questions = result.get('questions', [])
            
            print(f"✅ {len(questions)} questions générées!")
            print(f"🤖 Provider: {result.get('metadata', {}).get('ai_provider', 'N/A')}")
            print()
            
            for i, q in enumerate(questions, 1):
                print(f"Q{i}: {q.get('question', 'N/A')}")
                print(f"   Type: {q.get('type', 'N/A')}")
                print(f"   Durée: {q.get('expected_duration', 'N/A')}s")
                print(f"   Compétences: {', '.join(q.get('skills_assessed', []))}")
                print()
            
            # Vérifier spécificité
            tech_keywords = ['python', 'django', 'react', 'postgresql', 'web']
            found = []
            
            for q in questions:
                text = q.get('question', '').lower()
                for keyword in tech_keywords:
                    if keyword in text:
                        found.append(keyword)
            
            if found:
                print(f"🎯 Mots-clés trouvés: {set(found)}")
                print("✅ QUESTIONS SPÉCIALISÉES!")
            else:
                print("⚠️ Questions génériques")
                
        else:
            print(f"❌ Erreur: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connexion impossible")
        print("💡 Vérifiez: docker-compose ps")
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    test_api_questions()
