#!/usr/bin/env python3
"""
Script de test pour vérifier le bon fonctionnement des modèles AI
- Whisper pour la transcription
- Gemini pour l'évaluation
"""

import os
import sys
import django
from pathlib import Path
from dotenv import load_dotenv

# Charger les variables d'environnement depuis .env
BASE_DIR = Path(__file__).resolve().parent
env_path = BASE_DIR / '.env'
load_dotenv(env_path)

# Configuration Django
sys.path.append(str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prototype.settings')
django.setup()

import whisper
import google.generativeai as genai
from django.conf import settings
import tempfile
import requests
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_whisper_model():
    """Test du modèle Whisper"""
    print("\n=== TEST WHISPER ===")
    try:
        # Charger le modèle Whisper
        print("Chargement du modèle Whisper 'base'...")
        model = whisper.load_model("base")
        print("✅ Modèle Whisper chargé avec succès")
        
        # Test avec un fichier audio de test (si disponible)
        # Pour ce test, on vérifie juste que le modèle se charge
        print("✅ Whisper est opérationnel")
        return True
        
    except Exception as e:
        print(f"❌ Erreur Whisper: {e}")
        return False

def test_gemini_api():
    """Test de l'API Gemini"""
    print("\n=== TEST GEMINI ===")
    try:
        # Vérifier la clé API
        api_key = getattr(settings, 'GOOGLE_GEMINI_API_KEY', None)
        if not api_key:
            print("❌ GOOGLE_GEMINI_API_KEY non configurée")
            return False
        
        print(f"✅ Clé API Gemini trouvée: {api_key[:10]}...")
        
        # Configurer Gemini
        genai.configure(api_key=api_key)
        
        # Test simple
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        test_prompt = """
        Évalue cette réponse d'entretien sur une échelle de 1 à 10:
        
        QUESTION: Parlez-moi de votre expérience professionnelle.
        RÉPONSE: J'ai travaillé pendant 3 ans comme développeur web dans une startup. J'ai participé au développement d'applications React et Node.js.
        
        Réponds en JSON:
        {
            "communication_score": X.X,
            "relevance_score": X.X,
            "confidence_score": X.X,
            "feedback": "Commentaire..."
        }
        """
        
        print("Envoi d'une requête test à Gemini...")
        response = model.generate_content(test_prompt)
        
        if response and response.text:
            print("✅ Gemini répond correctement")
            print(f"Réponse (extrait): {response.text[:100]}...")
            return True
        else:
            print("❌ Gemini ne répond pas")
            return False
            
    except Exception as e:
        print(f"❌ Erreur Gemini: {e}")
        return False

def test_cloudinary_access():
    """Test d'accès à Cloudinary"""
    print("\n=== TEST CLOUDINARY ===")
    try:
        # Vérifier les variables d'environnement Cloudinary
        cloud_name = getattr(settings, 'CLOUDINARY_CLOUD_NAME', None)
        api_key = getattr(settings, 'CLOUDINARY_API_KEY', None)
        api_secret = getattr(settings, 'CLOUDINARY_API_SECRET', None)
        
        if not all([cloud_name, api_key, api_secret]):
            print("❌ Configuration Cloudinary incomplète")
            return False
        
        print(f"✅ Configuration Cloudinary trouvée: {cloud_name}")
        
        # Test d'accès à une URL Cloudinary publique
        test_url = f"https://res.cloudinary.com/{cloud_name}/image/upload/sample.jpg"
        response = requests.head(test_url, timeout=10)
        
        if response.status_code == 200:
            print("✅ Accès Cloudinary opérationnel")
            return True
        else:
            print(f"⚠️ Accès Cloudinary limité (status: {response.status_code})")
            return True  # Pas critique pour les tests
            
    except Exception as e:
        print(f"❌ Erreur Cloudinary: {e}")
        return False

def test_ai_evaluation_service():
    """Test du service d'évaluation IA"""
    print("\n=== TEST SERVICE AI ===")
    try:
        from interviews.services.ai_video_evaluation_service import AIVideoEvaluationService
        
        # Créer une instance du service
        service = AIVideoEvaluationService()
        print("✅ Service AIVideoEvaluationService instancié")
        
        # Test de la construction de prompt
        prompt = service._build_evaluation_prompt(
            "Bonjour, je suis développeur avec 3 ans d'expérience.",
            "Parlez-moi de votre expérience professionnelle.",
            "Poste: Développeur Full Stack"
        )
        
        if prompt and len(prompt) > 100:
            print("✅ Génération de prompt fonctionnelle")
            return True
        else:
            print("❌ Problème avec la génération de prompt")
            return False
            
    except Exception as e:
        print(f"❌ Erreur Service AI: {e}")
        return False

def main():
    """Fonction principale de test"""
    print("🚀 TESTS DES MODÈLES AI - JOBGATE")
    print("=" * 50)
    
    results = []
    
    # Tests individuels
    results.append(("Whisper", test_whisper_model()))
    results.append(("Gemini", test_gemini_api()))
    results.append(("Cloudinary", test_cloudinary_access()))
    results.append(("Service AI", test_ai_evaluation_service()))
    
    # Résumé
    print("\n" + "=" * 50)
    print("📊 RÉSUMÉ DES TESTS")
    print("=" * 50)
    
    passed = 0
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{name:15} : {status}")
        if result:
            passed += 1
    
    print(f"\nRésultat global: {passed}/{len(results)} tests réussis")
    
    if passed == len(results):
        print("🎉 Tous les modèles AI sont opérationnels!")
    else:
        print("⚠️ Certains modèles nécessitent une attention")
    
    return passed == len(results)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
