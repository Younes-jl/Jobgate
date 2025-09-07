#!/usr/bin/env python
"""
Test spécifique pour la génération de questions cybersécurité
"""
import os
import sys
import django

# Configuration Django
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prototype.settings')
django.setup()

from interviews.ai_service import AIInterviewQuestionGenerator

def test_cybersecurity_questions():
    """Test avec une offre d'emploi cybersécurité"""
    
    generator = AIInterviewQuestionGenerator()
    
    print("🔒 TEST CYBERSÉCURITÉ")
    print("=" * 60)
    
    # Test avec offre cybersécurité
    offer_title = "Expert Cybersécurité - Audit et Tests de Pénétration"
    offer_description = """
    Nous recherchons un expert en cybersécurité pour renforcer notre équipe sécurité.
    Vous serez responsable des audits de sécurité, tests de pénétration et gestion des incidents.
    Maîtrise des outils Burp Suite, Metasploit, Nmap requis.
    Expérience en forensic numérique et analyse de malware appréciée.
    """
    requirements = "Burp Suite, Metasploit, Nmap, Wireshark, Kali Linux, CISSP, CEH, ISO 27001, OWASP"
    
    # Test analyse du domaine
    job_context = generator._deep_analyze_job_offer(offer_title, offer_description, requirements)
    
    print("🔍 ANALYSE DU POSTE:")
    print(f"Type détecté: {job_context['analysis']}")
    print(f"Secteur: {job_context['industry_sector']}")
    print(f"Mots-clés extraits: {job_context['keywords'][:5]}")
    print(f"Outils détectés: {job_context['tools_technologies'][:5]}")
    print()
    
    # Génération des questions
    questions = generator.generate_questions(
        offer_title=offer_title,
        offer_description=offer_description,
        requirements=requirements,
        number_of_questions=5,
        difficulty='medium'
    )
    
    print(f"📝 QUESTIONS GÉNÉRÉES: {len(questions)}")
    print("-" * 60)
    
    for i, q in enumerate(questions, 1):
        print(f"{i}. {q['question']}")
        print(f"   Type: {q['type']} | Difficulté: {q['difficulty']}")
        
        # Vérification que la question contient des termes cybersécurité
        cyber_terms = ['sécurité', 'security', 'pentest', 'audit', 'firewall', 'malware', 
                      'cryptographie', 'chiffrement', 'incident', 'vulnérabilité', 
                      'burp', 'metasploit', 'nmap', 'wireshark']
        
        question_lower = q['question'].lower()
        found_terms = [term for term in cyber_terms if term in question_lower]
        
        if found_terms:
            print(f"   ✅ Termes cybersécurité détectés: {found_terms[:3]}")
        else:
            print(f"   ❌ ATTENTION: Aucun terme cybersécurité détecté!")
        print()

if __name__ == "__main__":
    test_cybersecurity_questions()
