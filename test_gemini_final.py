#!/usr/bin/env python
"""
Test final pour vérifier la configuration Gemini après hardcoding
"""
import requests
import json

def test_gemini_final():
    """Test direct de génération de questions avec Gemini"""
    
    url = "http://localhost:8000/api/interviews/generate-questions/"
    
    # Données de test pour un Data Engineer
    data = {
        "job_title": "Data Engineer Senior",
        "job_description": "Nous recherchons un Data Engineer expérimenté pour construire des pipelines ETL avec Apache Spark et AWS",
        "requirements": ["Apache Spark", "Python", "AWS", "ETL", "Big Data"],
        "number_of_questions": 3,
        "difficulty_level": "medium"
    }
    
    print("🧪 TEST FINAL - GÉNÉRATION DYNAMIQUE GEMINI")
    print("=" * 60)
    print(f"Poste: {data['job_title']}")
    print(f"Technologies: {', '.join(data['requirements'])}")
    print()
    
    try:
        print("📡 Envoi de la requête...")
        response = requests.post(url, json=data, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            questions = result.get('questions', [])
            
            print(f"✅ {len(questions)} questions générées avec succès!")
            print(f"🤖 Provider: {result.get('metadata', {}).get('ai_provider', 'unknown')}")
            print()
            
            for i, question in enumerate(questions, 1):
                print(f"Question {i}:")
                print(f"  📝 {question['question']}")
                print(f"  🏷️  Type: {question.get('type', 'N/A')}")
                print(f"  ⏱️  Durée: {question.get('expected_duration', 'N/A')}s")
                print(f"  🎯 Compétences: {', '.join(question.get('skills_assessed', []))}")
                print()
            
            # Vérification spécificité
            data_keywords = ['spark', 'etl', 'pipeline', 'data', 'aws', 'python']
            found_keywords = []
            
            for question in questions:
                q_text = question['question'].lower()
                for keyword in data_keywords:
                    if keyword in q_text:
                        found_keywords.append(keyword)
            
            if found_keywords:
                print(f"🎯 Questions spécifiques détectées!")
                print(f"   Mots-clés trouvés: {set(found_keywords)}")
                print("✅ GÉNÉRATION DYNAMIQUE CONFIRMÉE!")
            else:
                print("⚠️ Questions semblent génériques")
                
        elif response.status_code == 400:
            error_data = response.json()
            print(f"❌ Erreur de validation: {error_data.get('error', 'Unknown')}")
            if error_data.get('type') == 'validation_error':
                print("💡 Vérifiez la configuration de votre API Gemini")
        else:
            print(f"❌ Erreur API: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Détails: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"   Réponse brute: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connexion impossible au backend")
        print("💡 Vérifiez que Docker est démarré: docker-compose ps")
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    test_gemini_final()
