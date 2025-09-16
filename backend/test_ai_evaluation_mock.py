#!/usr/bin/env python3
"""
Script de test pour l'évaluation IA avec service mock
Simule l'évaluation sans télécharger de vraies vidéos
"""

import os
import django
import json
from datetime import datetime

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prototype.settings')
django.setup()

from interviews.models import InterviewAnswer, AiEvaluation
from users.models import CustomUser


class MockAIVideoEvaluationService:
    """Service mock pour tester l'évaluation IA sans vraies vidéos"""
    
    def evaluate_interview_answer(self, answer_id: int) -> dict:
        """
        Simule une évaluation IA complète
        """
        try:
            # Récupérer la réponse
            answer = InterviewAnswer.objects.get(id=answer_id)
            
            # Simuler une transcription
            mock_transcription = f"Bonjour, je suis ravi de répondre à cette question sur {answer.question.text[:30]}... Je pense que mon expérience en développement web me permet d'apporter une valeur ajoutée à votre équipe. J'ai travaillé sur plusieurs projets utilisant React, Django et PostgreSQL."
            
            # Simuler une évaluation IA
            mock_evaluation = {
                "communication_score": 8.5,
                "relevance_score": 7.8,
                "confidence_score": 8.2,
                "overall_score": 8.2,
                "strengths": "Excellente articulation, exemples concrets, bonne structure de réponse",
                "weaknesses": "Pourrait développer davantage les aspects techniques, manque quelques détails sur l'expérience récente",
                "feedback": "Candidat prometteur avec une bonne capacité de communication. La réponse est bien structurée et montre une compréhension solide du domaine. Recommandation: approfondir les aspects techniques lors d'un prochain entretien."
            }
            
            # Créer ou mettre à jour l'évaluation IA
            ai_evaluation, created = AiEvaluation.objects.update_or_create(
                interview_answer=answer,
                defaults={
                    'transcription': mock_transcription,
                    'communication_score': mock_evaluation['communication_score'],
                    'relevance_score': mock_evaluation['relevance_score'],
                    'confidence_score': mock_evaluation['confidence_score'],
                    'overall_ai_score': mock_evaluation['overall_score'],
                    'strengths': mock_evaluation['strengths'],
                    'weaknesses': mock_evaluation['weaknesses'],
                    'ai_feedback': mock_evaluation['feedback'],
                    'status': 'completed',
                    'processing_time': 15.5,  # Simuler 15.5 secondes
                    'ai_provider': 'gemini'
                }
            )
            
            print(f"✅ Évaluation IA {'créée' if created else 'mise à jour'} pour la réponse {answer_id}")
            print(f"   Score global: {mock_evaluation['overall_score']}/10")
            print(f"   Communication: {mock_evaluation['communication_score']}/10")
            print(f"   Pertinence: {mock_evaluation['relevance_score']}/10")
            print(f"   Confiance: {mock_evaluation['confidence_score']}/10")
            
            return {
                'success': True,
                'evaluation_id': ai_evaluation.id,
                'scores': mock_evaluation,
                'transcription': mock_transcription
            }
            
        except InterviewAnswer.DoesNotExist:
            raise ValueError(f"Réponse d'entretien {answer_id} non trouvée")
        except Exception as e:
            raise Exception(f"Erreur lors de l'évaluation mock: {str(e)}")


def main():
    """Test du service mock d'évaluation IA"""
    print("🧪 Test du service mock d'évaluation IA")
    print("=" * 50)
    
    # Récupérer les réponses de test
    answers = InterviewAnswer.objects.filter(
        cloudinary_url__isnull=False
    ).order_by('id')
    
    if not answers.exists():
        print("❌ Aucune réponse avec URL Cloudinary trouvée")
        return
    
    print(f"📊 {answers.count()} réponses trouvées pour le test")
    
    # Initialiser le service mock
    service = MockAIVideoEvaluationService()
    
    # Tester chaque réponse
    for answer in answers[:3]:  # Limiter à 3 pour le test
        print(f"\n🎯 Test de la réponse {answer.id}")
        print(f"   Question: {answer.question.text[:60]}...")
        print(f"   Candidat: {answer.candidate.username}")
        
        try:
            result = service.evaluate_interview_answer(answer.id)
            print(f"   ✅ Évaluation réussie - ID: {result['evaluation_id']}")
            
        except Exception as e:
            print(f"   ❌ Erreur: {str(e)}")
    
    # Afficher le résumé
    print(f"\n📈 Résumé des évaluations:")
    evaluations = AiEvaluation.objects.filter(status='completed')
    print(f"   Total évaluations: {evaluations.count()}")
    
    if evaluations.exists():
        from django.db.models import Avg
        avg_score = evaluations.aggregate(
            avg_score=Avg('overall_ai_score')
        )['avg_score']
        print(f"   Score moyen: {avg_score:.1f}/10")
    
    print("\n🎉 Test terminé avec succès!")


if __name__ == "__main__":
    main()
