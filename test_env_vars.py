#!/usr/bin/env python
"""
Test simple des variables d'environnement Docker
"""
import os

def test_docker_env():
    """Test des variables d'environnement dans Docker"""
    print("🧪 TEST VARIABLES D'ENVIRONNEMENT DOCKER")
    print("=" * 50)
    
    # Variables IA critiques
    env_vars = {
        'GOOGLE_API_KEY': os.environ.get('GOOGLE_API_KEY'),
        'GOOGLE_GEMINI_API_KEY': os.environ.get('GOOGLE_GEMINI_API_KEY'),
        'USE_GEMINI': os.environ.get('USE_GEMINI'),
        'USE_GOOGLE_GEMINI': os.environ.get('USE_GOOGLE_GEMINI'),
        'AI_EVALUATION_ENABLED': os.environ.get('AI_EVALUATION_ENABLED'),
        'DOCKER_ENVIRONMENT': os.environ.get('DOCKER_ENVIRONMENT'),
    }
    
    for key, value in env_vars.items():
        status = "✅ SET" if value else "❌ NOT SET"
        print(f"{key}: {status}")
        if value and 'API_KEY' in key:
            print(f"  Longueur: {len(value)} caractères")
            print(f"  Début: {value[:10]}...")
    
    print()
    
    # Test d'import Google Generative AI
    try:
        import google.generativeai as genai
        print("✅ google.generativeai importé")
        
        api_key = os.environ.get('GOOGLE_API_KEY') or os.environ.get('GOOGLE_GEMINI_API_KEY')
        if api_key:
            try:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-1.5-flash')
                response = model.generate_content("Say 'API Test OK'")
                print(f"✅ Gemini API fonctionnel: {response.text.strip()}")
                return True
            except Exception as e:
                print(f"❌ Erreur API Gemini: {e}")
                return False
        else:
            print("❌ Aucune clé API trouvée")
            return False
            
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

if __name__ == "__main__":
    success = test_docker_env()
    exit(0 if success else 1)
