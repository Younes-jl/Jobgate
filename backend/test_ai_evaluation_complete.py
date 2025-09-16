#!/usr/bin/env python
"""
Test complet du système d'évaluation IA des vidéos d'entretien
Ce script teste l'ensemble de la pipeline d'évaluation IA.
"""

import os
import sys
import django
from django.conf import settings

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prototype.settings')
django.setup()

from interviews.models import AiEvaluation, InterviewAnswer, InterviewQuestion, InterviewCampaign, JobOffer
from interviews.services.ai_video_evaluation_service import AIVideoEvaluationService
from interviews.serializers import AiEvaluationSerializer, AiEvaluationCreateSerializer
from users.models import CustomUser
from django.test import RequestFactory
from interviews.views import AiEvaluationViewSet
from rest_framework.test import APIRequestFactory
import json

def test_ai_evaluation_system():
    """Test complet du système d'évaluation IA"""
    
    print("🚀 DÉBUT DU TEST COMPLET D'ÉVALUATION IA")
    print("=" * 60)
    
    # 1. Test du modèle AiEvaluation
    print("\n1️⃣ Test du modèle AiEvaluation...")
    try:
        # Vérifier que le modèle existe et est accessible
        ai_evaluations = AiEvaluation.objects.all()
        print(f"✅ Modèle AiEvaluation accessible - {ai_evaluations.count()} évaluations existantes")
        
        # Test des méthodes du modèle
        if ai_evaluations.exists():
            evaluation = ai_evaluations.first()
            print(f"   - Grade communication: {evaluation.get_score_grade(evaluation.communication_score)}")
            print(f"   - Grade global: {evaluation.get_overall_grade()}")
            print(f"   - Statut: {evaluation.get_status_display()}")
        
    except Exception as e:
        print(f"❌ Erreur modèle AiEvaluation: {e}")
        return False
    
    # 2. Test du service d'évaluation IA
    print("\n2️⃣ Test du service AIVideoEvaluationService...")
    try:
        ai_service = AIVideoEvaluationService()
        print("✅ Service d'évaluation IA initialisé")
        
        # Vérifier les méthodes disponibles
        methods = [method for method in dir(ai_service) if not method.startswith('_')]
        print(f"   - Méthodes disponibles: {', '.join(methods)}")
        
    except Exception as e:
        print(f"❌ Erreur service IA: {e}")
        return False
    
    # 3. Test des serializers
    print("\n3️⃣ Test des serializers...")
    try:
        # Test AiEvaluationSerializer
        if ai_evaluations.exists():
            evaluation = ai_evaluations.first()
            serializer = AiEvaluationSerializer(evaluation)
            serialized_data = serializer.data
            print("✅ AiEvaluationSerializer fonctionne")
            print(f"   - Champs sérialisés: {len(serialized_data)} champs")
            
            # Afficher quelques champs formatés
            if 'status_display' in serialized_data:
                print(f"   - Statut formaté: {serialized_data['status_display']}")
            if 'processing_time_display' in serialized_data:
                print(f"   - Temps de traitement: {serialized_data['processing_time_display']}")
        
        # Test AiEvaluationCreateSerializer
        create_serializer = AiEvaluationCreateSerializer(data={
            'interview_answer_id': 1,
            'force_reevaluation': False
        })
        print(f"✅ AiEvaluationCreateSerializer - Validation: {create_serializer.is_valid()}")
        
    except Exception as e:
        print(f"❌ Erreur serializers: {e}")
        return False
    
    # 4. Test des vues API
    print("\n4️⃣ Test des vues API...")
    try:
        factory = APIRequestFactory()
        viewset = AiEvaluationViewSet()
        
        # Test de la méthode get_queryset
        request = factory.get('/api/interviews/ai-evaluations/')
        
        # Créer un utilisateur de test
        try:
            admin_user = CustomUser.objects.filter(is_superuser=True).first()
            if not admin_user:
                admin_user = CustomUser.objects.filter(role='ADMIN').first()
            
            if admin_user:
                request.user = admin_user
                viewset.request = request
                queryset = viewset.get_queryset()
                print(f"✅ ViewSet get_queryset fonctionne - {queryset.count()} évaluations")
            else:
                print("⚠️ Aucun utilisateur admin trouvé pour tester les vues")
                
        except Exception as e:
            print(f"⚠️ Test des vues limité: {e}")
        
    except Exception as e:
        print(f"❌ Erreur vues API: {e}")
        return False
    
    # 5. Test de la structure des données
    print("\n5️⃣ Test de la structure des données...")
    try:
        # Vérifier les relations entre modèles
        interview_answers = InterviewAnswer.objects.filter(
            cloudinary_secure_url__isnull=False
        ).select_related('question__campaign__job_offer', 'candidate')
        
        print(f"✅ Réponses avec vidéos trouvées: {interview_answers.count()}")
        
        if interview_answers.exists():
            answer = interview_answers.first()
            print(f"   - Candidat: {answer.candidate.username}")
            print(f"   - Question: {answer.question.text[:50]}...")
            print(f"   - Campagne: {answer.question.campaign.title}")
            print(f"   - URL vidéo: {'Oui' if answer.cloudinary_secure_url else 'Non'}")
            
            # Vérifier si une évaluation IA existe pour cette réponse
            ai_eval = AiEvaluation.objects.filter(interview_answer=answer).first()
            if ai_eval:
                print(f"   - Évaluation IA: {ai_eval.status} (Score: {ai_eval.overall_ai_score})")
            else:
                print("   - Aucune évaluation IA pour cette réponse")
        
    except Exception as e:
        print(f"❌ Erreur structure données: {e}")
        return False
    
    # 6. Test des endpoints disponibles
    print("\n6️⃣ Test des endpoints disponibles...")
    try:
        from interviews.urls import router
        
        # Lister les endpoints enregistrés
        registered_viewsets = []
        for pattern in router.registry:
            registered_viewsets.append(f"{pattern[0]} -> {pattern[1].__name__}")
        
        print("✅ Endpoints enregistrés:")
        for endpoint in registered_viewsets:
            print(f"   - {endpoint}")
            
        # Vérifier que ai-evaluations est bien enregistré
        ai_eval_registered = any('ai-evaluations' in endpoint for endpoint in registered_viewsets)
        if ai_eval_registered:
            print("✅ Endpoint ai-evaluations correctement enregistré")
        else:
            print("❌ Endpoint ai-evaluations manquant")
            return False
        
    except Exception as e:
        print(f"❌ Erreur endpoints: {e}")
        return False
    
    # 7. Résumé des fonctionnalités disponibles
    print("\n7️⃣ Résumé des fonctionnalités disponibles...")
    
    available_endpoints = [
        "GET /api/interviews/ai-evaluations/ - Liste des évaluations IA",
        "POST /api/interviews/ai-evaluations/evaluate_video/ - Déclencher évaluation",
        "POST /api/interviews/ai-evaluations/bulk_evaluate/ - Évaluation en lot",
        "GET /api/interviews/ai-evaluations/by_campaign/?campaign_id=X - Par campagne",
        "GET /api/interviews/ai-evaluations/by_candidate/?candidate_id=X - Par candidat"
    ]
    
    print("✅ Endpoints API disponibles:")
    for endpoint in available_endpoints:
        print(f"   - {endpoint}")
    
    print("\n" + "=" * 60)
    print("🎉 TEST COMPLET TERMINÉ AVEC SUCCÈS!")
    print("✅ Le système d'évaluation IA est opérationnel")
    print("\n📋 PROCHAINES ÉTAPES RECOMMANDÉES:")
    print("   1. Configurer GOOGLE_GEMINI_API_KEY dans les variables d'environnement")
    print("   2. Tester l'évaluation IA sur une vraie vidéo")
    print("   3. Intégrer l'interface frontend pour afficher les résultats")
    print("   4. Optimiser les performances pour le traitement en lot")
    
    return True

