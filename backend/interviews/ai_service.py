import os
import json
import logging
import re
from typing import List, Dict, Any, Optional
from django.conf import settings
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

logger = logging.getLogger(__name__)

class AIInterviewQuestionGenerator:
    """
    Service de génération de questions d'entretien avec Google Gemini
    15 requêtes/minute gratuites - Excellent pour JobGate
    """
    
    def __init__(self):
        self.api_key = getattr(settings, 'GOOGLE_GEMINI_API_KEY', None) or os.getenv('GOOGLE_GEMINI_API_KEY')
        self.use_gemini = getattr(settings, 'USE_GOOGLE_GEMINI', True)
        
        if self.use_gemini and self.api_key and self.api_key != 'your_google_gemini_api_key_here':
            self._initialize_gemini()
        else:
            logger.info("🔄 Google Gemini non configuré, utilisation du mode fallback")
            self.model = None
    
    def _initialize_gemini(self):
        """Initialise le client Google Gemini"""
        try:
            genai.configure(api_key=self.api_key)
            
            # Configuration du modèle Gemini-1.5-flash (gratuit)
            generation_config = {
                "temperature": 0.7,
                "top_p": 0.8,
                "top_k": 40,
                "max_output_tokens": 2048,
            }
            
            # Configuration de sécurité (permissive pour questions d'entretien)
            safety_settings = {
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            }
            
            self.model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                generation_config=generation_config,
                safety_settings=safety_settings
            )
            
            logger.info("✅ Google Gemini initialisé avec succès (gratuit)")
            
        except Exception as e:
            logger.error(f"❌ Erreur initialisation Gemini: {e}")
            self.model = None
    
    def generate_questions(self, offer_title: str, offer_description: str, 
                          number_of_questions: int = 5, difficulty: str = 'medium') -> List[Dict[str, Any]]:
        """
        Génère des questions d'entretien personnalisées avec Google Gemini
        
        Args:
            offer_title: Titre de l'offre d'emploi
            offer_description: Description détaillée du poste
            number_of_questions: Nombre de questions à générer (3-10)
            difficulty: Niveau de difficulté (easy/medium/hard)
        
        Returns:
            Liste de questions formatées pour JobGate
        """
        logger.info(f"🤖 Génération de {number_of_questions} questions avec Gemini")
        logger.info(f"📋 Poste: {offer_title}")
        logger.info(f"🎯 Difficulté: {difficulty}")
        
        # Validation des paramètres
        if not offer_title or len(offer_title.strip()) < 3:
            logger.error("❌ Titre de l'offre trop court")
            return self._get_fallback_questions(number_of_questions)
        
        if not offer_description or len(offer_description.strip()) < 20:
            logger.error("❌ Description de l'offre trop courte")
            return self._get_fallback_questions(number_of_questions)
        
        number_of_questions = max(3, min(10, number_of_questions))
        
        if self.model:
            try:
                return self._generate_with_gemini(offer_title, offer_description, 
                                                number_of_questions, difficulty)
            except Exception as e:
                logger.error(f"❌ Erreur Gemini: {e}")
                logger.info("🔄 Basculement vers le fallback")
                return self._get_fallback_questions(number_of_questions)
        else:
            logger.info("🔄 Utilisation du système de fallback")
            return self._get_fallback_questions(number_of_questions)
    
    def _generate_with_gemini(self, offer_title: str, offer_description: str, 
                             num_questions: int, difficulty: str) -> List[Dict[str, Any]]:
        """Génère les questions avec l'API Google Gemini"""
        
        # Mapping des difficultés
        difficulty_mapping = {
            'easy': 'débutant - questions générales et basiques',
            'medium': 'intermédiaire - questions techniques modérées', 
            'hard': 'avancé - questions techniques approfondies et cas complexes'
        }
        difficulty_desc = difficulty_mapping.get(difficulty, difficulty_mapping['medium'])
        
        # Prompt optimisé pour Gemini
        prompt = f"""
Vous êtes un expert en recrutement RH. Générez {num_questions} questions d'entretien vidéo professionnelles.

**POSTE À POURVOIR:**
Titre: {offer_title}
Description: {offer_description}

**INSTRUCTIONS:**
- Niveau de difficulté: {difficulty_desc}
- Questions adaptées spécifiquement à ce poste
- Mélange de questions techniques, comportementales et situationnelles
- Durée de réponse recommandée: 60-180 secondes par question
- Questions ouvertes permettant au candidat de démontrer ses compétences

**FORMAT DE RÉPONSE (OBLIGATOIRE - JSON strict):**
```json
[
  {{
    "question": "Votre question ici",
    "type": "technique|comportementale|situationnelle",
    "expected_duration": 120,
    "difficulty_level": "{difficulty}",
    "skills_assessed": ["compétence1", "compétence2"]
  }}
]
```

Générez exactement {num_questions} questions uniques et pertinentes.
"""
        
        try:
            logger.info("🔄 Envoi de la requête à Google Gemini...")
            
            # Génération avec Gemini
            response = self.model.generate_content(prompt)
            
            if not response or not response.text:
                logger.error("❌ Réponse vide de Gemini")
                return self._get_fallback_questions(num_questions)
            
            logger.info("✅ Réponse reçue de Gemini")
            
            # Extraction du JSON de la réponse
            questions_data = self._parse_gemini_response(response.text)
            
            if not questions_data:
                logger.error("❌ Impossible de parser la réponse Gemini")
                return self._get_fallback_questions(num_questions)
            
            # Validation et formatage
            formatted_questions = self._format_questions_for_jobgate(
                questions_data, offer_title, difficulty
            )
            
            logger.info(f"✅ {len(formatted_questions)} questions générées avec Gemini")
            return formatted_questions
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'appel Gemini: {e}")
            raise
    
    def _parse_gemini_response(self, response_text: str) -> Optional[List[Dict]]:
        """Parse la réponse JSON de Gemini"""
        try:
            # Chercher le bloc JSON dans la réponse
            json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
            if json_match:
                json_text = json_match.group(1)
            else:
                # Si pas de bloc markdown, essayer de parser directement
                json_text = response_text.strip()
            
            # Parser le JSON
            questions_data = json.loads(json_text)
            
            if isinstance(questions_data, list):
                return questions_data
            else:
                logger.error(f"❌ Format de réponse incorrect: {type(questions_data)}")
                return None
                
        except json.JSONDecodeError as e:
            logger.error(f"❌ Erreur JSON: {e}")
            logger.error(f"Réponse brute: {response_text[:500]}...")
            return None
        except Exception as e:
            logger.error(f"❌ Erreur parsing: {e}")
            return None
    
    def _format_questions_for_jobgate(self, questions_data: List[Dict], 
                                     offer_title: str, difficulty: str) -> List[Dict[str, Any]]:
        """Formate les questions pour l'API JobGate"""
        formatted_questions = []
        
        for i, q_data in enumerate(questions_data):
            try:
                question_text = q_data.get('question', '').strip()
                if not question_text:
                    continue
                
                formatted_question = {
                    "question": question_text,
                    "type": q_data.get('type', 'comportementale'),
                    "expected_duration": q_data.get('expected_duration', 120),
                    "difficulty_level": difficulty,
                    "skills_assessed": q_data.get('skills_assessed', []),
                    "order": i + 1,
                    "generated_by": "google_gemini",
                    "offer_title": offer_title
                }
                
                formatted_questions.append(formatted_question)
                
            except Exception as e:
                logger.error(f"❌ Erreur formatage question {i}: {e}")
                continue
        
        return formatted_questions
    
    def _get_fallback_questions(self, num_questions: int) -> List[Dict[str, Any]]:
        """Questions de fallback de haute qualité si Gemini n'est pas disponible"""
        
        fallback_questions = [
            {
                "question": "Pouvez-vous vous présenter en quelques minutes et expliquer pourquoi vous souhaitez rejoindre notre entreprise ?",
                "type": "comportementale",
                "expected_duration": 120,
                "difficulty_level": "easy",
                "skills_assessed": ["communication", "motivation"],
                "order": 1
            },
            {
                "question": "Décrivez-moi un projet professionnel dont vous êtes particulièrement fier. Quel était votre rôle et quels défis avez-vous surmontés ?",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["gestion de projet", "résolution de problèmes"],
                "order": 2
            },
            {
                "question": "Comment gérez-vous les priorités quand vous avez plusieurs tâches importantes à accomplir en même temps ?",
                "type": "comportementale",
                "expected_duration": 120,
                "difficulty_level": "medium",
                "skills_assessed": ["organisation", "gestion du temps"],
                "order": 3
            },
            {
                "question": "Parlez-moi d'une situation où vous avez dû apprendre rapidement une nouvelle technologie ou compétence. Comment avez-vous procédé ?",
                "type": "technique",
                "expected_duration": 150,
                "difficulty_level": "medium",
                "skills_assessed": ["apprentissage", "adaptabilité"],
                "order": 4
            },
            {
                "question": "Décrivez un conflit professionnel que vous avez vécu et comment vous l'avez résolu.",
                "type": "situationnelle",
                "expected_duration": 180,
                "difficulty_level": "hard",
                "skills_assessed": ["gestion des conflits", "communication"],
                "order": 5
            },
            {
                "question": "Quelles sont vos principales forces professionnelles et comment les mettriez-vous au service de notre équipe ?",
                "type": "comportementale",
                "expected_duration": 120,
                "difficulty_level": "easy",
                "skills_assessed": ["auto-évaluation", "collaboration"],
                "order": 6
            },
            {
                "question": "Où vous voyez-vous dans 3 ans et comment ce poste s'inscrit-il dans votre parcours professionnel ?",
                "type": "comportementale",
                "expected_duration": 120,
                "difficulty_level": "medium",
                "skills_assessed": ["vision", "ambition"],
                "order": 7
            }
        ]
        
        # Ajouter les métadonnées de fallback
        for question in fallback_questions[:num_questions]:
            question.update({
                "generated_by": "fallback_system",
                "offer_title": "Poste générique"
            })
        
        logger.info(f"🔄 Utilisation de {num_questions} questions de fallback")
        return fallback_questions[:num_questions]

