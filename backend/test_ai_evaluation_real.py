#!/usr/bin/env python
"""
Test réel du système d'évaluation IA avec une vidéo d'entretien
Ce script teste l'API complète d'évaluation IA
"""

import os
import sys
import django
import requests
import json
from django.conf import settings

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prototype.settings')
django.setup()

from interviews.models import InterviewAnswer, AiEvaluation
from interviews.services.ai_video_evaluation_service import AIVideoEvaluationService
from users.models import CustomUser

def test_gemini_api_key():
    """Teste si la clé API Gemini est configurée"""
    print("🔑 Test de la configuration Gemini API...")
    
    api_key = getattr(settings, 'GOOGLE_GEMINI_API_KEY', None)
    if not api_key or api_key == 'your_gemini_api_key_here':
        print("❌ GOOGLE_GEMINI_API_KEY non configurée")
        print("📋 Instructions:")
        print("   1. Obtenez votre clé API sur https://makersuite.google.com/app/apikey")
        print("   2. Ajoutez GOOGLE_GEMINI_API_KEY=votre_cle dans votre fichier .env")
        print("   3. Redémarrez le serveur Django")
        return False
    else:
        print(f"✅ Clé API Gemini configurée (longueur: {len(api_key)} caractères)")
        return True

def find_test_video():
    """Trouve une réponse vidéo pour les tests"""
    print("\n🎥 Recherche d'une vidéo de test...")
    
    # Chercher une réponse avec vidéo Cloudinary
    video_answers = InterviewAnswer.objects.filter(
        cloudinary_secure_url__isnull=False
    ).exclude(cloudinary_secure_url='').select_related(
        'candidate', 'question__campaign'
    )
    
    if not video_answers.exists():
        # Chercher avec cloudinary_url si secure_url n'existe pas
        video_answers = InterviewAnswer.objects.filter(
            cloudinary_url__isnull=False
        ).exclude(cloudinary_url='').select_related(
            'candidate', 'question__campaign'
        )
    
    if video_answers.exists():
        answer = video_answers.first()
        print(f"✅ Vidéo trouvée:")
        print(f"   - ID: {answer.id}")
        print(f"   - Candidat: {answer.candidate.username}")
        print(f"   - Question: {answer.question.text[:50]}...")
        print(f"   - URL: {answer.cloudinary_secure_url or answer.cloudinary_url}")
        return answer
    else:
        print("❌ Aucune vidéo d'entretien trouvée")
        print("💡 Pour tester, vous devez avoir au moins une réponse avec vidéo Cloudinary")
        return None

def test_ai_service_direct(video_answer):
    """Test direct du service d'évaluation IA"""
    print(f"\n🤖 Test direct du service IA pour la réponse {video_answer.id}...")
    
    try:
        ai_service = AIVideoEvaluationService()
        
        # Vérifier si une évaluation existe déjà
        existing_eval = AiEvaluation.objects.filter(interview_answer=video_answer).first()
        if existing_eval:
            print(f"⚠️ Évaluation existante trouvée (ID: {existing_eval.id})")
            print(f"   - Statut: {existing_eval.status}")
            if existing_eval.status == 'completed':
                print(f"   - Score communication: {existing_eval.communication_score}")
                print(f"   - Score pertinence: {existing_eval.relevance_score}")
                print(f"   - Score confiance: {existing_eval.confidence_score}")
                print(f"   - Score global: {existing_eval.overall_ai_score}")
                return existing_eval
        
        # Lancer une nouvelle évaluation
        print("🚀 Lancement de l'évaluation IA...")
        result = ai_service.evaluate_video_answer(video_answer.id)
        
        if result:
            print("✅ Évaluation IA réussie!")
            print(f"   - ID évaluation: {result['evaluation_id']}")
            print(f"   - Statut: {result['status']}")
            if result.get('scores'):
                scores = result['scores']
                print(f"   - Communication: {scores.get('communication', 'N/A')}")
                print(f"   - Pertinence: {scores.get('relevance', 'N/A')}")
                print(f"   - Confiance: {scores.get('confidence', 'N/A')}")
                print(f"   - Global: {scores.get('overall', 'N/A')}")
            return result
        else:
            print("❌ Échec de l'évaluation IA")
            return None
            
    except Exception as e:
        print(f"❌ Erreur lors de l'évaluation: {e}")
        return None

