#!/usr/bin/env python
"""
Debug script pour tester la génération de questions IA
"""
import os
import sys
import django

# Configuration Django
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prototype.settings')
django.setup()

from interviews.ai_service import AIInterviewQuestionGenerator

def debug_cybersecurity_generation():
    """Debug avec une offre cybersécurité réelle"""
    
    generator = AIInterviewQuestionGenerator()
    
    print("🔍 DEBUG - Génération Questions Cybersécurité")
    print("=" * 60)
    
    # Données test cybersécurité
    offer_title = "Expert en Cybersécurité"
    offer_description = """
    Nous recherchons un expert en cybersécurité pour notre équipe IT.
    Missions principales:
    - Réaliser des audits de sécurité et tests de pénétration
    - Analyser les vulnérabilités et proposer des correctifs
    - Gérer les incidents de sécurité et forensic
    - Maintenir les systèmes de sécurité (firewall, SIEM)
    """
    requirements = "Burp Suite, Metasploit, Nmap, Wireshark, CISSP, ISO 27001"
    
    print(f"TITRE: {offer_title}")
    print(f"DESCRIPTION: {offer_description[:100]}...")
    print(f"COMPÉTENCES: {requirements}")
    print()
    
    # 1. Test de l'analyse du domaine
    print("🔍 ÉTAPE 1: Analyse du domaine")
    job_analysis = generator._analyze_job_offer(offer_title, requirements)
    print(f"Domaine détecté: {job_analysis}")
    print()
    
    # 2. Test de l'extraction des mots-clés
    print("🔍 ÉTAPE 2: Extraction des mots-clés")
    keywords = generator._extract_job_keywords(offer_title, offer_description, requirements)
    print(f"Mots-clés extraits: {keywords[:10]}")
    print()
    
    # 3. Test de l'analyse complète
    print("🔍 ÉTAPE 3: Analyse complète")
    job_context = generator._deep_analyze_job_offer(offer_title, offer_description, requirements)
    print(f"Type de poste: {job_context['analysis']}")
    print(f"Secteur: {job_context['industry_sector']}")
    print(f"Outils détectés: {job_context['tools_technologies']}")
    print()
    
    # 4. Test de génération (avec fallback pour éviter erreur API)
    print("🔍 ÉTAPE 4: Génération de questions")
    try:
        # Forcer l'utilisation du fallback pour voir les questions par défaut
        questions = generator._get_fallback_questions(3, offer_title, requirements)
        print(f"Questions fallback générées: {len(questions)}")
        
        for i, q in enumerate(questions, 1):
            print(f"{i}. {q['question']}")
            print(f"   Type: {q['type']}")
            
            # Vérifier si la question contient des termes cybersécurité
            cyber_terms = ['sécurité', 'security', 'audit', 'pentest', 'firewall', 'vulnérabilité']
            question_lower = q['question'].lower()
            found_terms = [term for term in cyber_terms if term in question_lower]
            
            if found_terms:
                print(f"   ✅ Termes cyber trouvés: {found_terms}")
            else:
                print(f"   ❌ PROBLÈME: Pas de termes cybersécurité!")
            print()
            
    except Exception as e:
        print(f"❌ Erreur génération: {e}")
    
    # 5. Test avec un autre domaine pour comparaison
    print("\n" + "=" * 60)
    print("🔍 TEST COMPARATIF - Développeur Web")
    
    dev_title = "Développeur React Senior"
    dev_description = "Développement d'applications web avec React, Redux, TypeScript"
    dev_requirements = "React, Redux, TypeScript, JavaScript"
    
    dev_analysis = generator._analyze_job_offer(dev_title, dev_requirements)
    dev_keywords = generator._extract_job_keywords(dev_title, dev_description, dev_requirements)
    
    print(f"Domaine dev détecté: {dev_analysis}")
    print(f"Mots-clés dev: {dev_keywords[:5]}")

if __name__ == "__main__":
    debug_cybersecurity_generation()
