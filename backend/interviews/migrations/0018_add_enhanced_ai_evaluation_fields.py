# Safe migration for enhanced AI evaluation fields

from django.db import migrations, models


def add_ai_evaluation_fields_safely(apps, schema_editor):
    """Ajoute les champs d'évaluation IA de manière sécurisée"""
    from django.db import connection
    
    # Liste des champs à vérifier et ajouter
    fields_to_check = [
        ('communication_score', 'ALTER TABLE interviews_aievaluation ADD COLUMN communication_score DOUBLE PRECISION NULL'),
        ('confidence_score', 'ALTER TABLE interviews_aievaluation ADD COLUMN confidence_score DOUBLE PRECISION NULL'),
        ('relevance_score', 'ALTER TABLE interviews_aievaluation ADD COLUMN relevance_score DOUBLE PRECISION NULL'),
        ('technical_score', 'ALTER TABLE interviews_aievaluation ADD COLUMN technical_score DOUBLE PRECISION NULL'),
        ('strengths', 'ALTER TABLE interviews_aievaluation ADD COLUMN strengths TEXT NULL'),
        ('weaknesses', 'ALTER TABLE interviews_aievaluation ADD COLUMN weaknesses TEXT NULL'),
        ('recommendations', 'ALTER TABLE interviews_aievaluation ADD COLUMN recommendations TEXT NULL'),
        ('overall_impression', 'ALTER TABLE interviews_aievaluation ADD COLUMN overall_impression TEXT NULL'),
        ('question_context', 'ALTER TABLE interviews_aievaluation ADD COLUMN question_context TEXT NULL'),
        ('expected_skills_met', 'ALTER TABLE interviews_aievaluation ADD COLUMN expected_skills_met JSONB DEFAULT \'[]\'::jsonb'),
        ('improvement_areas', 'ALTER TABLE interviews_aievaluation ADD COLUMN improvement_areas TEXT NULL'),
    ]
    
    with connection.cursor() as cursor:
        # Vérifier quels champs existent déjà
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='interviews_aievaluation'
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        
        # Ajouter seulement les champs manquants
        for field_name, sql_command in fields_to_check:
            if field_name not in existing_columns:
                try:
                    cursor.execute(sql_command)
                except Exception as e:
                    print(f"Erreur lors de l'ajout du champ {field_name}: {e}")


def reverse_add_ai_evaluation_fields(apps, schema_editor):
    """Supprime les champs d'évaluation IA (pour rollback)"""
    pass  # Ne rien faire pour éviter la perte de données


class Migration(migrations.Migration):

    dependencies = [
        ('interviews', '0017_rename_interviews_notificat_recipie_idx_interviews__recipie_d337ff_idx_and_more'),
    ]

    operations = [
        migrations.RunPython(add_ai_evaluation_fields_safely, reverse_add_ai_evaluation_fields),
    ]
