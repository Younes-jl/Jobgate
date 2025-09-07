#!/usr/bin/env python
"""
Test spécifique pour la génération de questions pour les rôles Data Engineer.
"""
print("--- Script Start ---")
import os
import sys
import django

print("--- Importing dependencies ---")

# Configuration Django
print("--- Configuring Django ---")
sys.path.append('backend')
# Force SQLite in-memory database for testing, overriding environment from docker-compose
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prototype.settings')
try:
    django.setup()
    print("--- Django setup successful ---")
except Exception as e:
    print(f"--- Django setup FAILED: {e} ---")
    sys.exit(1)

from interviews.ai_service import AIInterviewQuestionGenerator
print("--- AI Service imported ---")

def test_data_engineer_questions():
    """Test avec une offre d'emploi Data Engineer"""
    
    generator = AIInterviewQuestionGenerator()
    
    print("📊 TEST DATA ENGINEER")
    print("=" * 60)
    
    # Données de test
    offer_title = "Data Engineer Senior (Spark & AWS)"
    offer_description = """
    Nous recrutons un Data Engineer expérimenté pour construire et maintenir nos pipelines de données.
    Vous travaillerez avec des technologies Big Data comme Apache Spark, Kafka, et des services cloud AWS.
    Votre mission sera de concevoir des ETL/ELT robustes pour alimenter notre data lake.
    """
    requirements = "Apache Spark, Kafka, AWS (S3, Redshift), Python, SQL, ETL, Big Data"
    
    # 1. Test de l'analyse du domaine
    print("🔍 ÉTAPE 1: Analyse du domaine")
    job_analysis = generator._analyze_job_offer(offer_title, requirements)
    print(f"Domaine détecté: {job_analysis}")
    assert "Data" in job_analysis
    print("✅ La détection du domaine Data est correcte.")
    print()

    # 2. Test de l'extraction des mots-clés
    print("🔍 ÉTAPE 2: Extraction des mots-clés")
    keywords = generator._extract_job_keywords(offer_title, offer_description, requirements)
    print(f"Mots-clés extraits: {keywords[:10]}")
    assert "apache spark" in keywords
    assert "etl" in keywords
    print("✅ L'extraction des mots-clés est pertinente.")
    print()

    # 3. Test de la sélection des questions de fallback
    print("🔍 ÉTAPE 3: Test des questions de secours (fallback)")
    fallback_questions = generator._get_fallback_questions(3, offer_title, requirements)
    print(f"Questions fallback générées: {len(fallback_questions)}")
    
    found_data_question = False
    for q in fallback_questions:
        print(f"- {q['question']}")
        if "pipeline" in q['question'].lower() or "spark" in q['question'].lower() or "etl" in q['question'].lower():
            found_data_question = True
    
    assert found_data_question
    print("✅ Les questions de secours sont bien spécifiques au domaine Data.")
    print()

    # 4. Test de la génération par Gemini (si configuré)
    if generator.model:
        print("🤖 ÉTAPE 4: Test de la génération par IA Gemini")
        try:
            ai_questions = generator.generate_questions(
                offer_title=offer_title,
                offer_description=offer_description,
                requirements=requirements,
                number_of_questions=3
            )
            print(f"Questions IA générées: {len(ai_questions)}")
            for q in ai_questions:
                print(f"- {q['question']}")
            print("✅ La génération IA semble fonctionner.")
        except Exception as e:
            print(f"❌ La génération IA a échoué : {e}")
    else:
        print("⏩ ÉTAPE 4: Génération IA non testée (API Key non configurée).")

if __name__ == "__main__":
    test_data_engineer_questions()