def test_api_endpoints(video_answer):
    """Test des endpoints API d'évaluation IA"""
    print(f"\n🌐 Test des endpoints API...")
    
    # URL de base (ajustez selon votre configuration)
    base_url = "http://localhost:8000/api/interviews"
    
    # Test 1: Déclencher une évaluation
    print("📡 Test POST /ai-evaluations/evaluate_video/")
    
    payload = {
        "interview_answer_id": video_answer.id,
        "force_reevaluation": False
    }
    
    print(f"   Payload: {json.dumps(payload, indent=2)}")
    print("   💡 Pour tester l'API, utilisez:")
    print(f"   curl -X POST {base_url}/ai-evaluations/evaluate_video/ \\")
    print("        -H 'Content-Type: application/json' \\")
    print("        -H 'Authorization: Bearer YOUR_TOKEN' \\")
    print(f"        -d '{json.dumps(payload)}'")
    
    # Test 2: Récupérer les évaluations
    print(f"\n📡 Test GET /ai-evaluations/by_candidate/")
    print(f"   💡 Pour récupérer les évaluations du candidat:")
    print(f"   curl -X GET '{base_url}/ai-evaluations/by_candidate/?candidate_id={video_answer.candidate.id}' \\")
    print("        -H 'Authorization: Bearer YOUR_TOKEN'")

def create_test_script():
    """Crée un script de test API complet"""
    print("\n📝 Création du script de test API...")
    
    script_content = '''#!/bin/bash
# Script de test pour l'API d'évaluation IA
# Remplacez YOUR_TOKEN par un token d'authentification valide

BASE_URL="http://localhost:8000/api/interviews"
TOKEN="YOUR_TOKEN"

echo "🧪 Test de l'API d'évaluation IA JobGate"
echo "========================================"

# Test 1: Liste des évaluations IA
echo "📋 1. Liste des évaluations IA"
curl -X GET "$BASE_URL/ai-evaluations/" \\
     -H "Authorization: Bearer $TOKEN" \\
     -H "Content-Type: application/json" | jq .

echo -e "\\n"

# Test 2: Déclencher une évaluation (remplacez ANSWER_ID)
echo "🚀 2. Déclencher une évaluation IA"
curl -X POST "$BASE_URL/ai-evaluations/evaluate_video/" \\
     -H "Authorization: Bearer $TOKEN" \\
     -H "Content-Type: application/json" \\
     -d '{"interview_answer_id": ANSWER_ID, "force_reevaluation": false}' | jq .

echo -e "\\n"

# Test 3: Évaluations par campagne (remplacez CAMPAIGN_ID)
echo "📊 3. Évaluations par campagne"
curl -X GET "$BASE_URL/ai-evaluations/by_campaign/?campaign_id=CAMPAIGN_ID" \\
     -H "Authorization: Bearer $TOKEN" \\
     -H "Content-Type: application/json" | jq .

echo -e "\\n"

# Test 4: Évaluations par candidat (remplacez CANDIDATE_ID)
echo "👤 4. Évaluations par candidat"
curl -X GET "$BASE_URL/ai-evaluations/by_candidate/?candidate_id=CANDIDATE_ID" \\
     -H "Authorization: Bearer $TOKEN" \\
     -H "Content-Type: application/json" | jq .

echo "✅ Tests terminés"
'''
    
    with open('test_ai_api.sh', 'w') as f:
        f.write(script_content)
    
    print("✅ Script créé: test_ai_api.sh")
    print("💡 Rendez-le exécutable avec: chmod +x test_ai_api.sh")

def main():
    """Fonction principale de test"""
    print("🚀 TEST COMPLET DU SYSTÈME D'ÉVALUATION IA")
    print("=" * 60)
    
    # Test 1: Configuration
    if not test_gemini_api_key():
        print("\n❌ Configuration incomplète. Configurez d'abord GOOGLE_GEMINI_API_KEY")
        return False
    
    # Test 2: Trouver une vidéo de test
    video_answer = find_test_video()
    if not video_answer:
        print("\n❌ Aucune vidéo de test disponible")
        return False
    
    # Test 3: Service IA direct
    result = test_ai_service_direct(video_answer)
    
    # Test 4: Documentation API
    test_api_endpoints(video_answer)
    
    # Test 5: Script de test
    create_test_script()
    
    print("\n" + "=" * 60)
    if result:
        print("🎉 SYSTÈME D'ÉVALUATION IA OPÉRATIONNEL!")
        print("✅ L'évaluation IA fonctionne correctement")
    else:
        print("⚠️ SYSTÈME PARTIELLEMENT OPÉRATIONNEL")
        print("🔧 Vérifiez la configuration et les logs pour plus de détails")
    
    print("\n📋 PROCHAINES ÉTAPES:")
    print("   1. Configurez GOOGLE_GEMINI_API_KEY si ce n'est pas fait")
    print("   2. Testez l'API avec le script test_ai_api.sh")
    print("   3. Intégrez l'interface frontend")
    
    return True

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n💥 ERREUR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
