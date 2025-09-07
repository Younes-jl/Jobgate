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
            raise ValueError("Le titre de l'offre doit contenir au moins 3 caractères")
        
        if not offer_description or len(offer_description.strip()) < 20:
            logger.error("❌ Description de l'offre trop courte")
            raise ValueError("La description de l'offre doit contenir au moins 20 caractères")
        
        number_of_questions = max(3, min(10, number_of_questions))
        
        if not self.model:
            logger.error("❌ API Gemini non configurée")
            raise ValueError("L'API Google Gemini n'est pas configurée. Veuillez définir GOOGLE_GEMINI_API_KEY dans vos variables d'environnement.")
        
        # Génération uniquement avec Gemini - pas de fallback
        return self._generate_with_gemini(offer_title, offer_description, 
                                        number_of_questions, difficulty, requirements,
                                        behavioral_count, technical_count)
    
    def _generate_with_gemini(self, offer_title: str, offer_description: str, 
                             num_questions: int, difficulty: str, requirements: str = '', 
                             behavioral_count: int = None, technical_count: int = None) -> List[Dict[str, Any]]:
        """Génère les questions avec l'API Google Gemini"""
        
        # Question obligatoire de présentation
        mandatory_question = {
            "question": "Présentez-vous et dites-nous pourquoi vous choisissez de nous rejoindre ?",
            "type": "comportementale",
            "difficulty": difficulty,
            "expected_duration": 180,
            "skills_assessed": ["communication", "motivation", "présentation"],
            "order": 1,
            "generated_by": "mandatory",
            "offer_title": offer_title
        }
        
        # Gestion des compteurs spécifiques
        if behavioral_count is not None and technical_count is not None:
            logger.info(f"🎯 Mode compteurs spécifiques: {behavioral_count} comportementales + {technical_count} techniques")
            
            # Calculer le nombre total de questions IA à générer
            ai_questions_count = behavioral_count + technical_count
            
            if ai_questions_count == 0:
                logger.info("⚠️ Aucune question IA demandée, retour de la question obligatoire uniquement")
                return [mandatory_question]
            
            logger.info(f"🤖 Génération de {ai_questions_count} questions IA")
        else:
            # Mode classique
            ai_questions_count = num_questions - 1  # -1 pour la question obligatoire
            behavioral_count = max(1, ai_questions_count // 2)  # Au moins 1 comportementale
            technical_count = ai_questions_count - behavioral_count
            logger.info(f"🎯 Mode simple: {ai_questions_count} questions au total")
        
        # Mapping des difficultés
        difficulty_mapping = {
            'easy': 'débutant - questions générales et basiques',
            'medium': 'intermédiaire - questions techniques modérées', 
            'hard': 'avancé - questions techniques approfondies et cas complexes'
        }
        difficulty_desc = difficulty_mapping.get(difficulty, difficulty_mapping['medium'])
        
        # Analyse complète et intelligente de l'offre d'emploi
        job_context = self._deep_analyze_job_offer(offer_title, offer_description, requirements)
        keywords = job_context['keywords']
        job_analysis = job_context['analysis']
        key_responsibilities = job_context['responsibilities']
        required_skills = job_context['skills']
        
        # Prompt ultra-spécifique avec focus sur le domaine détecté
        main_keywords = ', '.join(keywords[:3]) if keywords else 'compétences techniques'
        
        # Détection spéciale pour cybersécurité
        is_cybersecurity = any(term in offer_title.lower() for term in ['cybersécurité', 'cyber', 'sécurité', 'security', 'pentest'])
        
        if is_cybersecurity:
            domain_focus = f"""
DOMAINE SPÉCIFIQUE: CYBERSÉCURITÉ
Concentrez-vous UNIQUEMENT sur:
- Sécurité des systèmes et réseaux
- Tests de pénétration et audit sécurité  
- Gestion des incidents de sécurité
- Cryptographie et chiffrement
- Outils: Burp Suite, Metasploit, Nmap, Wireshark
- Normes: ISO 27001, OWASP, NIST
- Certifications: CISSP, CEH, OSCP
"""
        else:
            domain_focus = f"DOMAINE: {job_analysis}"
        
        # Construction du prompt selon le mode
        if ai_behavioral_count is not None and ai_technical_count is not None:
            # Mode avancé avec compteurs spécifiques
            if ai_behavioral_count > 0 and ai_technical_count > 0:
                # Les deux types demandés
                type_instructions = f"""
RÉPARTITION OBLIGATOIRE:
- {ai_behavioral_count} questions COMPORTEMENTALES (type: "comportementale")
- {ai_technical_count} questions TECHNIQUES (type: "technique")
TOTAL: {ai_questions_count} questions"""
            elif ai_behavioral_count > 0 and ai_technical_count == 0:
                # Seulement des questions comportementales
                type_instructions = f"""
GÉNÉREZ UNIQUEMENT {ai_behavioral_count} questions COMPORTEMENTALES (type: "comportementale")
AUCUNE question technique ne doit être générée.
TOTAL: {ai_questions_count} questions"""
            elif ai_technical_count > 0 and ai_behavioral_count == 0:
                # Seulement des questions techniques
                type_instructions = f"""
GÉNÉREZ UNIQUEMENT {ai_technical_count} questions TECHNIQUES (type: "technique")
AUCUNE question comportementale ne doit être générée.
TOTAL: {ai_questions_count} questions"""
            else:
                # Aucune question demandée (cas rare)
                type_instructions = "AUCUNE question à générer."
        else:
            # Mode simple
            type_instructions = f"GÉNÉREZ {ai_questions_count} questions variées (techniques et comportementales)"

        prompt = f"""
MISSION: Créer {ai_questions_count} questions d'entretien pour:

POSTE: {offer_title}
{domain_focus}

MOTS-CLÉS OBLIGATOIRES: {main_keywords}

{type_instructions}

RÈGLES STRICTES:
1. Questions 100% spécifiques au domaine du poste
2. Utiliser les mots-clés: {main_keywords}
3. Niveau {difficulty_desc}
4. JAMAIS de questions génériques
5. NE PAS inclure de question de présentation (déjà gérée séparément)
6. QUESTIONS COURTES: Maximum 1-2 lignes par question
7. CONCISION: Questions directes et précises, pas de longues explications
8. RESPECTER les types: "comportementale" ou "technique"

FORMAT JSON:
```json
[{{"question": "Question courte et directe ?", "type": "technique", "difficulty": "{difficulty}"}}]
```

EXEMPLES DE QUESTIONS COURTES:
TECHNIQUES:
- "Expliquez la différence entre Django et Flask."
- "Comment optimisez-vous une requête SQL lente ?"
- "Quelle est votre approche pour déboguer du code React ?"

COMPORTEMENTALES (utilisez ces catégories):
🔹 TRAVAIL EN ÉQUIPE:
- "Parlez-moi d'une fois où vous avez dû collaborer avec une équipe difficile. Comment avez-vous géré la situation ?"
- "Donnez un exemple d'un projet où votre rôle était crucial pour la réussite collective."

🔹 GESTION DES CONFLITS:
- "Racontez une situation où vous n'étiez pas d'accord avec votre supérieur ou un collègue. Comment avez-vous réagi ?"
- "Décrivez un conflit que vous avez aidé à résoudre."

🔹 PRISE D'INITIATIVE:
- "Donnez un exemple où vous avez pris une décision sans attendre d'instructions."
- "Parlez-moi d'une amélioration que vous avez proposée et mise en place dans votre travail."

🔹 GESTION DU STRESS & PRIORITÉS:
- "Racontez une expérience où vous avez dû gérer plusieurs tâches urgentes en même temps."
- "Comment avez-vous réagi dans une situation de forte pression avec peu de temps ?"

🔹 RÉSOLUTION DE PROBLÈME:
- "Donnez un exemple d'un problème complexe que vous avez résolu. Quelle a été votre approche ?"
- "Décrivez une situation où vous n'aviez pas toutes les informations nécessaires mais vous avez dû agir rapidement."

🔹 ADAPTABILITÉ & APPRENTISSAGE:
- "Parlez-moi d'une fois où vous avez dû apprendre une nouvelle compétence rapidement pour accomplir une mission."
- "Comment vous êtes-vous adapté à un changement imprévu au travail ?"

GÉNÉREZ {ai_questions_count} QUESTIONS COURTES:"""
        
        try:
            logger.info("🔄 Envoi de la requête à Google Gemini...")
            logger.info(f"🔍 PROMPT COMPLET ENVOYÉ:\n{prompt}")
            
            # Génération avec Gemini
            response = self.model.generate_content(prompt)
            
            if not response or not response.text:
                logger.error("❌ Réponse vide de Gemini")
                raise ValueError("Gemini n'a pas fourni de réponse. Veuillez réessayer.")
            
            logger.info("✅ Réponse reçue de Gemini")
            
            # Debug: Log de la réponse brute
            logger.info(f"🔍 Réponse Gemini brute: {response.text[:200]}...")
            
            # Extraction du JSON de la réponse
            questions_data = self._parse_gemini_response(response.text)
            
            if not questions_data:
                logger.error("❌ Impossible de parser la réponse Gemini")
                logger.info(f"🔍 Réponse complète: {response.text}")
                raise ValueError("La réponse de Gemini n'a pas pu être analysée. Veuillez réessayer.")
            
            # Validation que les questions sont spécifiques au poste
            validated_questions = self._validate_question_relevance(questions_data, offer_title, keywords)
            
            # Validation stricte - on garde toutes les questions générées par Gemini
            if not validated_questions:
                logger.error("❌ Aucune question valide générée par Gemini")
                raise ValueError("Impossible de générer des questions pertinentes. Veuillez vérifier le titre et la description de l'offre.")
            
            logger.info(f"✅ {len(validated_questions)}/{len(questions_data)} questions validées par Gemini.")
            
            # Validation des types de questions selon les compteurs demandés
            if ai_behavioral_count is not None and ai_technical_count is not None:
                validated_questions = self._enforce_question_types(
                    validated_questions, ai_behavioral_count, ai_technical_count
                )
            
            # Validation et formatage des questions générées par l'IA
            formatted_questions = self._format_questions_for_jobgate(
                validated_questions, offer_title, difficulty
            )
            
            # Ajuster l'ordre des questions générées par l'IA (commencer à 2)
            for i, question in enumerate(formatted_questions):
                question['order'] = i + 2
            
            # Combiner la question obligatoire avec les questions générées par l'IA
            all_questions = [mandatory_question] + formatted_questions
            
            logger.info(f"✅ {len(all_questions)} questions au total (1 obligatoire + {len(formatted_questions)} générées par Gemini)")
            return all_questions
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'appel Gemini: {e}")
            logger.error(f"❌ Détails: {str(e)}")
            raise ValueError(f"Erreur lors de la génération des questions avec Gemini: {str(e)}")
    
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
    
    def _analyze_job_offer(self, title: str, requirements: str = '') -> str:
        """Analyse le titre du poste et les prérequis pour déterminer le type de poste"""
        title_lower = title.lower()
        req_lower = requirements.lower() if requirements else ''
        
        # Détection du type de poste avec analyse étendue - TOUTES LES INGÉNIERIES + CYBERSÉCURITÉ
        if any(keyword in title_lower for keyword in ['cybersécurité', 'cyber sécurité', 'sécurité informatique', 'security analyst', 'pentester', 'ethical hacker']):
            job_type = "Expert Cybersécurité - Spécialisé en sécurité des systèmes d'information et audit sécuritaire"
        elif any(keyword in title_lower for keyword in ['ingénieur civil', 'génie civil', 'btp', 'construction', 'travaux publics']):
            job_type = "Ingénieur Civil - Spécialisé en conception et gestion de projets BTP, maîtrise des normes marocaines"
        elif any(keyword in title_lower for keyword in ['ingénieur électrique', 'électrotechnique', 'génie électrique']):
            job_type = "Ingénieur Électrique - Expert en systèmes électriques industriels et automatisation"
        elif any(keyword in title_lower for keyword in ['ingénieur mécanique', 'génie mécanique', 'maintenance industrielle']):
            job_type = "Ingénieur Mécanique - Spécialisé en conception CAO et maintenance d'équipements"
        elif any(keyword in title_lower for keyword in ['ingénieur industriel', 'génie industriel', 'processus']):
            job_type = "Ingénieur Industriel - Expert en optimisation des processus et Lean Manufacturing"
        elif any(keyword in title_lower for keyword in ['développeur', 'developer', 'programmeur', 'software engineer']):
            job_type = "Développeur/Ingénieur Logiciel - Spécialisé en développement d'applications"
        elif any(keyword in title_lower for keyword in ['data scientist', 'data engineer', 'machine learning', 'ia', 'ai']):
            job_type = "Data Scientist/Engineer - Expert en analyse de données et intelligence artificielle"
        elif any(keyword in title_lower for keyword in ['ingénieur chimique', 'génie chimique', 'procédés chimiques']):
            job_type = "Ingénieur Chimique - Spécialisé en procédés industriels et contrôle qualité"
        elif any(keyword in title_lower for keyword in ['ingénieur aéronautique', 'aérospatial', 'aviation']):
            job_type = "Ingénieur Aéronautique - Expert en conception et certification aéronautique"
        elif any(keyword in title_lower for keyword in ['ingénieur télécommunications', 'télécom', 'réseaux']):
            job_type = "Ingénieur Télécommunications - Spécialisé en réseaux et systèmes de communication"
        elif any(keyword in title_lower for keyword in ['ingénieur environnemental', 'environnement', 'développement durable']):
            job_type = "Ingénieur Environnemental - Expert en impact environnemental et développement durable"
        elif any(keyword in title_lower for keyword in ['économiste', 'analyste économique', 'économie']):
            job_type = "Économiste - Spécialisé en analyse économique et politiques publiques"
        elif any(keyword in title_lower for keyword in ['analyste financier', 'finance', 'banque', 'crédit']):
            job_type = "Analyste Financier - Expert en évaluation financière et gestion des risques"
        elif any(keyword in title_lower for keyword in ['commerce international', 'export', 'import']):
            job_type = "Spécialiste Commerce International - Expert en développement des marchés export"
        elif any(keyword in title_lower for keyword in ['développement économique', 'coopération', 'projets sociaux']):
            job_type = "Expert Développement Économique - Spécialisé en projets de développement et coopération"
        else:
            job_type = "Poste généraliste"
        
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
    
    def _deep_analyze_job_offer(self, title: str, description: str, requirements: str = '') -> Dict[str, Any]:
        """Analyse approfondie et intelligente de l'offre d'emploi pour extraction complète du contexte"""
        import re
        
        # Combinaison de tous les textes pour analyse
        full_text = f"{title} {description} {requirements}".lower()
        
        # 1. Analyse du type de poste (existante améliorée)
        job_analysis = self._analyze_job_offer(title, requirements)
        
        # 2. Extraction intelligente des mots-clés avec scoring
        keywords = self._extract_job_keywords(title, description, requirements)
        
        # 3. Extraction des responsabilités clés
        responsibilities = self._extract_responsibilities(description)
        
        # 4. Extraction des compétences requises
        skills = self._extract_required_skills(description, requirements)
        
        # 5. Analyse du niveau d'expérience requis
        experience_level = self._analyze_experience_level(full_text)
        
        # 6. Détection du secteur d'activité
        industry_sector = self._detect_industry_sector(full_text)
        
        # 7. Extraction des outils/technologies spécifiques
        tools_technologies = self._extract_tools_technologies(full_text)
        
        return {
            'analysis': job_analysis,
            'keywords': keywords,
            'responsibilities': responsibilities,
            'skills': skills,
            'experience_level': experience_level,
            'industry_sector': industry_sector,
            'tools_technologies': tools_technologies
        }
    
    def _extract_responsibilities(self, description: str) -> List[str]:
        """Extrait les responsabilités clés de la description du poste"""
        if not description:
            return []
        
        responsibilities = []
        desc_lower = description.lower()
        
        # Patterns pour identifier les responsabilités
        responsibility_patterns = [
            r'vous serez chargé[e]? de ([^.]+)',
            r'vos missions[^:]*:([^.]+)',
            r'responsabilités[^:]*:([^.]+)',
            r'vous devrez ([^.]+)',
            r'en charge de ([^.]+)',
            r'missions principales[^:]*:([^.]+)',
            r'vous aurez pour mission de ([^.]+)',
            r'votre rôle consistera à ([^.]+)'
        ]
        
        for pattern in responsibility_patterns:
            matches = re.findall(pattern, desc_lower, re.IGNORECASE)
            for match in matches:
                clean_resp = match.strip().replace('\n', ' ').replace('  ', ' ')
                if len(clean_resp) > 10:
                    responsibilities.append(clean_resp)
        
        # Extraction par bullet points ou listes
        bullet_patterns = [
            r'[•\-\*]\s*([^•\-\*\n]+)',
            r'\d+\.\s*([^\n]+)'
        ]
        
        for pattern in bullet_patterns:
            matches = re.findall(pattern, description, re.MULTILINE)
            for match in matches:
                clean_resp = match.strip()
                if len(clean_resp) > 15 and any(verb in clean_resp.lower() for verb in ['gérer', 'développer', 'concevoir', 'analyser', 'superviser', 'coordonner']):
                    responsibilities.append(clean_resp)
        
        return list(set(responsibilities))[:5]  # Limiter à 5 responsabilités principales
    
    def _extract_required_skills(self, description: str, requirements: str) -> List[str]:
        """Extrait les compétences requises spécifiques"""
        full_text = f"{description} {requirements}".lower()
        skills = []
        
        # Patterns pour identifier les compétences
        skill_patterns = [
            r'compétences requises[^:]*:([^.]+)',
            r'profil recherché[^:]*:([^.]+)',
            r'vous maîtrisez ([^.]+)',
            r'connaissance[s]? de ([^.]+)',
            r'expérience avec ([^.]+)',
            r'maîtrise de ([^.]+)',
            r'expertise en ([^.]+)',
            r'formation en ([^.]+)'
        ]
        
        for pattern in skill_patterns:
            matches = re.findall(pattern, full_text, re.IGNORECASE)
            for match in matches:
                clean_skill = match.strip().replace('\n', ' ').replace('  ', ' ')
                if len(clean_skill) > 5:
                    skills.append(clean_skill)
        
        # Compétences techniques spécifiques par domaine
        technical_skills = {
            'ingénierie': ['autocad', 'solidworks', 'catia', 'matlab', 'ansys', 'revit'],
            'développement': ['python', 'java', 'react', 'angular', 'docker', 'kubernetes'],
            'économie': ['excel', 'sap', 'stata', 'r', 'spss', 'tableau'],
            'finance': ['bloomberg', 'reuters', 'risk management', 'trading']
        }
        
        for domain, tech_list in technical_skills.items():
            for tech in tech_list:
                if tech in full_text:
                    skills.append(tech)
        
        return list(set(skills))[:8]  # Limiter à 8 compétences principales
    
    def _analyze_experience_level(self, full_text: str) -> str:
        """Analyse le niveau d'expérience requis"""
        if any(term in full_text for term in ['junior', 'débutant', '0-2 ans', 'récent diplômé']):
            return "Junior (0-2 ans)"
        elif any(term in full_text for term in ['senior', 'expérimenté', '5+ ans', 'plus de 5 ans']):
            return "Senior (5+ ans)"
        elif any(term in full_text for term in ['expert', 'lead', 'manager', '10+ ans', 'plus de 10 ans']):
            return "Expert/Lead (10+ ans)"
        else:
            return "Intermédiaire (2-5 ans)"
    
    def _detect_industry_sector(self, full_text: str) -> str:
        """Détecte le secteur d'activité"""
        sectors = {
            'BTP/Construction': ['btp', 'construction', 'bâtiment', 'travaux publics'],
            'Industrie': ['industrie', 'industriel', 'production', 'manufacturing'],
            'Technologie': ['tech', 'software', 'développement', 'informatique'],
            'Finance/Banque': ['banque', 'finance', 'crédit', 'investissement'],
            'Énergie': ['énergie', 'pétrole', 'gaz', 'électricité', 'renouvelable'],
            'Télécommunications': ['télécom', 'télécommunications', 'réseaux', '5g'],
            'Aéronautique': ['aéronautique', 'aérospatial', 'aviation', 'aérospatial'],
            'Automobile': ['automobile', 'automotive', 'véhicule'],
            'Santé': ['santé', 'médical', 'pharmaceutique', 'hôpital']
        }
        
        for sector, keywords in sectors.items():
            if any(keyword in full_text for keyword in keywords):
                return sector
        
        return "Secteur général"
    
    def _extract_tools_technologies(self, full_text: str) -> List[str]:
        """Extrait les outils et technologies spécifiques mentionnés"""
        tools = []
        
        # Outils par domaine
        domain_tools = {
            'CAO/Design': ['autocad', 'solidworks', 'catia', 'inventor', 'fusion 360', 'revit', 'sketchup'],
            'Simulation': ['ansys', 'abaqus', 'comsol', 'matlab', 'simulink'],
            'Programmation': ['python', 'java', 'c++', 'javascript', 'react', 'angular'],
            'Base de données': ['sql', 'mysql', 'postgresql', 'mongodb', 'oracle'],
            'Cloud': ['aws', 'azure', 'gcp', 'docker', 'kubernetes'],
            'Analyse': ['excel', 'tableau', 'power bi', 'sas', 'spss', 'r'],
            'ERP': ['sap', 'oracle', 'sage', 'odoo']
        }
        
        for category, tool_list in domain_tools.items():
            for tool in tool_list:
                if tool in full_text:
                    tools.append(tool)
        
        return list(set(tools))[:10]  # Limiter à 10 outils principaux
    
    def _enforce_question_types(self, questions_data: List[Dict], 
                               behavioral_count: int, technical_count: int) -> List[Dict]:
        """Force le respect des types de questions demandés"""
        logger.info(f"🔧 Enforcement des types: {behavioral_count} comportementales, {technical_count} techniques")
        logger.info(f"🔍 Questions reçues de l'IA: {[q.get('type', 'UNKNOWN') for q in questions_data]}")
        
        result = []
        
        # FORCER les types selon les compteurs demandés
        if behavioral_count > 0:
            # Prendre les N premières questions et les forcer en comportementales
            for i in range(min(behavioral_count, len(questions_data))):
                question = questions_data[i].copy()
                question['type'] = 'comportementale'
                result.append(question)
                logger.info(f"✅ Question {i+1} FORCÉE en comportementale: {question.get('question', 'N/A')[:50]}...")
        
        # FORCER les types techniques
        if technical_count > 0:
            start_idx = behavioral_count
            for i in range(start_idx, min(start_idx + technical_count, len(questions_data))):
                question = questions_data[i].copy()
                question['type'] = 'technique'
                result.append(question)
                logger.info(f"✅ Question {i+1} FORCÉE en technique: {question.get('question', 'N/A')[:50]}...")
        
        logger.info(f"✅ Types FORCÉS: {len(result)} questions finales - Types: {[q.get('type') for q in result]}")
        return result
    
    def _validate_question_relevance(self, questions_data: List[Dict], offer_title: str, keywords: List[str]) -> List[Dict]:
        """Valide que les questions sont spécifiques au poste et non génériques"""
        validated_questions = []
        
        # Mots-clés génériques à éviter
        generic_phrases = [
            'présentez-vous', 'points forts', 'points faibles', 'motivations',
            'dans 5 ans', 'pourquoi ce poste', 'stress', 'équipe',
            'défis', 'objectifs', 'ambitions', 'qualités', 'défauts'
        ]
        
        # Mots-clés techniques du poste
        job_keywords = [kw.lower() for kw in keywords[:5]]
        title_words = offer_title.lower().split()
        
        for question_data in questions_data:
            question_text = question_data.get('question', '').lower()
            
            # Vérifier si la question est générique
            is_generic = any(phrase in question_text for phrase in generic_phrases)
            
            # Vérifier si la question contient des mots-clés du poste
            has_job_keywords = any(keyword in question_text for keyword in job_keywords)
            has_title_words = any(word in question_text for word in title_words if len(word) > 3)
            
            # Accepter la question si elle n'est pas générique ET contient des mots-clés du poste
            if not is_generic and (has_job_keywords or has_title_words):
                validated_questions.append(question_data)
            else:
                logger.warning(f"❌ Question rejetée (trop générique): {question_text[:50]}...")
        
        return validated_questions
    
    def _extract_job_keywords(self, title: str, description: str, requirements: str = '') -> List[str]:
        """Extraction intelligente et complète des mots-clés de l'offre d'emploi"""
        import re
        
        # Combinaison titre + description + prérequis pour analyse complète
        full_text = f"{title} {description} {requirements}".lower()
        
        # Dictionnaire étendu de mots-clés par domaine
        engineering_keywords = [
            # Ingénierie Civile/BTP
            'btp', 'construction', 'bâtiment', 'génie civil', 'travaux publics', 'chantier',
            'béton', 'acier', 'structure', 'fondation', 'voirie', 'assainissement',
            'autocad', 'revit', 'tekla', 'robot structural', 'etabs', 'sap2000',
            'norme marocaine', 'nm', 'eurocode', 'cctp', 'dpgf', 'bpu',
            
            # Ingénierie Électrique/Électronique
            'électrique', 'électronique', 'électrotechnique', 'automatisme', 'instrumentation',
            'plc', 'scada', 'hmi', 'variateur', 'moteur', 'transformateur', 'disjoncteur',
            'siemens', 'schneider', 'abb', 'allen bradley', 'omron', 'mitsubishi',
            'matlab', 'simulink', 'proteus', 'altium', 'kicad', 'eagle',
            
            # Ingénierie Mécanique
            'mécanique', 'maintenance', 'production', 'usinage', 'fabrication', 'assemblage',
            'cao', 'cfao', 'solidworks', 'catia', 'inventor', 'fusion 360', 'creo',
            'cnc', 'tournage', 'fraisage', 'soudage', 'métrologie', 'contrôle qualité',
            'lean manufacturing', 'tpm', 'gmao', 'amdec', 'smed',
            
            # Ingénierie Industrielle
            'génie industriel', 'processus', 'optimisation', 'lean', 'six sigma', 'kaizen',
            'ergonomie', 'sécurité', 'qualité', 'iso 9001', 'iso 14001', 'ohsas 18001',
            'planification', 'ordonnancement', 'supply chain', 'logistique',
            
            # Ingénierie Chimique
            'génie chimique', 'procédés', 'chimie', 'pétrochimie', 'raffinage', 'catalyse',
            'distillation', 'extraction', 'cristallisation', 'réacteur', 'colonne',
            'aspen plus', 'hysys', 'chemcad', 'pro ii', 'unisim',
            
            # Ingénierie Aéronautique
            'aéronautique', 'aérospatial', 'aviation', 'aérodynamique', 'spatial',
            'catia v5', 'nx', 'ansys fluent', 'cfd', 'fem', 'easa', 'faa',
            'composite', 'structure aéronautique', 'certification',
            
            # Ingénierie Télécommunications
            'télécommunications', 'télécom', 'réseaux', '5g', '4g', '3g', 'lte',
            'fibre optique', 'radio', 'antenne', 'gsm', 'umts', 'wifi', 'bluetooth',
            'cisco', 'huawei', 'ericsson', 'nokia', 'juniper',
            
            # Ingénierie Environnementale
            'environnement', 'développement durable', 'traitement eaux', 'pollution',
            'déchets', 'recyclage', 'énergies renouvelables', 'éolien', 'solaire',
            'impact environnemental', 'iso 14001', 'bilan carbone'
        ]
        
        tech_keywords = [
            # Développement Web/Mobile
            'python', 'javascript', 'react', 'angular', 'vue', 'node', 'django', 'flask',
            'java', 'spring', 'php', 'laravel', 'symfony', 'ruby', 'rails', 'go', 'rust',
            'html', 'css', 'sass', 'typescript', 'jquery', 'bootstrap', 'tailwind',
            
            # Cybersécurité (AJOUTÉ)
            'cybersécurité', 'cyber sécurité', 'sécurité informatique', 'sécurité réseau',
            'pentesting', 'pentest', 'ethical hacking', 'hacking éthique', 'audit sécurité',
            'vulnerability assessment', 'analyse vulnérabilités', 'soc', 'cert', 'csirt',
            'firewall', 'pare-feu', 'ids', 'ips', 'siem', 'soar', 'xdr', 'edr',
            'cryptographie', 'chiffrement', 'ssl', 'tls', 'pki', 'certificats',
            'iso 27001', 'nist', 'owasp', 'cissp', 'ceh', 'oscp', 'sans',
            'malware', 'ransomware', 'phishing', 'social engineering', 'ddos',
            'forensic', 'investigation numérique', 'incident response', 'gestion incidents',
            'burp suite', 'metasploit', 'nmap', 'wireshark', 'kali linux', 'nessus',
            'splunk', 'qradar', 'fortinet', 'palo alto', 'checkpoint', 'cisco asa',
            
            # Base de données
            'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
            
            # Cloud & DevOps
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'gitlab', 'github',
            'terraform', 'ansible', 'linux', 'ubuntu', 'centos',
            
            # Data Engineering & Science (enrichi)
            'data engineer', 'data scientist', 'data science', 'machine learning', 'ml', 'ia artificielle',
            'etl', 'elt', 'data pipeline', 'data warehousing', 'data lake', 'big data',
            'apache spark', 'hadoop', 'kafka', 'airflow', 'luigi', 'dbt',
            'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch', 'keras',
            'sql', 'nosql', 'databricks', 'snowflake', 'redshift', 'bigquery',
            'tableau', 'power bi', 'looker', 'mlops', 'mlflow'
        ]
        
        economics_keywords = [
            # Économie et Finance
            'économie', 'finance', 'banque', 'comptabilité', 'audit', 'fiscalité',
            'investissement', 'bourse', 'trading', 'risk management', 'crédit',
            'excel', 'sap', 'sage', 'bloomberg', 'reuters', 'matlab', 'r', 'stata',
            
            # Commerce International
            'export', 'import', 'douane', 'incoterms', 'logistique internationale',
            'change', 'devise', 'lettre de crédit', 'amdp', 'portnet',
            
            # Développement Économique
            'développement', 'coopération', 'ong', 'projets sociaux', 'microfinance',
            'évaluation impact', 'indicateurs développement', 'pnud', 'banque mondiale'
        ]
        
        business_keywords = [
            'gestion', 'management', 'équipe', 'projet', 'client', 'commercial', 'vente',
            'marketing', 'communication', 'design', 'ux', 'ui', 'créativité', 'innovation',
            'startup', 'entreprise', 'pme', 'grand groupe', 'international', 'remote',
            'télétravail', 'hybride', 'autonomie', 'leadership', 'collaboration'
        ]
        
        # Combinaison de tous les mots-clés
        all_keywords = engineering_keywords + tech_keywords + economics_keywords + business_keywords
        
        found_keywords = []
        keyword_scores = {}
        
        # Recherche avec scoring basé sur la fréquence et la position
        for keyword in all_keywords:
            if keyword in full_text:
                # Score basé sur la fréquence d'apparition
                frequency = full_text.count(keyword)
                
                # Bonus si le mot-clé apparaît dans le titre (plus important)
                title_bonus = 2 if keyword in title.lower() else 1
                
                # Bonus si le mot-clé apparaît dans les prérequis (très important)
                req_bonus = 1.5 if requirements and keyword in requirements.lower() else 1
                
                # Score final
                score = frequency * title_bonus * req_bonus
                keyword_scores[keyword] = score
                found_keywords.append(keyword)
        
        # Extraction de mots-clés supplémentaires par regex
        # Technologies en majuscules, acronymes, noms propres
        tech_pattern = r'\b[A-Z]{2,}\b|"([^"]+)"|\'([^\']+)\''
        additional_matches = re.findall(tech_pattern, full_text.upper())
        
        for match in additional_matches:
            if isinstance(match, tuple):
                for submatch in match:
                    if submatch and len(submatch.strip()) > 1:
                        clean_match = submatch.strip().lower()
                        if clean_match not in found_keywords and len(clean_match) > 2:
                            found_keywords.append(clean_match)
                            keyword_scores[clean_match] = 1
            else:
                if len(match) > 2 and match.lower() not in found_keywords:
                    found_keywords.append(match.lower())
                    keyword_scores[match.lower()] = 1
        
        # Extraction de phrases importantes (compétences spécifiques)
        skill_patterns = [
            r'expérience en ([^,.]+)',
            r'maîtrise de ([^,.]+)',
            r'connaissance de ([^,.]+)',
            r'compétence en ([^,.]+)',
            r'expertise en ([^,.]+)'
        ]
        
        for pattern in skill_patterns:
            matches = re.findall(pattern, full_text, re.IGNORECASE)
            for match in matches:
                clean_skill = match.strip().lower()
                if len(clean_skill) > 3 and clean_skill not in found_keywords:
                    found_keywords.append(clean_skill)
                    keyword_scores[clean_skill] = 2  # Bonus pour les compétences explicites
        
        # Trier par score décroissant et limiter aux 15 mots-clés les plus pertinents
        sorted_keywords = sorted(found_keywords, key=lambda k: keyword_scores.get(k, 0), reverse=True)
        
        return list(dict.fromkeys(sorted_keywords))[:15]  # Supprime les doublons tout en gardant l'ordre
    
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
        
        # Questions Ingénierie Industrielle
        industrial_engineering_questions = [
            {
                "question": "Comment optimisez-vous les processus de production pour améliorer l'efficacité et réduire les coûts ?",
                "type": "technique",
                "expected_duration": 300,
                "difficulty_level": "hard",
                "skills_assessed": ["optimisation_processus", "lean_manufacturing", "coûts"],
                "order": 1
            },
            {
                "question": "Décrivez votre approche pour implémenter la méthode Lean Six Sigma dans une chaîne de production.",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "medium",
                "skills_assessed": ["lean_six_sigma", "amélioration_continue", "qualité"],
                "order": 2
            },
            {
                "question": "Comment analysez-vous et améliorez-vous l'ergonomie des postes de travail ?",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["ergonomie", "sécurité", "productivité"],
                "order": 3
            }
        ]
        
        # Questions Data Science / Data Engineer (AJOUTÉ)
        data_science_questions = [
            {
                "question": "Comment concevez-vous un pipeline de données (ETL/ELT) scalable pour traiter des téraoctets de données ?",
                "type": "technique",
                "expected_duration": 300,
                "difficulty_level": "hard",
                "skills_assessed": ["data_pipeline", "etl", "scalability", "big_data"],
                "order": 1
            },
            {
                "question": "Décrivez votre expérience avec des outils comme Apache Spark ou Hadoop pour le traitement de données distribuées.",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "medium",
                "skills_assessed": ["spark", "hadoop", "distributed_computing"],
                "order": 2
            },
            {
                "question": "Comment assurez-vous la qualité et la gouvernance des données dans un data lake ?",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["data_quality", "data_governance", "data_lake"],
                "order": 3
            }
        ]

        # Questions Cybersécurité (AJOUTÉ)
        cybersecurity_questions = [
            {
                "question": "Comment réalisez-vous un audit de sécurité complet d'une infrastructure réseau d'entreprise ?",
                "type": "technique",
                "expected_duration": 300,
                "difficulty_level": "hard",
                "skills_assessed": ["audit_sécurité", "infrastructure_réseau", "analyse_vulnérabilités"],
                "order": 1
            },
            {
                "question": "Décrivez votre processus pour effectuer un test de pénétration web avec Burp Suite.",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "medium",
                "skills_assessed": ["pentest", "burp_suite", "sécurité_web"],
                "order": 2
            },
            {
                "question": "Comment gérez-vous un incident de sécurité depuis la détection jusqu'à la résolution ?",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["gestion_incidents", "forensic", "response_plan"],
                "order": 3
            },
            {
                "question": "Expliquez votre approche pour sécuriser une architecture cloud selon les standards ISO 27001.",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "hard",
                "skills_assessed": ["sécurité_cloud", "iso_27001", "compliance"],
                "order": 4
            },
            {
                "question": "Comment analysez-vous et prévenez-vous les attaques par déni de service (DDoS) ?",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["ddos_protection", "analyse_trafic", "mitigation"],
                "order": 5
            }
        ]
        
        # Questions Ingénierie Informatique/Logiciel
        software_engineering_questions = [
            {
                "question": "Expliquez votre approche pour concevoir une architecture logicielle scalable et maintenable.",
                "type": "technique",
                "expected_duration": 300,
                "difficulty_level": "hard",
                "skills_assessed": ["architecture_logicielle", "scalabilité", "maintenabilité"],
                "order": 1
            },
            {
                "question": "Comment implémentez-vous les principes DevOps dans le cycle de développement logiciel ?",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "medium",
                "skills_assessed": ["devops", "CI_CD", "automatisation"],
                "order": 2
            },
            {
                "question": "Décrivez votre méthode pour assurer la qualité du code et réduire les bugs en production.",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["qualité_code", "tests", "debugging"],
                "order": 3
            }
        ]
        
        # Questions Ingénierie Chimique
        chemical_engineering_questions = [
            {
                "question": "Comment concevez-vous un procédé chimique en tenant compte de la sécurité et de l'environnement ?",
                "type": "technique",
                "expected_duration": 300,
                "difficulty_level": "hard",
                "skills_assessed": ["procédés_chimiques", "sécurité", "environnement"],
                "order": 1
            },
            {
                "question": "Expliquez votre approche pour optimiser le rendement d'une réaction chimique industrielle.",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "medium",
                "skills_assessed": ["optimisation_réaction", "rendement", "catalyse"],
                "order": 2
            },
            {
                "question": "Comment gérez-vous le contrôle qualité dans une unité de production chimique ?",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["contrôle_qualité", "analyse", "normes"],
                "order": 3
            }
        ]
        
        # Questions Ingénierie Aéronautique/Aérospatiale
        aerospace_engineering_questions = [
            {
                "question": "Décrivez votre processus de conception et validation d'un composant aéronautique critique.",
                "type": "technique",
                "expected_duration": 300,
                "difficulty_level": "hard",
                "skills_assessed": ["conception_aéronautique", "validation", "sécurité"],
                "order": 1
            },
            {
                "question": "Comment analysez-vous les contraintes aérodynamiques dans la conception d'un aéronef ?",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "medium",
                "skills_assessed": ["aérodynamique", "simulation", "CFD"],
                "order": 2
            },
            {
                "question": "Expliquez votre approche pour respecter les normes de certification aéronautique (EASA, FAA).",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["certification", "normes_aéronautiques", "conformité"],
                "order": 3
            }
        ]
        
        # Questions Ingénierie des Télécommunications
        telecom_engineering_questions = [
            {
                "question": "Comment concevez-vous un réseau de télécommunications pour optimiser la couverture et la qualité ?",
                "type": "technique",
                "expected_duration": 300,
                "difficulty_level": "hard",
                "skills_assessed": ["réseaux_télécom", "couverture", "optimisation"],
                "order": 1
            },
            {
                "question": "Expliquez votre approche pour déployer la 5G en tenant compte des contraintes techniques et réglementaires.",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "medium",
                "skills_assessed": ["5G", "déploiement", "réglementation"],
                "order": 2
            },
            {
                "question": "Comment diagnostiquez-vous et résolvez-vous les problèmes de qualité de signal ?",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["diagnostic", "qualité_signal", "troubleshooting"],
                "order": 3
            }
        ]
        
        # Questions Ingénierie Environnementale
        environmental_engineering_questions = [
            {
                "question": "Comment concevez-vous un système de traitement des eaux usées respectueux de l'environnement ?",
                "type": "technique",
                "expected_duration": 300,
                "difficulty_level": "hard",
                "skills_assessed": ["traitement_eaux", "environnement", "durabilité"],
                "order": 1
            },
            {
                "question": "Décrivez votre approche pour évaluer l'impact environnemental d'un projet industriel.",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "medium",
                "skills_assessed": ["impact_environnemental", "évaluation", "normes_ISO"],
                "order": 2
            },
            {
                "question": "Comment développez-vous des solutions pour réduire l'empreinte carbone d'une entreprise ?",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["empreinte_carbone", "solutions_vertes", "développement_durable"],
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
        
        # Questions Économie Internationale et Commerce
        international_economics_questions = [
            {
                "question": "Analysez l'impact des accords de libre-échange du Maroc sur l'économie nationale.",
                "type": "technique",
                "expected_duration": 300,
                "difficulty_level": "hard",
                "skills_assessed": ["commerce_international", "accords_commerciaux", "économie_marocaine"],
                "order": 1
            },
            {
                "question": "Comment évaluez-vous les opportunités d'exportation pour une entreprise marocaine ?",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "medium",
                "skills_assessed": ["export", "étude_marché", "stratégie_internationale"],
                "order": 2
            },
            {
                "question": "Décrivez votre approche pour analyser les fluctuations des taux de change et leur impact.",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["taux_change", "analyse_financière", "risque_devise"],
                "order": 3
            }
        ]
        
        # Questions Économie du Développement
        development_economics_questions = [
            {
                "question": "Comment analysez-vous l'efficacité des programmes de développement économique régional ?",
                "type": "technique",
                "expected_duration": 300,
                "difficulty_level": "hard",
                "skills_assessed": ["développement_régional", "évaluation_programmes", "impact_économique"],
                "order": 1
            },
            {
                "question": "Expliquez votre méthode pour mesurer l'impact social d'un projet économique.",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "medium",
                "skills_assessed": ["impact_social", "évaluation", "développement_durable"],
                "order": 2
            },
            {
                "question": "Comment identifiez-vous les facteurs de croissance économique dans les pays émergents ?",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["croissance_économique", "pays_émergents", "facteurs_développement"],
                "order": 3
            }
        ]
        
        # Questions Économétrie et Analyse Quantitative
        econometrics_questions = [
            {
                "question": "Décrivez votre approche pour construire un modèle économétrique robuste.",
                "type": "technique",
                "expected_duration": 300,
                "difficulty_level": "hard",
                "skills_assessed": ["économétrie", "modélisation", "statistiques"],
                "order": 1
            },
            {
                "question": "Comment validez-vous la fiabilité de vos prévisions économiques ?",
                "type": "technique",
                "expected_duration": 240,
                "difficulty_level": "medium",
                "skills_assessed": ["prévisions", "validation_modèle", "tests_statistiques"],
                "order": 2
            },
            {
                "question": "Expliquez votre méthode pour analyser les séries temporelles économiques.",
                "type": "technique",
                "expected_duration": 180,
                "difficulty_level": "medium",
                "skills_assessed": ["séries_temporelles", "analyse_tendances", "saisonnalité"],
                "order": 3
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
        
        # Détection du secteur d'emploi - CYBERSÉCURITÉ EN PREMIER
        if any(keyword in combined_text for keyword in ['cybersécurité', 'cyber sécurité', 'sécurité informatique', 'security', 'pentest', 'audit sécurité', 'ethical hacker', 'pentester']):
            selected_questions = cybersecurity_questions + generic_questions[:1]
            sector = "Cybersécurité"
        elif any(keyword in combined_text for keyword in ['ingénieur civil', 'génie civil', 'btp', 'construction', 'bâtiment', 'travaux publics']):
            selected_questions = civil_engineering_questions + generic_questions[:2]
            sector = "Ingénierie Civile"
        elif any(keyword in combined_text for keyword in ['ingénieur électrique', 'électricien', 'électronique', 'électrotechnique', 'automatisme', 'instrumentation']):
            selected_questions = electrical_engineering_questions + generic_questions[:2]
            sector = "Ingénierie Électrique"
        elif any(keyword in combined_text for keyword in ['ingénieur mécanique', 'mécanique', 'maintenance', 'production', 'usinage', 'fabrication']):
            selected_questions = mechanical_engineering_questions + generic_questions[:2]
            sector = "Ingénierie Mécanique"
        elif any(keyword in combined_text for keyword in ['ingénieur industriel', 'génie industriel', 'lean', 'six sigma', 'processus', 'optimisation', 'qualité']):
            selected_questions = industrial_engineering_questions + generic_questions[:2]
            sector = "Ingénierie Industrielle"
        elif any(keyword in combined_text for keyword in ['data engineer', 'data scientist', 'data science', 'machine learning', 'big data', 'etl']):
            selected_questions = data_science_questions + generic_questions[:1]
            sector = "Data Science / Engineering"
        elif any(keyword in combined_text for keyword in ['ingénieur logiciel', 'génie logiciel', 'software engineer', 'architecture logicielle', 'devops']):
            selected_questions = software_engineering_questions + generic_questions[:2]
            sector = "Ingénierie Logiciel"
        elif any(keyword in combined_text for keyword in ['ingénieur chimique', 'génie chimique', 'procédés', 'chimie', 'pétrochimie', 'raffinage']):
            selected_questions = chemical_engineering_questions + generic_questions[:2]
            sector = "Ingénierie Chimique"
        elif any(keyword in combined_text for keyword in ['ingénieur aéronautique', 'aérospatial', 'aviation', 'aérodynamique', 'spatial']):
            selected_questions = aerospace_engineering_questions + generic_questions[:2]
            sector = "Ingénierie Aéronautique"
        elif any(keyword in combined_text for keyword in ['ingénieur télécommunications', 'télécom', 'réseaux', '5g', '4g', 'fibre optique', 'radio']):
            selected_questions = telecom_engineering_questions + generic_questions[:2]
            sector = "Ingénierie Télécommunications"
        elif any(keyword in combined_text for keyword in ['ingénieur environnemental', 'environnement', 'développement durable', 'traitement eaux', 'pollution']):
            selected_questions = environmental_engineering_questions + generic_questions[:2]
            sector = "Ingénierie Environnementale"
        # TOUTES LES SPÉCIALISATIONS ÉCONOMIQUES
        elif any(keyword in combined_text for keyword in ['économiste', 'économie', 'finance', 'banque', 'comptabilité', 'audit', 'gestion financière']):
            selected_questions = economics_finance_questions + generic_questions[:1]
            sector = "Économie et Finance"
        elif any(keyword in combined_text for keyword in ['commerce international', 'export', 'import', 'douane', 'logistique internationale']):
            selected_questions = international_economics_questions + generic_questions[:1]
            sector = "Économie Internationale"
        elif any(keyword in combined_text for keyword in ['développement économique', 'coopération', 'ong', 'développement durable', 'projets sociaux']):
            selected_questions = development_economics_questions + generic_questions[:1]
            sector = "Économie du Développement"
        elif any(keyword in combined_text for keyword in ['économétrie', 'statistiques', 'analyse quantitative', 'modélisation', 'prévisions']):
            selected_questions = econometrics_questions + generic_questions[:1]
            sector = "Économétrie"
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
            # Construire la liste finale des questions
            final_questions = [mandatory_question]
                
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
