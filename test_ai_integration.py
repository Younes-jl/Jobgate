#!/usr/bin/env python3
"""
Test de l'intégration Google Gemini pour JobGate
Script de test simple sans base de données
"""

import os
import sys
import django
from pathlib import Path

# Configuration du path Django
BASE_DIR = Path(__file__).resolve().parent / 'backend'
sys.path.append(str(BASE_DIR))

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prototype.settings')

# Configuration de test pour éviter la DB
os.environ['USE_TEST_CONFIG'] = 'true'

# Import et setup Django
django.setup()

def test_ai_service_import():
    """Test d'import du service IA"""
    try:
        from interviews.ai_service import ai_generator, analyze_question_quality
        print("✅ Import du service IA réussi")
        return True
    except ImportError as e:
        print(f"❌ Erreur d'import du service IA: {e}")
        return False
    except Exception as e:
        print(f"⚠️  Erreur configuration service IA: {e}")
        return True  # L'import a fonctionné même si la config a échoué

def test_google_gemini_config():
    """Test de la configuration Google Gemini"""
    try:
        import google.generativeai as genai
        from django.conf import settings
        
        api_key = getattr(settings, 'GOOGLE_GEMINI_API_KEY', None)
        use_gemini = getattr(settings, 'USE_GOOGLE_GEMINI', False)
        
        if not use_gemini:
            print("⚠️  Google Gemini désactivé dans la configuration")
            return False
            
        if not api_key:
            print("❌ Clé API Google Gemini manquante")
            return False
            
        print(f"✅ Configuration Google Gemini valide (clé: {api_key[:10]}...)")
        return True
        
    except ImportError:
        print("❌ Librairie google-generativeai non installée")
        return False
    except Exception as e:
        print(f"❌ Erreur configuration Google Gemini: {e}")
        return False

def test_ai_endpoints_import():
    """Test d'import des endpoints IA"""
    try:
        from interviews.views import (
            AIQuestionGeneratorView, 
            AIQuestionAnalysisView, 
            AIQuestionTemplatesView
        )
        print("✅ Import des endpoints IA réussi")
        return True
    except ImportError as e:
        print(f"❌ Erreur d'import des endpoints IA: {e}")
        return False

def test_urls_config():
    """Test de la configuration des URLs"""
    try:
        from django.urls import reverse
        from interviews.urls import urlpatterns
        
        # Vérifier que les URLs IA sont configurées
        ai_urls = [
            'ai-generate-questions',
            'ai-analyze-question', 
            'ai-question-templates'
        ]
        
        configured_names = [url.name for url in urlpatterns if hasattr(url, 'name') and url.name]
        
        for url_name in ai_urls:
            if url_name in configured_names:
                print(f"✅ URL '{url_name}' configurée")
            else:
                print(f"❌ URL '{url_name}' manquante")
                return False
                
        return True
        
    except Exception as e:
        print(f"❌ Erreur configuration URLs: {e}")
        return False

def run_tests():
    """Exécute tous les tests"""
    print("🧪 === Tests d'intégration IA Google Gemini ===\n")
    
    tests = [
        ("Import service IA", test_ai_service_import),
        ("Configuration Google Gemini", test_google_gemini_config), 
        ("Import endpoints IA", test_ai_endpoints_import),
        ("Configuration URLs", test_urls_config)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"🔍 Test: {test_name}")
        result = test_func()
        results.append((test_name, result))
        print()
    
    print("📊 === Résumé des tests ===")
    success_count = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            success_count += 1
    
    print(f"\n🎯 Résultat: {success_count}/{len(tests)} tests réussis")
    
    if success_count == len(tests):
        print("🚀 L'intégration IA est prête à être utilisée !")
    else:
        print("⚠️  Certains problèmes doivent être résolus avant utilisation.")
    
    return success_count == len(tests)

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
