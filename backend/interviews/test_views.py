from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import os
from .ai_service import AIInterviewQuestionGenerator

@require_http_methods(["GET"])
@csrf_exempt
def test_env_vars(request):
    """Endpoint de test pour vérifier les variables d'environnement Gemini"""
    
    # Test des variables d'environnement
    api_key = os.getenv('GOOGLE_GEMINI_API_KEY')
    use_gemini = os.getenv('USE_GOOGLE_GEMINI', 'false').lower() == 'true'
    
    # Test de l'initialisation du service
    try:
        generator = AIInterviewQuestionGenerator()
        model_initialized = generator.model is not None
        api_key_present = generator.api_key is not None
    except Exception as e:
        model_initialized = False
        api_key_present = False
    
    return JsonResponse({
        'api_key_present': api_key_present,
        'api_key_length': len(api_key) if api_key else 0,
        'use_gemini': use_gemini,
        'model_initialized': model_initialized,
        'env_vars': {
            'GOOGLE_GEMINI_API_KEY': 'SET' if api_key else 'NOT_SET',
            'USE_GOOGLE_GEMINI': os.getenv('USE_GOOGLE_GEMINI', 'NOT_SET'),
            'AI_EVALUATION_ENABLED': os.getenv('AI_EVALUATION_ENABLED', 'NOT_SET'),
        }
    })