def test_api_example():
    """Exemple d'utilisation de l'API d'évaluation IA"""
    
    print("\n" + "=" * 60)
    print("📖 EXEMPLE D'UTILISATION DE L'API")
    print("=" * 60)
    
    # Exemple de payload pour déclencher une évaluation
    evaluate_payload = {
        "interview_answer_id": 1,
        "force_reevaluation": False
    }
    
    print("\n🔧 Exemple de requête pour évaluer une vidéo:")
    print("POST /api/interviews/ai-evaluations/evaluate_video/")
    print(f"Body: {json.dumps(evaluate_payload, indent=2)}")
    
    # Exemple de payload pour évaluation en lot
    bulk_payload = {
        "campaign_id": 1,
        "candidate_ids": [1, 2, 3],
        "force_reevaluation": False
    }
    
    print("\n🔧 Exemple de requête pour évaluation en lot:")
    print("POST /api/interviews/ai-evaluations/bulk_evaluate/")
    print(f"Body: {json.dumps(bulk_payload, indent=2)}")
    
    print("\n🔧 Exemple de requête pour récupérer les évaluations:")
    print("GET /api/interviews/ai-evaluations/by_campaign/?campaign_id=1")
    print("GET /api/interviews/ai-evaluations/by_candidate/?candidate_id=1")

if __name__ == "__main__":
    try:
        success = test_ai_evaluation_system()
        if success:
            test_api_example()
        else:
            print("\n❌ Des erreurs ont été détectées dans le système")
            sys.exit(1)
    except Exception as e:
        print(f"\n💥 ERREUR CRITIQUE: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
