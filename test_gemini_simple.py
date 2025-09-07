#!/usr/bin/env python
"""
Test simple pour vérifier si Gemini génère des questions dynamiques
"""
import requests
import json

def test_question_generation():
    """Test direct via l'API REST"""
    
    url = "http://localhost:8000/api/interviews/generate-questions/"
    
    # Données de test pour un Data Engineer
    data = {
        "offer_title": "Data Engineer Senior",
        "offer_description": "Nous recherchons un Data Engineer pour construire des pipelines ETL avec Apache Spark et AWS",
        "requirements": "Apache Spark, Python, AWS, ETL, Big Data",
        "number_of_questions": 3,
        "difficulty": "medium"
    }
    
    print("🧪 TEST GÉNÉRATION DYNAMIQUE DE QUESTIONS")
    print("=" * 50)
    print(f"Titre: {data['offer_title']}")
    print(f"Description: {data['offer_description']}")
    print(f"Compétences: {data['requirements']}")
    print()
    
    try:
        print("📡 Envoi de la requête à l'API...")
        response = requests.post(url, json=data, timeout=30)
        
        if response.status_code == 200:
            questions = response.json()
            print(f"✅ {len(questions)} questions générées avec succès!")
            print()
            
            for i, question in enumerate(questions, 1):
                print(f"Question {i}:")
                print(f"  📝 {question['question']}")
                print(f"  🏷️  Type: {question['type']}")
                print(f"  ⏱️  Durée: {question['expected_duration']}s")
                print(f"  🎯 Compétences: {', '.join(question['skills_assessed'])}")
                print()
            
            # Vérification si les questions sont spécifiques au Data Engineering
            data_keywords = ['spark', 'etl', 'pipeline', 'data', 'big data', 'aws']
            found_keywords = []
            
            for question in questions:
                q_text = question['question'].lower()
                for keyword in data_keywords:
                    if keyword in q_text:
                        found_keywords.append(keyword)
            
            if found_keywords:
                print(f"🎯 Questions spécifiques détectées (mots-clés: {set(found_keywords)})")
                print("✅ GÉNÉRATION DYNAMIQUE CONFIRMÉE!")
            else:
                print("⚠️ Questions génériques détectées - possiblement du fallback")
                
        else:
            print(f"❌ Erreur API: {response.status_code}")
            print(f"Réponse: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Impossible de se connecter au backend. Vérifiez que Docker est démarré.")
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    test_question_generation()
