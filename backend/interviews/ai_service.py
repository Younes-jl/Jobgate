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
            logger.info(f"🔑 Clé API détectée: {self.api_key[:10]}...")
            self._initialize_gemini()
        else:
            logger.warning(f"🔄 Google Gemini non configuré - API Key: {self.api_key}, Use Gemini: {self.use_gemini}")
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
                          number_of_questions: int = 5, difficulty: str = 'medium',
                          requirements: str = '', behavioral_count: int = None, 
                          technical_count: int = None) -> List[Dict[str, Any]]:
        """
        Génère des questions d'entretien personnalisées avec Google Gemini
        
        Args:
            offer_title: Titre de l'offre d'emploi
            offer_description: Description détaillée du poste
            number_of_questions: Nombre de questions à générer (3-10)
            difficulty: Niveau de difficulté (easy/medium/hard)
            requirements: Prérequis et compétences requises pour le poste
        
        Returns:
            Liste de questions formatées pour JobGate
        """
        logger.info(f"🤖 Génération de {number_of_questions} questions avec Gemini")
        logger.info(f"📋 Poste: {offer_title}")
        logger.info(f"🎯 Difficulté: {difficulty}")
        logger.info(f"🔧 Modèle initialisé: {self.model is not None}")
        logger.info(f"🔑 API Key présente: {self.api_key is not None}")
        
        # Validation des paramètres
        if not offer_title or len(offer_title.strip()) < 3:
            logger.error("❌ Titre de l'offre trop court")
            return self._get_fallback_questions(number_of_questions, offer_title, requirements)
        
        if not offer_description or len(offer_description.strip()) < 20:
            logger.error("❌ Description de l'offre trop courte")
            return self._get_fallback_questions(number_of_questions, offer_title, requirements)
        
        number_of_questions = max(3, min(10, number_of_questions))
        
        if self.model:
            try:
                return self._generate_with_gemini(offer_title, offer_description, 
                                                number_of_questions, difficulty, requirements)
            except Exception as e:
                logger.error(f"❌ Erreur Gemini: {e}")
                logger.error(f"❌ Détails de l'erreur: {str(e)}")
                logger.info("🔄 Basculement vers le fallback")
                return self._get_fallback_questions(number_of_questions, offer_title, requirements, behavioral_count, technical_count)
        else:
            logger.info("🔄 Utilisation du système de fallback")
            return self._get_fallback_questions(number_of_questions, offer_title, requirements, behavioral_count, technical_count)
    
    def _generate_with_gemini(self, offer_title: str, offer_description: str, 
                             num_questions: int, difficulty: str, requirements: str = '') -> List[Dict[str, Any]]:
        """Génère les questions avec l'API Google Gemini"""
        
        # Mapping des difficultés
        difficulty_mapping = {
            'easy': 'débutant - questions générales et basiques',
            'medium': 'intermédiaire - questions techniques modérées', 
            'hard': 'avancé - questions techniques approfondies et cas complexes'
        }
        difficulty_desc = difficulty_mapping.get(difficulty, difficulty_mapping['medium'])
        
        # Extraction des mots-clés de l'offre pour personnalisation
        keywords = self._extract_job_keywords(offer_title, offer_description, requirements)
        
        # Extraction spécifique du nom du poste et des prérequis
        job_analysis = self._analyze_job_offer(offer_title, requirements)
        
        # Prompt optimisé pour Gemini avec personnalisation poussée
        prompt = f"""
Vous êtes un expert en recrutement RH spécialisé dans le secteur du poste "{offer_title}".

**ANALYSE DU POSTE:**
Titre: {offer_title}
Description complète: {offer_description}
Prérequis/Compétences requises: {requirements if requirements else 'Non spécifiés'}
Mots-clés identifiés: {', '.join(keywords)}
Analyse du poste: {job_analysis}

**MISSION:**
Créez {num_questions} questions d'entretien vidéo ULTRA-PERSONNALISÉES pour ce poste spécifique.

**RÈGLES STRICTES - INTERDICTION DE QUESTIONS GÉNÉRIQUES:**
1. JAMAIS de questions génériques comme "Présentez-vous" ou "Où vous voyez-vous dans 3 ans"
2. Chaque question DOIT mentionner explicitement le poste "{offer_title}" ou ses technologies
3. Utilisez OBLIGATOIREMENT les mots-clés identifiés: {', '.join(keywords)}
4. Niveau: {difficulty_desc}
5. Si MLOps/ML → Questions sur pipelines, déploiement de modèles, monitoring
6. Si développement → Questions sur les frameworks/langages spécifiques
7. Si data → Questions sur traitement de données, algorithmes

**EXEMPLES OBLIGATOIRES POUR MLOPS:**
- "Comment structureriez-vous un pipeline MLOps pour déployer un modèle de machine learning en production ?"
- "Décrivez votre approche pour monitorer la dérive des données dans un système MLOps"
- "Comment gérez-vous le versioning des modèles ML et des datasets dans vos projets ?"

**EXEMPLES POUR DÉVELOPPEMENT:**
- "Expliquez votre approche pour optimiser les performances d'une application React"
- "Comment implémenteriez-vous une architecture microservices avec Docker et Kubernetes ?"

**FORMAT JSON OBLIGATOIRE:**
```json
[
  {{
    "question": "Question ultra-spécifique au poste avec contexte réel",
    "type": "technique|comportementale|situationnelle",
    "expected_duration": 120,
    "difficulty_level": "{difficulty}",
    "skills_assessed": ["compétence_exacte_du_poste", "autre_compétence"],
    "job_relevance": "Explication de pourquoi cette question est parfaite pour ce poste"
  }}
]
```

IMPORTANT: Si vous générez des questions génériques, vous échouez complètement. Chaque question doit prouver que vous avez lu et compris cette offre spécifique "{offer_title}".

Générez {num_questions} questions techniques et spécialisées maintenant.
"""
        
        try:
            logger.info("🔄 Envoi de la requête à Google Gemini...")
            
            # Génération avec Gemini
            response = self.model.generate_content(prompt)
            
            if not response or not response.text:
                logger.error("❌ Réponse vide de Gemini")
                return self._get_fallback_questions(num_questions, offer_title, requirements)
            
            logger.info("✅ Réponse reçue de Gemini")
            
            # Extraction du JSON de la réponse
            questions_data = self._parse_gemini_response(response.text)
            
            if not questions_data:
                logger.error("❌ Impossible de parser la réponse Gemini")
                return self._get_fallback_questions(num_questions, offer_title, requirements)
            
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
    
    def _analyze_job_offer(self, title: str, requirements: str) -> str:
        """Analyse le poste et les prérequis pour générer un contexte précis"""
        
        # Analyse du titre du poste
        title_lower = title.lower()
        job_type = "généraliste"
        
        if any(keyword in title_lower for keyword in ['mlops', 'ml ops', 'machine learning ops']):
            job_type = "MLOps Engineer - Spécialiste en déploiement et opérationnalisation de modèles ML"
        elif any(keyword in title_lower for keyword in ['data scientist', 'data science']):
            job_type = "Data Scientist - Expert en analyse de données et modélisation"
        elif any(keyword in title_lower for keyword in ['développeur', 'developer', 'dev']):
            if 'react' in title_lower or 'frontend' in title_lower:
                job_type = "Développeur Frontend - Spécialiste interfaces utilisateur"
            elif 'backend' in title_lower or 'api' in title_lower:
                job_type = "Développeur Backend - Architecte serveur et APIs"
            else:
                job_type = "Développeur Full Stack - Expert développement complet"
        elif any(keyword in title_lower for keyword in ['devops', 'sre', 'infrastructure']):
            job_type = "DevOps/SRE - Spécialiste infrastructure et déploiement"
        
        # Analyse des prérequis
        req_analysis = ""
        if requirements:
            req_lower = requirements.lower()
            tech_found = []
            
            # Technologies détectées
            if 'python' in req_lower: tech_found.append('Python')
            if 'react' in req_lower: tech_found.append('React')
            if 'docker' in req_lower: tech_found.append('Docker')
            if 'kubernetes' in req_lower: tech_found.append('Kubernetes')
            if 'aws' in req_lower: tech_found.append('AWS')
            if 'tensorflow' in req_lower: tech_found.append('TensorFlow')
            if 'mlflow' in req_lower: tech_found.append('MLflow')
            
            if tech_found:
                req_analysis = f"Technologies requises: {', '.join(tech_found)}. "
        
        return f"{job_type}. {req_analysis}"
    
    def _extract_job_keywords(self, title: str, description: str, requirements: str = '') -> List[str]:
        """Extrait les mots-clés techniques et métier de l'offre d'emploi"""
        import re
        
        # Combinaison titre + description + prérequis pour analyse
        full_text = f"{title} {description} {requirements}".lower()
        
        # Dictionnaire de mots-clés par domaine
        tech_keywords = [
            # Développement
            'python', 'javascript', 'react', 'angular', 'vue', 'node', 'django', 'flask',
            'java', 'spring', 'php', 'laravel', 'symfony', 'ruby', 'rails', 'go', 'rust',
            'html', 'css', 'sass', 'typescript', 'jquery', 'bootstrap', 'tailwind',
            # Base de données
            'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
            # Cloud & DevOps
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'gitlab', 'github',
            'terraform', 'ansible', 'linux', 'ubuntu', 'centos',
            # Mobile
            'android', 'ios', 'flutter', 'react native', 'swift', 'kotlin',
            # Data & MLOps
            'machine learning', 'ml', 'ia', 'ai', 'data science', 'pandas', 'numpy', 'tensorflow',
            'pytorch', 'spark', 'hadoop', 'tableau', 'power bi', 'mlops', 'mlflow', 'kubeflow',
            'airflow', 'dvc', 'wandb', 'weights', 'biases', 'model', 'deployment', 'pipeline',
            'feature', 'engineering', 'scikit-learn', 'xgboost', 'lightgbm', 'catboost',
            'jupyter', 'notebook', 'conda', 'pip', 'virtual', 'environment',
            # Autres
            'api', 'rest', 'graphql', 'microservices', 'agile', 'scrum', 'kanban',
            'git', 'jira', 'confluence', 'slack', 'teams'
        ]
        
        # Mots-clés métier et soft skills
        business_keywords = [
            'gestion', 'management', 'équipe', 'projet', 'client', 'commercial', 'vente',
            'marketing', 'communication', 'design', 'ux', 'ui', 'créativité', 'innovation',
            'startup', 'entreprise', 'pme', 'grand groupe', 'international', 'remote',
            'télétravail', 'hybride', 'autonomie', 'leadership', 'collaboration'
        ]
        
        found_keywords = []
        
        # Recherche des mots-clés techniques
        for keyword in tech_keywords:
            if keyword in full_text:
                found_keywords.append(keyword)
        
        # Recherche des mots-clés métier
        for keyword in business_keywords:
            if keyword in full_text:
                found_keywords.append(keyword)
        
        # Extraction de mots-clés supplémentaires par regex
        # Recherche de technologies entre guillemets ou en majuscules
        tech_pattern = r'\b[A-Z]{2,}\b|"([^"]+)"'
        additional_keywords = re.findall(tech_pattern, full_text.upper())
        for match in additional_keywords:
            if isinstance(match, tuple):
                found_keywords.extend([k.strip().lower() for k in match if k.strip()])
            else:
                if len(match) > 1 and match not in found_keywords:
                    found_keywords.append(match.lower())
        
        # Limiter à 10 mots-clés les plus pertinents
        return list(set(found_keywords))[:10]
    
    def _get_fallback_questions(self, num_questions: int = 5, offer_title: str = '', requirements: str = '', behavioral_count: int = None, technical_count: int = None) -> List[Dict[str, Any]]:
        """Questions de fallback intelligentes pour tous les secteurs d'emploi au Maroc"""
        
        # Questions Ingénierie Civile
        civil_engineering_questions = [
            {
                "question": "Décrivez votre approche pour la conception d'un projet de construction en tenant compte des normes marocaines.",
                "type": "technique",
                "expected_duration": 300,
                "difficulty_level": "hard",
                "skills_assessed": ["conception", "normes_marocaines", "construction"],
                "order": 1
            },
            {
                "question": "Comment évaluez-vous la résistance des matériaux dans un environnement climatique marocain ?",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "medium",
                "skills_assessed": ["matériaux", "climat", "résistance"],
                "order": 2
            },
            {
                "question": "Expliquez votre méthode de gestion de projet pour un chantier de grande envergure.",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["gestion_projet", "chantier", "planification"],
                "order": 3
            }
        ]
        
        # Questions Ingénierie Électrique/Électronique
        electrical_engineering_questions = [
            {
                "question": "Comment concevez-vous un système électrique pour un bâtiment industriel en respectant les normes NM ?",
                "type": "technique",
                "expected_duration": 300,
                "difficulty_level": "hard",
                "skills_assessed": ["conception_électrique", "normes_NM", "industriel"],
                "order": 1
            },
            {
                "question": "Décrivez votre approche pour l'optimisation énergétique dans les installations électriques.",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "medium",
                "skills_assessed": ["efficacité_énergétique", "optimisation", "installations"],
                "order": 2
            },
            {
                "question": "Comment diagnostiquez-vous et résolvez-vous les pannes dans les systèmes électroniques complexes ?",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["diagnostic", "dépannage", "électronique"],
                "order": 3
            }
        ]
        
        # Questions Ingénierie Mécanique
        mechanical_engineering_questions = [
            {
                "question": "Expliquez votre processus de conception d'une pièce mécanique depuis le cahier des charges jusqu'à la production.",
                "type": "technique",
                "expected_duration": 300,
                "difficulty_level": "hard",
                "skills_assessed": ["conception_mécanique", "CAO", "production"],
                "order": 1
            },
            {
                "question": "Comment optimisez-vous les performances d'un système mécanique en termes de rendement et durabilité ?",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "medium",
                "skills_assessed": ["optimisation", "rendement", "durabilité"],
                "order": 2
            },
            {
                "question": "Décrivez votre approche pour la maintenance préventive des équipements industriels.",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["maintenance", "préventif", "industriel"],
                "order": 3
            }
        ]
        
        # Questions Économie et Finance
        economics_finance_questions = [
            {
                "question": "Analysez l'impact des politiques économiques marocaines actuelles sur le secteur privé.",
                "type": "technique",
                "expected_duration": 300,
                "difficulty_level": "hard",
                "skills_assessed": ["analyse_économique", "politiques_publiques", "secteur_privé"],
                "order": 1
            },
            {
                "question": "Comment évaluez-vous la rentabilité d'un investissement dans le contexte économique marocain ?",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "medium",
                "skills_assessed": ["analyse_financière", "investissement", "rentabilité"],
                "order": 2
            },
            {
                "question": "Décrivez votre approche pour la gestion des risques financiers dans une entreprise.",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["gestion_risques", "finance", "entreprise"],
                "order": 3
            },
            {
                "question": "Expliquez les mécanismes de financement disponibles pour les PME au Maroc.",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["financement", "PME", "marché_marocain"],
                "order": 4
            }
        ]
        
        # Questions Enseignement et Éducation
        education_questions = [
            {
                "question": "Comment adaptez-vous vos méthodes pédagogiques aux différents profils d'apprenants ?",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "medium",
                "skills_assessed": ["pédagogie", "adaptation", "différenciation"],
                "order": 1
            },
            {
                "question": "Décrivez votre approche pour évaluer les progrès des étudiants de manière équitable.",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["évaluation", "équité", "progrès"],
                "order": 2
            },
            {
                "question": "Comment intégrez-vous les technologies numériques dans votre enseignement ?",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["numérique", "innovation_pédagogique", "technologie"],
                "order": 3
            },
            {
                "question": "Expliquez votre méthode pour gérer une classe difficile et maintenir un environnement d'apprentissage positif.",
                "type": "comportementale",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["gestion_classe", "autorité", "environnement_positif"],
                "order": 4
            }
        ]
        
        # Questions MLOps et Data Science
        mlops_questions = [
            {
                "question": "Comment structureriez-vous un pipeline MLOps complet pour déployer un modèle de machine learning en production ?",
                "type": "technique",
                "expected_duration": 300,
                "difficulty_level": "hard",
                "skills_assessed": ["mlops", "architecture", "déploiement"],
                "order": 1
            },
            {
                "question": "Décrivez votre approche pour monitorer la dérive des données (data drift) et la performance d'un modèle en production.",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "hard",
                "skills_assessed": ["monitoring", "data_drift", "mlops"],
                "order": 2
            },
            {
                "question": "Comment gérez-vous le versioning des modèles ML et des datasets dans vos projets ?",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["versioning", "mlflow", "git"],
                "order": 3
            }
        ]
        
        # Questions Développement Logiciel
        dev_questions = [
            {
                "question": "Décrivez votre approche pour optimiser les performances d'une application web avec une forte charge utilisateur.",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "hard",
                "skills_assessed": ["performance", "scalabilité", "architecture"],
                "order": 1
            },
            {
                "question": "Comment implémentez-vous la sécurité dans vos applications (authentification, autorisation, protection des données) ?",
                "type": "technique",
                "expected_duration": 300,
                "difficulty_level": "medium",
                "skills_assessed": ["sécurité", "authentification", "protection_données"],
                "order": 2
            },
            {
                "question": "Expliquez votre processus de débogage pour identifier et résoudre un bug complexe en production.",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["débogage", "troubleshooting", "production"],
                "order": 3
            }
        ]
        
        # Questions Marketing et Communication
        marketing_questions = [
            {
                "question": "Comment développez-vous une stratégie marketing adaptée au marché marocain ?",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "medium",
                "skills_assessed": ["stratégie_marketing", "marché_local", "adaptation"],
                "order": 1
            },
            {
                "question": "Décrivez votre approche pour mesurer l'efficacité d'une campagne publicitaire.",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["mesure_performance", "ROI", "analytics"],
                "order": 2
            },
            {
                "question": "Comment gérez-vous la communication de crise sur les réseaux sociaux ?",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["communication_crise", "réseaux_sociaux", "gestion_réputation"],
                "order": 3
            }
        ]
        
        # Questions Ressources Humaines
        hr_questions = [
            {
                "question": "Comment menez-vous un processus de recrutement équitable et efficace ?",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "medium",
                "skills_assessed": ["recrutement", "équité", "processus"],
                "order": 1
            },
            {
                "question": "Décrivez votre approche pour gérer un conflit entre employés.",
                "type": "comportementale",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["gestion_conflits", "médiation", "relations_humaines"],
                "order": 2
            },
            {
                "question": "Comment développez-vous un plan de formation pour les employés ?",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["formation", "développement", "planification"],
                "order": 3
            }
        ]
        
        # Questions génériques professionnelles
        generic_questions = [
            {
                "question": "Décrivez un projet professionnel dont vous êtes particulièrement fier et expliquez votre rôle.",
                "type": "comportementale",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["communication", "accomplissement"],
                "order": 1
            },
            {
                "question": "Comment gérez-vous les priorités lorsque vous avez plusieurs tâches urgentes à accomplir ?",
                "type": "comportementale",
                "expected_duration": 120,
                "difficulty_level": "medium",
                "skills_assessed": ["gestion_temps", "priorisation"],
                "order": 2
            },
            {
                "question": "Décrivez une situation où vous avez dû apprendre rapidement une nouvelle technologie ou compétence.",
                "type": "comportementale",
                "expected_duration": 150,
                "difficulty_level": "medium",
                "skills_assessed": ["apprentissage", "adaptabilité"],
                "order": 3
            },
            {
                "question": "Comment travaillez-vous en équipe et comment gérez-vous les conflits ou désaccords ?",
                "type": "comportementale",
                "expected_duration": 150,
                "difficulty_level": "medium",
                "skills_assessed": ["travail_équipe", "communication"],
                "order": 4
            },
            {
                "question": "Quels sont vos objectifs de carrière à court et long terme ?",
                "type": "comportementale",
                "expected_duration": 120,
                "difficulty_level": "easy",
                "skills_assessed": ["motivation", "vision"],
                "order": 5
            }
        ]
        
        # Sélection intelligente des questions selon le type de poste
        title_lower = offer_title.lower() if offer_title else ""
        requirements_lower = requirements.lower() if requirements else ""
        combined_text = f"{title_lower} {requirements_lower}"
        
        # Détection du secteur d'emploi
        if any(keyword in combined_text for keyword in ['ingénieur civil', 'génie civil', 'btp', 'construction', 'bâtiment']):
            selected_questions = civil_engineering_questions + generic_questions[:2]
            sector = "Ingénierie Civile"
        elif any(keyword in combined_text for keyword in ['ingénieur électrique', 'électricien', 'électronique', 'électrotechnique']):
            selected_questions = electrical_engineering_questions + generic_questions[:2]
            sector = "Ingénierie Électrique"
        elif any(keyword in combined_text for keyword in ['ingénieur mécanique', 'mécanique', 'maintenance', 'production']):
            selected_questions = mechanical_engineering_questions + generic_questions[:2]
            sector = "Ingénierie Mécanique"
        elif any(keyword in combined_text for keyword in ['économiste', 'économie', 'finance', 'banque', 'comptabilité', 'audit']):
            selected_questions = economics_finance_questions + generic_questions[:1]
            sector = "Économie et Finance"
        elif any(keyword in combined_text for keyword in ['enseignant', 'professeur', 'éducation', 'formation', 'pédagogie']):
            selected_questions = education_questions + generic_questions[:1]
            sector = "Enseignement et Éducation"
        elif any(keyword in combined_text for keyword in ['mlops', 'ml ops', 'machine learning', 'data scientist', 'ia']):
            selected_questions = mlops_questions + generic_questions[:2]
            sector = "MLOps et Data Science"
        elif any(keyword in combined_text for keyword in ['développeur', 'developer', 'dev', 'programmeur', 'logiciel']):
            selected_questions = dev_questions + generic_questions[:2]
            sector = "Développement Logiciel"
        elif any(keyword in combined_text for keyword in ['marketing', 'communication', 'publicité', 'commercial']):
            selected_questions = marketing_questions + generic_questions[:2]
            sector = "Marketing et Communication"
        elif any(keyword in combined_text for keyword in ['rh', 'ressources humaines', 'recrutement', 'hr']):
            selected_questions = hr_questions + generic_questions[:2]
            sector = "Ressources Humaines"
        else:
            selected_questions = generic_questions
            sector = "Généraliste"
        
        # Ordonnancement intelligent des questions
        final_questions = self._order_questions_intelligently(selected_questions, num_questions, sector, behavioral_count, technical_count)
        
        # Ajouter les métadonnées de fallback
        for i, question in enumerate(final_questions):
            question.update({
                "generated_by": "intelligent_fallback",
                "offer_title": offer_title or "Poste générique",
                "sector": sector,
                "order": i + 1
            })
        
        logger.info(f"🎯 Utilisation des questions {sector} pour {offer_title}")
        logger.info(f"🔄 Utilisation de {len(final_questions)} questions ordonnées intelligemment")
        return final_questions
    
    def _order_questions_intelligently(self, questions: List[Dict], num_questions: int, sector: str, 
                                      behavioral_count: int = None, technical_count: int = None) -> List[Dict[str, Any]]:
        """Ordonne les questions de manière intelligente selon le secteur et la progression"""
        
        if not questions or num_questions <= 0:
            return []
        
        # Séparer les questions par type
        technical_questions = [q for q in questions if q.get('type') == 'technique']
        behavioral_questions = [q for q in questions if q.get('type') == 'comportementale']
        situational_questions = [q for q in questions if q.get('type') == 'situationnelle']
        
        # Séparer par difficulté
        easy_questions = [q for q in questions if q.get('difficulty_level') == 'easy']
        medium_questions = [q for q in questions if q.get('difficulty_level') == 'medium']
        hard_questions = [q for q in questions if q.get('difficulty_level') == 'hard']
        
        ordered_questions = []
        
        # Utiliser les ratios spécifiés par l'utilisateur si fournis
        if behavioral_count is not None and technical_count is not None:
            target_behavioral = min(behavioral_count, len(behavioral_questions))
            target_technical = min(technical_count, len(technical_questions))
            
            # Sélectionner les questions selon les ratios demandés
            selected_behavioral = behavioral_questions[:target_behavioral]
            selected_technical = technical_questions[:target_technical]
            
            # Alterner intelligemment les questions
            ordered_questions = []
            max_questions = max(len(selected_behavioral), len(selected_technical))
            
            for i in range(max_questions):
                # Commencer par comportementale pour mettre en confiance
                if i < len(selected_behavioral):
                    ordered_questions.append(selected_behavioral[i])
                if i < len(selected_technical):
                    ordered_questions.append(selected_technical[i])
            
            # Limiter au nombre total demandé
            final_ordered = ordered_questions[:num_questions]
            
            logger.info(f"📊 Ratio personnalisé: {len([q for q in final_ordered if q.get('type') == 'comportementale'])} comportementales, {len([q for q in final_ordered if q.get('type') == 'technique'])} techniques")
            
        else:
            # Stratégie d'ordonnancement automatique selon le nombre de questions
            if num_questions <= 3:
                # Pour 3 questions ou moins : 1 comportementale + 2 techniques
                if behavioral_questions:
                    ordered_questions.append(behavioral_questions[0])
                if technical_questions:
                    ordered_questions.extend(technical_questions[:2])
                    
            elif num_questions <= 5:
                # Pour 5 questions : Alternance comportementale/technique avec progression de difficulté
                # 1. Comportementale facile (mise en confiance)
                easy_behavioral = [q for q in behavioral_questions if q.get('difficulty_level') == 'easy']
                if easy_behavioral:
                    ordered_questions.append(easy_behavioral[0])
                elif behavioral_questions:
                    ordered_questions.append(behavioral_questions[0])
                
                # 2. Technique medium (évaluation des compétences de base)
                medium_technical = [q for q in technical_questions if q.get('difficulty_level') == 'medium']
                if medium_technical:
                    ordered_questions.append(medium_technical[0])
                elif technical_questions:
                    ordered_questions.append(technical_questions[0])
                
                # 3. Comportementale medium (expérience)
                medium_behavioral = [q for q in behavioral_questions if q.get('difficulty_level') == 'medium']
                if medium_behavioral and len(behavioral_questions) > 1:
                    ordered_questions.append(medium_behavioral[0])
                elif len(behavioral_questions) > 1:
                    ordered_questions.append(behavioral_questions[1])
                
                # 4. Technique hard (expertise)
                hard_technical = [q for q in technical_questions if q.get('difficulty_level') == 'hard']
                if hard_technical and len(technical_questions) > 1:
                    ordered_questions.append(hard_technical[0])
                elif len(technical_questions) > 1:
                    ordered_questions.append(technical_questions[1])
                
                # 5. Question finale (selon le secteur)
                if sector in ["MLOps et Data Science", "Développement Logiciel"]:
                    # Pour les postes tech : finir par une question technique avancée
                    remaining_technical = [q for q in technical_questions if q not in ordered_questions]
                    if remaining_technical:
                        ordered_questions.append(remaining_technical[0])
                else:
                    # Pour les autres secteurs : finir par une question comportementale
                    remaining_behavioral = [q for q in behavioral_questions if q not in ordered_questions]
                    if remaining_behavioral:
                        ordered_questions.append(remaining_behavioral[0])
                        
            else:
                # Pour 7+ questions : Progression structurée
                # 1. Ouverture comportementale
                if behavioral_questions:
                    ordered_questions.append(behavioral_questions[0])
                
                # 2-3. Questions techniques de base à intermédiaire
                if medium_questions:
                    ordered_questions.extend(medium_questions[:2])
                
                # 4. Question comportementale d'expérience
                if len(behavioral_questions) > 1:
                    ordered_questions.append(behavioral_questions[1])
                
                # 5-6. Questions techniques avancées
                if hard_questions:
                    ordered_questions.extend(hard_questions[:2])
                
                # 7+. Compléter avec le reste en alternant
                remaining_questions = [q for q in questions if q not in ordered_questions]
                remaining_count = num_questions - len(ordered_questions)
                
                # Alterner technique/comportementale pour le reste
                remaining_technical = [q for q in remaining_questions if q.get('type') == 'technique']
                remaining_behavioral = [q for q in remaining_questions if q.get('type') == 'comportementale']
                
                for i in range(remaining_count):
                    if i % 2 == 0 and remaining_technical:
                        ordered_questions.append(remaining_technical.pop(0))
                    elif remaining_behavioral:
                        ordered_questions.append(remaining_behavioral.pop(0))
                    elif remaining_technical:
                        ordered_questions.append(remaining_technical.pop(0))
            
            # Compléter si nécessaire avec les questions restantes
            if len(ordered_questions) < num_questions:
                remaining = [q for q in questions if q not in ordered_questions]
                needed = num_questions - len(ordered_questions)
                ordered_questions.extend(remaining[:needed])
            
            # Limiter au nombre demandé
            final_ordered = ordered_questions[:num_questions]
        
        # Réassigner les numéros d'ordre
        for i, question in enumerate(final_ordered):
            question['order'] = i + 1
        
        logger.info(f"📋 Questions ordonnées: {[q.get('type', 'unknown') for q in final_ordered]}")
        logger.info(f"🎯 Progression difficulté: {[q.get('difficulty_level', 'unknown') for q in final_ordered]}")
        
        return final_ordered

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
