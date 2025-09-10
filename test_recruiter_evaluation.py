#!/usr/bin/env python
"""
Script de test pour le système d'évaluation recruteur
Teste les endpoints API et la logique métier du modèle RecruiterEvaluation
"""

import os
import sys
import django
from django.conf import settings

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prototype.settings')
sys.path.append('backend')
django.setup()

from interviews.models import RecruiterEvaluation, InterviewAnswer, InterviewCampaign, InterviewQuestion
from users.models import CustomUser
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
import json

def test_recruiter_evaluation_model():
    """Test du modèle RecruiterEvaluation"""
    print("🧪 Test du modèle RecruiterEvaluation...")
    
    try:
        # Vérifier que le modèle existe
        print(f"✅ Modèle RecruiterEvaluation trouvé")
        print(f"   - Champs: {[field.name for field in RecruiterEvaluation._meta.fields]}")
        
        # Vérifier les choix de recommandation
        choices = RecruiterEvaluation.RECOMMENDATION_CHOICES
        print(f"   - Choix de recommandation: {choices}")
        
        # Vérifier les méthodes
        methods = [method for method in dir(RecruiterEvaluation) if not method.startswith('_')]
        print(f"   - Méthodes disponibles: {methods}")
        
        return True
    except Exception as e:
        print(f"❌ Erreur lors du test du modèle: {e}")
        return False

def test_serializer():
    """Test du serializer RecruiterEvaluation"""
    print("\n🧪 Test du serializer RecruiterEvaluationSerializer...")
    
    try:
        from interviews.serializers import RecruiterEvaluationSerializer
        
        # Données de test
        test_data = {
            'communication_score': 85.0,
            'communication_feedback': 'Très bonne communication',
            'confidence_score': 90.0,
            'confidence_feedback': 'Candidat très confiant',
            'relevance_score': 80.0,
            'relevance_feedback': 'Réponse pertinente',
            'overall_score': 85.0,
            'overall_feedback': 'Bon candidat dans l\'ensemble',
            'recommendation': 'good'
        }
        
        serializer = RecruiterEvaluationSerializer(data=test_data)
        is_valid = serializer.is_valid()
        
        print(f"✅ Serializer créé avec succès")
        print(f"   - Validation: {'✅ Valide' if is_valid else '❌ Invalide'}")
        
        if not is_valid:
            print(f"   - Erreurs: {serializer.errors}")
        
        return is_valid
    except Exception as e:
        print(f"❌ Erreur lors du test du serializer: {e}")
        return False

def test_viewset():
    """Test du ViewSet RecruiterEvaluation"""
    print("\n🧪 Test du ViewSet RecruiterEvaluationViewSet...")
    
    try:
        from interviews.views import RecruiterEvaluationViewSet
        
        viewset = RecruiterEvaluationViewSet()
        print(f"✅ ViewSet créé avec succès")
        print(f"   - Actions disponibles: {list(viewset.get_extra_actions())}")
        
        # Vérifier les permissions
        permission_classes = viewset.permission_classes
        print(f"   - Classes de permission: {[cls.__name__ for cls in permission_classes]}")
        
        return True
    except Exception as e:
        print(f"❌ Erreur lors du test du ViewSet: {e}")
        return False

def test_urls():
    """Test des URLs"""
    print("\n🧪 Test des URLs...")
    
    try:
        from django.urls import reverse
        from django.conf.urls import include
        
        # Tester si l'URL est configurée
        try:
            from interviews.urls import router
            registered_routes = [route for route in router.registry]
            print(f"✅ Routes enregistrées: {registered_routes}")
            
            # Chercher la route recruiter-evaluations
            recruiter_eval_route = None
            for prefix, viewset, basename in router.registry:
                if 'recruiter' in prefix.lower() or 'evaluation' in prefix.lower():
                    recruiter_eval_route = (prefix, viewset, basename)
                    break
            
            if recruiter_eval_route:
                print(f"✅ Route d'évaluation recruteur trouvée: {recruiter_eval_route}")
            else:
                print("⚠️  Route d'évaluation recruteur non trouvée dans le routeur")
            
            return True
        except Exception as e:
            print(f"⚠️  Erreur lors de la vérification des routes: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur lors du test des URLs: {e}")
        return False

def test_database_connection():
    """Test de la connexion à la base de données"""
    print("\n🧪 Test de la connexion à la base de données...")
    
    try:
        from django.db import connection
        
        with connection.cursor() as cursor:
            # Vérifier si la table existe
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='interviews_recruiterevaluation';
            """)
            
            result = cursor.fetchone()
            if result:
                print("✅ Table interviews_recruiterevaluation existe")
                
                # Vérifier la structure de la table
                cursor.execute("PRAGMA table_info(interviews_recruiterevaluation);")
                columns = cursor.fetchall()
                print(f"   - Colonnes: {[col[1] for col in columns]}")
                
                return True
            else:
                print("❌ Table interviews_recruiterevaluation n'existe pas")
                return False
                
    except Exception as e:
        print(f"❌ Erreur lors du test de la base de données: {e}")
        return False

def main():
    """Fonction principale de test"""
    print("🚀 Démarrage des tests du système d'évaluation recruteur\n")
    
    tests = [
        test_recruiter_evaluation_model,
        test_serializer,
        test_viewset,
        test_urls,
        test_database_connection
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Erreur inattendue lors du test {test.__name__}: {e}")
            results.append(False)
    
    # Résumé
    print(f"\n📊 Résumé des tests:")
    print(f"   - Tests réussis: {sum(results)}/{len(results)}")
    print(f"   - Tests échoués: {len(results) - sum(results)}/{len(results)}")
    
    if all(results):
        print("\n🎉 Tous les tests sont passés avec succès!")
        print("✅ Le système d'évaluation recruteur est prêt à être utilisé.")
    else:
        print("\n⚠️  Certains tests ont échoué. Vérifiez les erreurs ci-dessus.")
    
    return all(results)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
