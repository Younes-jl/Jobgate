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
        
        # Générer les questions comportementales avec l'IA si demandées
        if behavioral_count > 0:
            behavioral_questions = self._generate_behavioral_questions(
                offer_title, offer_description, behavioral_count, 
                difficulty, requirements
            )
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
    
    
    def _generate_behavioral_questions(self, offer_title: str, offer_description: str, 
                                     count: int, difficulty: str, requirements: str) -> List[Dict[str, Any]]:
        """Génère des questions comportementales avec l'IA"""
        logger.info(f"🤖 Génération de {count} questions comportementales avec IA")
        
        # Vérifier si l'IA est disponible
        if not self.use_gemini or not self.api_key or not self.model:
            logger.error("❌ IA indisponible - impossible de générer des questions comportementales")
            raise ValueError("L'IA Gemini est requise pour générer des questions comportementales. Vérifiez votre configuration API.")
        
        prompt = f"""Tu es un expert RH spécialisé dans les entretiens comportementaux.

POSTE: {offer_title}
DESCRIPTION: {offer_description}
EXIGENCES: {requirements}
NIVEAU: {difficulty}

GÉNÈRE EXACTEMENT {count} QUESTIONS COMPORTEMENTALES COURTES (1-2 lignes max).

FORMAT JSON STRICT:
[
  {{
    "question": "Question comportementale spécifique au poste",
    "type": "comportementale"
  }}
]

EXIGENCES:
- Questions COMPORTEMENTALES uniquement (soft skills, expériences, situations)
- Adaptées au poste et au secteur
- Courtes et précises
- Niveau {difficulty}
- Focus sur leadership, communication, résolution de problèmes, travail d'équipe
"""
        
        try:
            logger.info("🔄 Génération questions comportementales avec Gemini...")
            response = self.model.generate_content(prompt)
            
            if not response or not response.text:
                raise ValueError("Réponse vide de Gemini")
            
            questions_data = self._parse_json_response(response.text)
            
            behavioral_questions = []
            for i, q_data in enumerate(questions_data[:count]):
                question = {
                    "question": q_data.get('question', ''),
                    "type": "comportementale",
                    "difficulty": "medium",
                    "expected_duration": 120,
                    "skills_assessed": ["communication", "leadership", "problem_solving"],
                    "order": i + 1,
                    "generated_by": "ai_behavioral"
                }
                behavioral_questions.append(question)
                logger.info(f"✅ Question comportementale {i + 1}: {question['question'][:50]}...")
            
            return behavioral_questions
            
        except Exception as e:
            logger.error(f"❌ Erreur génération questions comportementales: {e}")
            # Relancer l'erreur sans fallback - IA obligatoire
            raise ValueError(f"Impossible de générer des questions comportementales avec l'IA: {str(e)}")
    
    def _generate_technical_questions(self, offer_title: str, offer_description: str, 
                                    count: int, difficulty: str, requirements: str) -> List[Dict[str, Any]]:
        """Génère uniquement des questions techniques avec l'IA"""
        logger.info(f"🤖 Génération de {count} questions techniques avec IA")
        
        # Vérifier si l'IA est disponible
        if not self.use_gemini or not self.api_key or not self.model:
            logger.error("❌ IA indisponible - impossible de générer des questions techniques")
            raise ValueError("L'IA Gemini est requise pour générer des questions techniques. Vérifiez votre configuration API.")
        
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
            # Relancer l'erreur sans fallback - IA obligatoire
            raise ValueError(f"Impossible de générer des questions techniques avec l'IA: {str(e)}")
    
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


    def _get_static_technical_questions(self, count: int, offer_title: str) -> List[Dict[str, Any]]:
        """Génère des questions techniques statiques basées sur le titre du poste"""
        logger.info(f"📋 Génération de {count} questions techniques statiques pour: {offer_title}")
        
        # Questions techniques par domaine
        technical_questions_by_domain = {
            # Développement Web
            "développeur": [
                "Expliquez la différence entre les méthodes GET et POST en HTTP.",
                "Comment optimisez-vous les performances d'une application web ?",
                "Décrivez votre approche pour sécuriser une API REST.",
                "Quelles sont les bonnes pratiques pour la gestion des erreurs en programmation ?",
                "Comment gérez-vous les versions de votre code et les déploiements ?"
            ],
            "frontend": [
                "Expliquez le concept de Virtual DOM et ses avantages.",
                "Comment optimisez-vous le temps de chargement d'une page web ?",
                "Décrivez votre approche pour rendre une application responsive.",
                "Quelles sont vos méthodes de test pour les interfaces utilisateur ?",
                "Comment gérez-vous l'état dans une application JavaScript moderne ?"
            ],
            "backend": [
                "Expliquez les principes d'une architecture microservices.",
                "Comment concevez-vous une base de données pour une application scalable ?",
                "Décrivez votre approche pour la gestion des sessions utilisateur.",
                "Quelles sont vos stratégies pour optimiser les requêtes de base de données ?",
                "Comment implémentez-vous la sécurité dans une API ?"
            ],
            # Data Science / IA
            "data": [
                "Expliquez la différence entre apprentissage supervisé et non supervisé.",
                "Comment évaluez-vous la performance d'un modèle de machine learning ?",
                "Décrivez votre processus de nettoyage et préparation des données.",
                "Quelles sont vos méthodes pour éviter le surapprentissage ?",
                "Comment choisissez-vous l'algorithme approprié pour un problème donné ?"
            ],
            # DevOps / Infrastructure
            "devops": [
                "Expliquez les principes de l'intégration continue (CI/CD).",
                "Comment gérez-vous la scalabilité d'une infrastructure cloud ?",
                "Décrivez votre approche pour la surveillance et le monitoring.",
                "Quelles sont vos stratégies de sauvegarde et récupération ?",
                "Comment automatisez-vous les déploiements d'applications ?"
            ],
            # Cybersécurité
            "sécurité": [
                "Expliquez les principales vulnérabilités web (OWASP Top 10).",
                "Comment implémentez-vous l'authentification multi-facteurs ?",
                "Décrivez votre approche pour sécuriser les communications réseau.",
                "Quelles sont vos méthodes de détection d'intrusion ?",
                "Comment gérez-vous les incidents de sécurité ?"
            ],
            # Questions génériques techniques
            "générique": [
                "Décrivez votre processus de résolution d'un bug complexe.",
                "Comment restez-vous à jour avec les nouvelles technologies ?",
                "Expliquez votre approche pour documenter votre code.",
                "Quelles sont vos méthodes de test et validation ?",
                "Comment collaborez-vous avec une équipe technique ?"
            ]
        }
        
        # Déterminer le domaine basé sur le titre de l'offre
        offer_lower = offer_title.lower()
        selected_domain = "générique"  # Par défaut
        
        for domain, questions in technical_questions_by_domain.items():
            if domain in offer_lower:
                selected_domain = domain
                break
        
        # Sélectionner les questions appropriées
        available_questions = technical_questions_by_domain[selected_domain]
        selected_questions = available_questions[:count] if count <= len(available_questions) else available_questions
        
        # Si pas assez de questions dans le domaine, compléter avec des génériques
        if len(selected_questions) < count:
            remaining_needed = count - len(selected_questions)
            generic_questions = technical_questions_by_domain["générique"][:remaining_needed]
            selected_questions.extend(generic_questions)
        
        # Formater les questions
        technical_questions = []
        for i, question_text in enumerate(selected_questions):
            question = {
                "question": question_text,
                "type": "technique",
                "difficulty": "medium",
                "expected_duration": 180,
                "skills_assessed": ["technique", selected_domain],
                "order": i + 2,
                "generated_by": f"static_technical_{selected_domain}"
            }
            technical_questions.append(question)
            logger.info(f"✅ Question technique statique {i + 2}: {question_text[:50]}...")
        
        logger.info(f"✅ {len(technical_questions)} questions techniques statiques générées (domaine: {selected_domain})")
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
