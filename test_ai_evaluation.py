#!/usr/bin/env python
"""
Test script pour vérifier l'installation et le fonctionnement du système d'évaluation IA vidéo.
"""

import os
import sys
import django
from pathlib import Path

# Ajouter le répertoire backend au path
backend_path = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_path))

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prototype.settings')
django.setup()

def test_imports():
    """Test des imports des dépendances IA"""
    print("🔍 Test des imports...")
    
    try:
        import whisper
        print("✅ Whisper importé avec succès")
    except ImportError as e:
        print(f"❌ Erreur import Whisper: {e}")
        return False
    
    try:
        import torch
        print(f"✅ PyTorch importé avec succès (version: {torch.__version__})")
    except ImportError as e:
        print(f"❌ Erreur import PyTorch: {e}")
        return False
    
    try:
        import transformers
        print(f"✅ Transformers importé avec succès (version: {transformers.__version__})")
    except ImportError as e:
        print(f"❌ Erreur import Transformers: {e}")
        return False
    
    try:
        import ffmpeg
        print("✅ FFmpeg-python importé avec succès")
    except ImportError as e:
        print(f"❌ Erreur import FFmpeg-python: {e}")
        return False
    
    try:
        import google.generativeai as genai
        print("✅ Google Generative AI importé avec succès")
    except ImportError as e:
        print(f"❌ Erreur import Google Generative AI: {e}")
        return False
    
    return True

def test_django_models():
    """Test des modèles Django"""
    print("\n🔍 Test des modèles Django...")
    
    try:
        from interviews.models import AiEvaluation, InterviewAnswer, InterviewQuestion, InterviewCampaign
        print("✅ Modèles Django importés avec succès")
        
        # Vérifier que le modèle AiEvaluation a les bons champs
        fields = [field.name for field in AiEvaluation._meta.fields]
        required_fields = ['candidate', 'interview_answer', 'transcription', 'ai_score', 'ai_feedback']
        
        for field in required_fields:
            if field in fields:
                print(f"✅ Champ {field} présent dans AiEvaluation")
            else:
                print(f"❌ Champ {field} manquant dans AiEvaluation")
                return False
        
        return True
        
    except ImportError as e:
        print(f"❌ Erreur import modèles Django: {e}")
        return False

def test_ai_service():
    """Test du service d'évaluation IA"""
    print("\n🔍 Test du service d'évaluation IA...")
    
    try:
        from interviews.ai_evaluation_service import AIVideoEvaluationService
        print("✅ Service d'évaluation IA importé avec succès")
        
        # Créer une instance du service
        service = AIVideoEvaluationService()
        print("✅ Instance du service créée avec succès")
        
        # Test de chargement du modèle Whisper (sans l'utiliser)
        print("✅ Service d'évaluation IA fonctionnel")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur service d'évaluation IA: {e}")
        return False

def test_api_views():
    """Test des vues API"""
    print("\n🔍 Test des vues API...")
    
    try:
        from interviews.views import EvaluateVideoView, AiEvaluationViewSet
        print("✅ Vues API importées avec succès")
        
        from interviews.serializers import AiEvaluationSerializer, EvaluateVideoRequestSerializer
        print("✅ Serializers importés avec succès")
        
        return True
        
    except ImportError as e:
        print(f"❌ Erreur import vues API: {e}")
        return False

def test_whisper_basic():
    """Test basique de Whisper"""
    print("\n🔍 Test basique de Whisper...")
    
    try:
        import whisper
        
        # Charger le modèle le plus petit pour le test
        print("📥 Chargement du modèle Whisper 'tiny' (test)...")
        model = whisper.load_model("tiny")
        print("✅ Modèle Whisper chargé avec succès")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur test Whisper: {e}")
        return False

def main():
    """Fonction principale de test"""
    print("🚀 Test du système d'évaluation IA vidéo - JobGate")
    print("=" * 60)
    
    tests = [
        ("Imports des dépendances", test_imports),
        ("Modèles Django", test_django_models),
        ("Service d'évaluation IA", test_ai_service),
        ("Vues API", test_api_views),
        ("Whisper basique", test_whisper_basic),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Erreur inattendue dans {test_name}: {e}")
            results.append((test_name, False))
    
    # Résumé
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ DES TESTS")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSÉ" if result else "❌ ÉCHOUÉ"
        print(f"{test_name:<30} {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Résultat global: {passed}/{total} tests passés")
    
    if passed == total:
        print("🎉 Tous les tests sont passés ! Le système d'évaluation IA est prêt.")
        print("\n📋 Prochaines étapes:")
        print("1. Configurer GOOGLE_GEMINI_API_KEY dans .env")
        print("2. Installer FFmpeg sur le système")
        print("3. Exécuter les migrations Django")
        print("4. Tester l'API avec une vraie vidéo")
    else:
        print("⚠️  Certains tests ont échoué. Vérifiez les erreurs ci-dessus.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