# Instance globale pour l'utilisation dans les vues
ai_generator = AIInterviewQuestionGenerator()

# Fonction utilitaire pour l'analyse de qualité (bonus)
def analyze_question_quality(questions: List[Dict]) -> Dict[str, Any]:
    """Analyse la qualité des questions générées"""
    if not questions:
        return {"score": 0, "feedback": "Aucune question à analyser"}
    
    total_score = 0
    feedback = []
    
    # Critères d'évaluation
    question_types = set(q.get('type', '') for q in questions)
    if len(question_types) >= 2:
        total_score += 25
        feedback.append("✅ Bonne variété de types de questions")
    
    avg_duration = sum(q.get('expected_duration', 120) for q in questions) / len(questions)
    if 90 <= avg_duration <= 180:
        total_score += 25
        feedback.append("✅ Durée appropriée pour les réponses")
    
    if len(questions) >= 3:
        total_score += 25
        feedback.append("✅ Nombre de questions suffisant")
    
    has_skills = any(q.get('skills_assessed') for q in questions)
    if has_skills:
        total_score += 25
        feedback.append("✅ Compétences évaluées définies")
    
    return {
        "score": total_score,
        "feedback": feedback,
        "question_count": len(questions),
        "avg_duration": round(avg_duration),
        "question_types": list(question_types)
    }
