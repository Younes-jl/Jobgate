#!/usr/bin/env python
"""
Script de test pour valider la génération de questions IA spécifiques
"""
import os
import sys
import django

# Configuration Django
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prototype.settings')
django.setup()

from interviews.ai_service import AIInterviewQuestionGenerator

def test_question_generation():
    """Test avec différents types d'offres d'emploi"""
    
    # Initialisation du générateur
    generator = AIInterviewQuestionGenerator()
    
    # Test 1: Ingénieur Civil
    print("🔍 TEST 1: Ingénieur Civil")
    print("=" * 50)
    
    offer_title = "Ingénieur Civil - Projets BTP"
    offer_description = """
    Nous recherchons un ingénieur civil expérimenté pour superviser nos projets de construction.
    Vous serez responsable de la conception des structures, du suivi de chantier et du respect des normes.
    Maîtrise d'AutoCAD et des normes marocaines requise.
    """
    requirements = "AutoCAD, normes NM, gestion de projet, béton armé"
    
    questions = generator.generate_questions(
        offer_title=offer_title,
        offer_description=offer_description,
        requirements=requirements,
        number_of_questions=3,
        difficulty='medium'
    )
    
    print(f"Questions générées: {len(questions)}")
    for i, q in enumerate(questions, 1):
        print(f"{i}. {q['question']}")
        print(f"   Type: {q['type']} | Difficulté: {q['difficulty']}")
        print()
    
    # Test 2: Développeur React
    print("🔍 TEST 2: Développeur React")
    print("=" * 50)
    
    offer_title = "Développeur Frontend React Senior"
    offer_description = """
    Rejoignez notre équipe pour développer des applications web modernes avec React.
    Vous travaillerez sur des projets e-commerce avec Redux, TypeScript et optimisation des performances.
    """
    requirements = "React, Redux, TypeScript, JavaScript, HTML/CSS, Git"
    
    questions = generator.generate_questions(
        offer_title=offer_title,
        offer_description=offer_description,
        requirements=requirements,
        number_of_questions=3,
        difficulty='hard'
    )
    
    print(f"Questions générées: {len(questions)}")
    for i, q in enumerate(questions, 1):
        print(f"{i}. {q['question']}")
        print(f"   Type: {q['type']} | Difficulté: {q['difficulty']}")
        print()
    
    # Test 3: Analyste Financier
    print("🔍 TEST 3: Analyste Financier")
    print("=" * 50)
    
    offer_title = "Analyste Financier - Risques de Crédit"
    offer_description = """
    Poste d'analyste financier spécialisé dans l'évaluation des risques de crédit.
    Analyse des dossiers de financement, modélisation financière et reporting.
    Maîtrise d'Excel avancé et des outils de risk management requis.
    """
    requirements = "Excel, modélisation financière, risk management, analyse crédit"
    
    questions = generator.generate_questions(
        offer_title=offer_title,
        offer_description=offer_description,
        requirements=requirements,
        number_of_questions=3,
        difficulty='medium'
    )
    
    print(f"Questions générées: {len(questions)}")
    for i, q in enumerate(questions, 1):
        print(f"{i}. {q['question']}")
        print(f"   Type: {q['type']} | Difficulté: {q['difficulty']}")
        print()

if __name__ == "__main__":
    test_question_generation()
