#!/usr/bin/env python3
"""
Script de test pour diagnostiquer le problème de sauvegarde des réponses d'entretien.
"""

import os
import django
import sys

# Configuration Django
sys.path.append('/c/Users/HP/Desktop/projet-video-interview-jobGate/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prototype.settings')
django.setup()

from interviews.models import InterviewAnswer, InterviewQuestion, CampaignLink, CustomUser
from django.db import transaction

def debug_interview_answers():
    """Diagnostic des réponses d'entretien existantes"""
    
    print("🔍 DIAGNOSTIC DES RÉPONSES D'ENTRETIEN")
    print("=" * 50)
    
    # 1. Compter les réponses totales
    total_answers = InterviewAnswer.objects.count()
    print(f"Total des réponses: {total_answers}")
    
    if total_answers == 0:
        print("❌ Aucune réponse trouvée dans la base de données")
        return
    
    # 2. Analyser les réponses par rôle de candidat
    recruiters_as_candidates = 0
    real_candidates = 0
    
    print("\n📋 ANALYSE DES RÉPONSES:")
    for answer in InterviewAnswer.objects.all()[:10]:  # Limiter à 10 pour le debug
        candidate_role = answer.candidate.role if hasattr(answer.candidate, 'role') else 'unknown'
        candidate_email = answer.candidate.email
        question_title = answer.question.campaign.title if answer.question and answer.question.campaign else 'N/A'
        
        print(f"- ID: {answer.id}")
        print(f"  Candidat: {candidate_email} (rôle: {candidate_role})")
        print(f"  Question de: {question_title}")
        print(f"  Créé le: {answer.created_at}")
        print()
        
        if candidate_role == 'recruiter':
            recruiters_as_candidates += 1
        elif candidate_role == 'candidate':
            real_candidates += 1
    
    print(f"🚨 PROBLÈME DÉTECTÉ:")
    print(f"  - Recruteurs stockés comme candidats: {recruiters_as_candidates}")
    print(f"  - Vrais candidats: {real_candidates}")
    
    # 3. Analyser les liens de campagne
    print(f"\n🔗 ANALYSE DES LIENS DE CAMPAGNE:")
    campaign_links = CampaignLink.objects.all()[:5]
    for link in campaign_links:
        candidate_info = "Non défini"
        if link.candidate:
            candidate_info = f"{link.candidate.email} ({link.candidate.role})"
        elif link.email:
            candidate_info = f"{link.email} (email seulement)"
        
        print(f"- Token: {link.token[:10]}...")
        print(f"  Candidat: {candidate_info}")
        print(f"  Email du lien: {link.email}")
        print()

def test_candidate_identification():
    """Test de l'identification des candidats"""
    print("\n🧪 TEST D'IDENTIFICATION DES CANDIDATS")
    print("=" * 50)
    
    # Créer un utilisateur test candidat s'il n'existe pas
    candidate_email = "test_candidate@example.com"
    try:
        test_candidate = CustomUser.objects.get(email=candidate_email)
        print(f"✅ Candidat test trouvé: {test_candidate.email} (rôle: {test_candidate.role})")
    except CustomUser.DoesNotExist:
        print(f"❌ Candidat test non trouvé: {candidate_email}")
        
        # Créer le candidat test
        test_candidate = CustomUser.objects.create_user(
            username="test_candidate",
            email=candidate_email,
            password="test123",
            role="candidate",
            first_name="Test",
            last_name="Candidat"
        )
        print(f"✅ Candidat test créé: {test_candidate.email}")
    
    return test_candidate

if __name__ == "__main__":
    debug_interview_answers()
    test_candidate_identification()
