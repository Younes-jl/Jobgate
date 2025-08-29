#!/usr/bin/env python3
"""
Test direct de l'API Google Gemini
"""
import os
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# Configuration de la clé API
API_KEY = "AIzaSyBKxedeY80RD30tP_7bshhAZfYNCUCEVms"

def test_gemini_api():
    """Test direct de l'API Gemini"""
    try:
        print("🔄 Configuration de l'API Gemini...")
        genai.configure(api_key=API_KEY)
        
        # Configuration du modèle
        generation_config = {
            "temperature": 0.7,
            "top_p": 0.8,
            "top_k": 40,
            "max_output_tokens": 2048,
        }
        
        safety_settings = {
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        }
        
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        
        print("✅ Modèle initialisé avec succès")
        
        # Test simple
        prompt = """
Générez 2 questions d'entretien pour un poste de MLOps Engineer.

Format JSON:
```json
[
  {
    "question": "Question spécifique MLOps",
    "type": "technique",
    "expected_duration": 120,
    "difficulty_level": "medium"
  }
]
```
"""
        
        print("🔄 Envoi de la requête...")
        response = model.generate_content(prompt)
        
        if response and response.text:
            print("✅ Réponse reçue:")
            print(response.text)
            return True
        else:
            print("❌ Réponse vide")
            return False
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

if __name__ == "__main__":
    success = test_gemini_api()
    if success:
        print("\n✅ Test réussi - L'API Gemini fonctionne")
    else:
        print("\n❌ Test échoué - Problème avec l'API Gemini")
