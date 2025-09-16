#!/usr/bin/env python3
"""
Script pour créer des données de test avec URLs Cloudinary valides
pour tester l'évaluation IA dynamique
"""

import os
import sys
import django
from pathlib import Path
from dotenv import load_dotenv

# Charger les variables d'environnement depuis .env
BASE_DIR = Path(__file__).resolve().parent
env_path = BASE_DIR / '.env'
load_dotenv(env_path)

# Configuration Django
sys.path.append(str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prototype.settings')
django.setup()

from interviews.models import *
from users.models import CustomUser

def create_test_data():
    """Créer des données de test complètes"""
    print("🚀 Création des données de test...")
    
    # 1. Créer un recruteur de test
    recruiter, created = CustomUser.objects.get_or_create(
        username='recruiter_test',
        defaults={
            'email': 'recruiter@test.com',
            'role': 'RECRUTEUR',
            'first_name': 'Jean',
            'last_name': 'Recruteur'
        }
    )
    print(f"✅ Recruteur: {recruiter.username}")
    
    # 2. Créer un candidat de test
    candidate, created = CustomUser.objects.get_or_create(
        username='candidate_test',
        defaults={
            'email': 'candidate@test.com',
            'role': 'CANDIDAT',
            'first_name': 'Marie',
            'last_name': 'Candidate'
        }
    )
    print(f"✅ Candidat: {candidate.username}")
    
    # 3. Créer une offre d'emploi
    job_offer, created = JobOffer.objects.get_or_create(
        title='Développeur Full Stack - Test',
        defaults={
            'description': 'Poste de développeur pour tester l\'évaluation IA',
            'recruiter': recruiter,
            'location': 'Paris',
            'salary': '45000€',
            'contract_type': 'CDI'
        }
    )
    print(f"✅ Offre: {job_offer.title}")
    
    # 4. Créer une campagne d'entretien
    campaign, created = InterviewCampaign.objects.get_or_create(
        title='Campagne Test IA',
        defaults={
            'description': 'Campagne pour tester l\'évaluation IA',
            'job_offer': job_offer,
            'active': True
        }
    )
    print(f"✅ Campagne: {campaign.title}")
    
    # 5. Créer des questions d'entretien
    questions_data = [
        {
            'text': 'Parlez-moi de votre expérience en développement web.',
            'time_limit': 120,
            'order': 1
        },
        {
            'text': 'Comment gérez-vous le travail en équipe ?',
            'time_limit': 90,
            'order': 2
        },
        {
            'text': 'Décrivez un projet dont vous êtes fier.',
            'time_limit': 180,
            'order': 3
        }
    ]
    
    questions = []
    for q_data in questions_data:
        question, created = InterviewQuestion.objects.get_or_create(
            campaign=campaign,
            order=q_data['order'],
            defaults={
                'text': q_data['text'],
                'time_limit': q_data['time_limit']
            }
        )
        questions.append(question)
        print(f"✅ Question {question.order}: {question.text[:50]}...")
    
    # 6. Créer des réponses avec URLs de test accessibles
    # Utilisation de vidéos de test publiques pour les démonstrations
    test_cloudinary_urls = [
        {
            'public_id': 'sample_video_1',
            'url': 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
            'secure_url': 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'
        },
        {
            'public_id': 'sample_video_2', 
            'url': 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
            'secure_url': 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4'
        },
        {
            'public_id': 'sample_video_3',
            'url': 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4', 
            'secure_url': 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4'
        }
    ]
    
    answers = []
    for i, question in enumerate(questions):
        cloudinary_data = test_cloudinary_urls[i]
        
        answer, created = InterviewAnswer.objects.get_or_create(
            question=question,
            candidate=candidate,
            defaults={
                'cloudinary_public_id': cloudinary_data['public_id'],
                'cloudinary_url': cloudinary_data['url'],
                'cloudinary_secure_url': cloudinary_data['secure_url'],
                'duration': 90 + (i * 30),  # 90, 120, 150 secondes
                'file_size': 5000000 + (i * 1000000),  # 5MB, 6MB, 7MB
                'status': 'completed'
            }
        )
        answers.append(answer)
        print(f"✅ Réponse {i+1}: {answer.cloudinary_secure_url}")
    
    # 7. Créer une candidature
    application, created = JobApplication.objects.get_or_create(
        job_offer=job_offer,
        candidate=candidate,
        defaults={
            'status': 'under_review',
            'lettre_motivation': 'Je suis très motivé pour ce poste de développeur...',
            'filiere': 'Informatique'
        }
    )
    print(f"✅ Candidature: {application.status}")
    
    print("\n🎉 Données de test créées avec succès!")
    print(f"📊 Résumé:")
    print(f"   • Recruteur: {recruiter.username}")
    print(f"   • Candidat: {candidate.username}")
    print(f"   • Offre: {job_offer.title}")
    print(f"   • Campagne: {campaign.title}")
    print(f"   • Questions: {len(questions)}")
    print(f"   • Réponses vidéo: {len(answers)}")
    print(f"   • Candidature: {application.id}")
    
    print("\n🧪 Pour tester l'évaluation IA:")
    print("1. Connectez-vous en tant que recruteur (recruiter_test)")
    print("2. Allez sur la page d'évaluation des candidatures")
    print("3. Cliquez sur 'Lancer l'Analyse IA'")
    print("4. Les URLs Cloudinary de test seront utilisées")
    
    return {
        'recruiter': recruiter,
        'candidate': candidate,
        'job_offer': job_offer,
        'campaign': campaign,
        'questions': questions,
        'answers': answers,
        'application': application
    }

if __name__ == "__main__":
    try:
        data = create_test_data()
        print("\n✅ Script terminé avec succès!")
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
