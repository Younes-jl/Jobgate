#!/usr/bin/env python
"""
Script de debug pour tester la configuration Gemini
"""
import os
import sys
import django

# Ajouter le répertoire backend au path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prototype.settings')
django.setup()

def test_gemini_config():
    """Test de la configuration Gemini"""
    print("🧪 TEST CONFIGURATION GEMINI")
    print("=" * 50)
    
    # Vérifier les variables d'environnement
    api_key = os.environ.get('GOOGLE_API_KEY')
    use_gemini = os.environ.get('USE_GEMINI', 'false').lower() == 'true'
    ai_enabled = os.environ.get('AI_EVALUATION_ENABLED', 'false').lower() == 'true'
    
    print(f"📋 GOOGLE_API_KEY: {'✅ Définie' if api_key else '❌ Manquante'}")
    if api_key:
        print(f"   Longueur: {len(api_key)} caractères")
        print(f"   Début: {api_key[:10]}...")
    
    print(f"📋 USE_GEMINI: {use_gemini}")
    print(f"📋 AI_EVALUATION_ENABLED: {ai_enabled}")
    print()
    
    # Test d'import
    try:
        import google.generativeai as genai
        print("✅ Module google.generativeai importé avec succès")
    except ImportError as e:
        print(f"❌ Erreur d'import: {e}")
        print("💡 Installez: pip install google-generativeai")
        return
    
    # Test de configuration
    if not api_key:
        print("❌ Impossible de tester sans clé API")
        print("💡 Définissez GOOGLE_API_KEY dans votre environnement")
        return
    
    try:
        genai.configure(api_key=api_key)
        print("✅ Configuration Gemini réussie")
        
        # Test simple
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content("Dis simplement 'Test réussi'")
        print(f"✅ Test API réussi: {response.text.strip()}")
        
        # Test de génération de questions
        print("\n🎯 Test génération de questions...")
        prompt = """
        Génère 2 questions d'entretien pour un poste de Data Engineer.
        Retourne uniquement un JSON avec cette structure:
        {
            "questions": [
                {
                    "question": "Question 1",
                    "type": "technical",
                    "expected_duration": 300,
                    "skills_assessed": ["Python", "Spark"]
                }
            ]
        }
        """
        
        response = model.generate_content(prompt)
        print(f"✅ Génération test: {response.text[:100]}...")
        
    except Exception as e:
        print(f"❌ Erreur API Gemini: {e}")
        print(f"   Type: {type(e).__name__}")
        
        # Vérifier si c'est un problème de quota
        if "quota" in str(e).lower() or "limit" in str(e).lower():
            print("💡 Possible problème de quota/limite API")
        elif "key" in str(e).lower() or "auth" in str(e).lower():
            print("💡 Possible problème d'authentification")
        elif "blocked" in str(e).lower():
            print("💡 Contenu possiblement bloqué par les filtres de sécurité")

def test_view_import():
    """Test d'import de la vue"""
    print("\n🔍 TEST IMPORT VUE")
    print("=" * 30)
    
    try:
        from interviews.views import AIQuestionGeneratorView
        print("✅ AIQuestionGeneratorView importée avec succès")
        
        # Vérifier les méthodes
        view = AIQuestionGeneratorView()
        if hasattr(view, 'post'):
            print("✅ Méthode POST disponible")
        else:
            print("❌ Méthode POST manquante")
            
    except ImportError as e:
        print(f"❌ Erreur d'import de la vue: {e}")
    except Exception as e:
        print(f"❌ Erreur lors du test de la vue: {e}")

if __name__ == "__main__":
    test_gemini_config()
    test_view_import()
