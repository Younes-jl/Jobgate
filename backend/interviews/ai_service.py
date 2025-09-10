import os
import json
import logging
import re
import random
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
        # Chercher la clé API dans plusieurs variables d'environnement
        self.api_key = (
            getattr(settings, 'GOOGLE_API_KEY', None) or 
            getattr(settings, 'GOOGLE_GEMINI_API_KEY', None) or 
            os.getenv('GOOGLE_API_KEY') or 
            os.getenv('GOOGLE_GEMINI_API_KEY')
        )
        self.use_gemini = getattr(settings, 'USE_GEMINI', True) or getattr(settings, 'USE_GOOGLE_GEMINI', True)
        
        # Banque de questions comportementales statiques
        self.static_behavioral_questions = [
            # TRAVAIL EN ÉQUIPE
            "Parle-moi d'une fois où tu as dû collaborer avec une équipe difficile. Comment as-tu géré la situation ?",
            "Donne un exemple d'un projet où ton rôle était crucial pour la réussite collective.",
            
            # GESTION DES CONFLITS
            "Raconte une situation où tu n'étais pas d'accord avec ton supérieur ou un collègue. Comment as-tu réagi ?",
            "Décris un conflit que tu as aidé à résoudre.",
            
            # PRISE D'INITIATIVE
            "Donne un exemple où tu as pris une décision sans attendre d'instructions.",
            "Parle-moi d'une amélioration que tu as proposée et mise en place dans ton travail.",
            
            # GESTION DU STRESS & DES PRIORITÉS
            "Raconte une expérience où tu as dû gérer plusieurs tâches urgentes en même temps.",
            "Comment as-tu réagi dans une situation de forte pression avec peu de temps ?",
            
            # RÉSOLUTION DE PROBLÈME
            "Donne un exemple d'un problème complexe que tu as résolu. Quelle a été ton approche ?",
            "Décris une situation où tu n'avais pas toutes les informations nécessaires mais tu as dû agir rapidement.",
            
            # ADAPTABILITÉ & APPRENTISSAGE
            "Parle-moi d'une fois où tu as dû apprendre une nouvelle compétence rapidement pour accomplir une mission.",
            "Comment t'es-tu adapté à un changement imprévu au travail ?"
        ]
        
        try:
            # Configuration Gemini
            if self.api_key:
                genai.configure(api_key=self.api_key)
            
            # Configuration de génération
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
                          number_of_questions: int = 5, difficulty: str = 'medium',
                          requirements: str = '', behavioral_count: int = None, 
                          technical_count: int = None, existing_questions_count: int = 0) -> List[Dict[str, Any]]:
        """
        Génère des questions d'entretien personnalisées avec Google Gemini
        """
        logger.info(f"🤖 Génération de {number_of_questions} questions avec Gemini")
        logger.info(f"📋 Poste: {offer_title}")
        logger.info(f"🎯 Difficulté: {difficulty}")
        logger.info(f"📊 Questions existantes: {existing_questions_count}")
        logger.info(f"🔧 Modèle initialisé: {self.model is not None}")
        logger.info(f"🔑 API Key présente: {self.api_key is not None}")
        
        # Calculer le nombre réel de questions à générer
        actual_questions_needed = max(0, number_of_questions - existing_questions_count)
        logger.info(f"🎯 Questions IA à générer: {actual_questions_needed} (demandé: {number_of_questions} - existantes: {existing_questions_count})")
        
        # Si aucune question à générer, retourner une liste vide
        if actual_questions_needed == 0:
            logger.info("✅ Aucune question à générer, questions existantes suffisantes")
            return []
        
        # Validation des paramètres
        if not offer_title or len(offer_title.strip()) < 3:
            logger.error("❌ Titre de l'offre trop court")
            raise ValueError("Le titre de l'offre doit contenir au moins 3 caractères")
        
        if not offer_description or len(offer_description.strip()) < 20:
            logger.error("❌ Description de l'offre trop courte")
            raise ValueError("La description de l'offre doit contenir au moins 20 caractères")
        
        # Gestion des compteurs spécifiques
        if behavioral_count is not None and technical_count is not None:
            logger.info(f"🎯 Mode compteurs spécifiques: {behavioral_count} comportementales + {technical_count} techniques")
            
            # Ajuster les compteurs selon les questions existantes et le nombre demandé
            total_requested = behavioral_count + technical_count
            if total_requested > actual_questions_needed:
                # Réduire proportionnellement
                ratio = actual_questions_needed / total_requested
                behavioral_count = int(behavioral_count * ratio)
                technical_count = actual_questions_needed - behavioral_count
            
            if behavioral_count + technical_count == 0:
                logger.info("⚠️ Aucune question IA demandée après ajustement")
                return []
            
            logger.info(f"🤖 Génération de {behavioral_count + technical_count} questions IA ajustées")
        else:
            # Mode classique - utiliser le nombre ajusté
            behavioral_count = max(1, actual_questions_needed // 2) if actual_questions_needed > 0 else 0
            technical_count = actual_questions_needed - behavioral_count
        
        # Construire la liste finale des questions (sans question obligatoire car elle existe déjà)
        final_questions = []
        
        # Ajouter les questions comportementales statiques si demandées
        if behavioral_count > 0:
            behavioral_questions = self._get_static_behavioral_questions(behavioral_count)
            final_questions.extend(behavioral_questions)
        
        # Générer les questions techniques avec l'IA si nécessaire
        if technical_count > 0:
            technical_questions = self._generate_technical_questions(
                offer_title, offer_description, technical_count, 
                difficulty, requirements
            )
            final_questions.extend(technical_questions)
        
        logger.info(f"✅ {len(final_questions)} questions générées au total")
        return final_questions
    
    def _get_static_behavioral_questions(self, count: int) -> List[Dict[str, Any]]:
        """Sélectionne aléatoirement des questions comportementales statiques"""
        logger.info(f"📋 Sélection de {count} questions comportementales statiques")
        
        # Sélection aléatoire sans répétition
        selected_questions = random.sample(self.static_behavioral_questions, min(count, len(self.static_behavioral_questions)))
        
        behavioral_questions = []
        for i, question_text in enumerate(selected_questions, 2):  # Start at 2 (after mandatory)
            question = {
                "question": question_text,
                "type": "comportementale",
                "difficulty": "medium",
                "expected_duration": 120,
                "skills_assessed": ["comportement", "expérience", "soft_skills"],
                "order": i,
                "generated_by": "static_behavioral"
            }
            behavioral_questions.append(question)
            logger.info(f"✅ Question comportementale {i}: {question_text[:50]}...")
        
        return behavioral_questions
    
    def _generate_technical_questions(self, offer_title: str, offer_description: str, 
                                    count: int, difficulty: str, requirements: str) -> List[Dict[str, Any]]:
        """Génère uniquement des questions techniques avec l'IA"""
        logger.info(f"🤖 Génération de {count} questions techniques avec IA")
        
        # Prompt spécialisé pour questions techniques uniquement
        prompt = f"""Tu es un expert RH spécialisé dans les entretiens techniques.

POSTE: {offer_title}
DESCRIPTION: {offer_description}
EXIGENCES: {requirements}
NIVEAU: {difficulty}

GÉNÈRE EXACTEMENT {count} QUESTIONS TECHNIQUES COURTES (1-2 lignes max).

FORMAT JSON STRICT:
[
  {{
    "question": "Question technique spécifique au poste",
    "type": "technique"
  }}
]

EXIGENCES:
- Questions TECHNIQUES uniquement (programmation, outils, méthodologies)
- Spécifiques au domaine du poste
- Courtes et précises
- Niveau {difficulty}
"""
        
        try:
            logger.info("🔄 Génération questions techniques avec Gemini...")
            response = self.model.generate_content(prompt)
            
            if not response or not response.text:
                raise ValueError("Réponse vide de Gemini")
            
            # Parse JSON
            questions_data = self._parse_json_response(response.text)
            
            # Formater les questions techniques
            technical_questions = []
            start_order = 2 + count  # After mandatory + behavioral questions
            
            for i, q_data in enumerate(questions_data[:count]):
                question = {
                    "question": q_data.get('question', ''),
                    "type": "technique",
                    "difficulty": "medium",
                    "expected_duration": 180,
                    "skills_assessed": ["technique"],
                    "order": start_order + i,
                    "generated_by": "ai_technical"
                }
                technical_questions.append(question)
                logger.info(f"✅ Question technique {start_order + i}: {question['question'][:50]}...")
            
            return technical_questions
            
        except Exception as e:
            logger.error(f"❌ Erreur génération questions techniques: {e}")
            # Fallback: questions techniques génériques
            return self._create_fallback_technical_questions(count, offer_title)
    
    def _parse_json_response(self, response_text: str) -> List[Dict]:
        """Parse la réponse JSON de l'IA"""
        try:
            # Nettoyer la réponse
            cleaned_text = response_text.strip()
            if cleaned_text.startswith('```json'):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.endswith('```'):
                cleaned_text = cleaned_text[:-3]
            
            # Parser JSON
            questions_data = json.loads(cleaned_text.strip())
            
            if not isinstance(questions_data, list):
                raise ValueError("La réponse doit être une liste")
            
            return questions_data
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Erreur parsing JSON: {e}")
            logger.error(f"Réponse brute: {response_text[:200]}...")
            raise ValueError("Format JSON invalide dans la réponse de l'IA")
    
    def _create_fallback_technical_questions(self, count: int, offer_title: str) -> List[Dict[str, Any]]:
        """Crée des questions techniques de fallback"""
        fallback_questions = [
            "Quelles sont les principales technologies que vous maîtrisez pour ce poste ?",
            "Comment abordez-vous la résolution d'un problème technique complexe ?",
            "Décrivez votre expérience avec les outils mentionnés dans l'offre.",
            "Quelles sont vos méthodes pour rester à jour techniquement ?",
            "Comment gérez-vous la qualité du code dans vos projets ?"
        ]
        
        technical_questions = []
        for i in range(min(count, len(fallback_questions))):
            question = {
                "question": fallback_questions[i],
                "type": "technique",
                "difficulty": "medium",
                "expected_duration": 180,
                "skills_assessed": ["technique"],
                "order": i + 2,
                "generated_by": "fallback_technical"
            }
            technical_questions.append(question)
        
        return technical_questions


def analyze_question_quality(questions: List[Dict[str, Any]], offer_title: str, requirements: str) -> Dict[str, Any]:
    """
    Analyse la qualité des questions générées pour un poste donné
    
    Args:
        questions: Liste des questions à analyser
        offer_title: Titre du poste
        requirements: Exigences du poste
    
    Returns:
        Dict contenant l'analyse de qualité
    """
    logger.info(f"🔍 Analyse de qualité pour {len(questions)} questions")
    
    analysis = {
        "total_questions": len(questions),
        "behavioral_count": len([q for q in questions if q.get('type') == 'comportementale']),
        "technical_count": len([q for q in questions if q.get('type') == 'technique']),
        "quality_score": 85,  # Score par défaut pour les questions statiques
        "recommendations": [],
        "strengths": [
            "Questions comportementales basées sur des situations concrètes",
            "Format cohérent et professionnel",
            "Durées d'entretien appropriées"
        ]
    }
    
    # Vérifications de base
    if analysis["behavioral_count"] == 0:
        analysis["recommendations"].append("Ajouter des questions comportementales pour évaluer les soft skills")
        analysis["quality_score"] -= 10
    
    if analysis["technical_count"] == 0 and "technique" in offer_title.lower():
        analysis["recommendations"].append("Ajouter des questions techniques pour ce poste technique")
        analysis["quality_score"] -= 5
    
    # Questions obligatoires
    mandatory_found = any("présentez-vous" in q.get('question', '').lower() for q in questions)
    if mandatory_found:
        analysis["strengths"].append("Question de présentation obligatoire présente")
    else:
        analysis["recommendations"].append("Ajouter la question de présentation obligatoire")
        analysis["quality_score"] -= 15
    
    logger.info(f"✅ Analyse terminée - Score: {analysis['quality_score']}/100")
    return analysis
