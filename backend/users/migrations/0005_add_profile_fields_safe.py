# Migration sécurisée pour ajouter les champs de profil utilisateur

from django.db import migrations, models


def add_profile_fields_safely(apps, schema_editor):
    """Ajoute les champs de profil de manière sécurisée"""
    from django.db import connection
    
    # Liste des champs à vérifier et ajouter
    fields_to_check = [
        'phone', 'date_of_birth', 'address', 'city', 'postal_code', 'country',
        'linkedin_profile', 'github_profile', 'portfolio_url', 'experience_years',
        'current_position', 'education_level', 'skills', 'bio', 'profile_updated_at'
    ]
    
    with connection.cursor() as cursor:
        # Vérifier quels champs existent déjà
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users_customuser'
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        
        # Ajouter seulement les champs manquants
        for field_name in fields_to_check:
            if field_name not in existing_columns:
                if field_name == 'phone':
                    cursor.execute('ALTER TABLE users_customuser ADD COLUMN phone VARCHAR(20) NULL')
                elif field_name == 'date_of_birth':
                    cursor.execute('ALTER TABLE users_customuser ADD COLUMN date_of_birth DATE NULL')
                elif field_name == 'address':
                    cursor.execute('ALTER TABLE users_customuser ADD COLUMN address VARCHAR(255) NULL')
                elif field_name == 'city':
                    cursor.execute('ALTER TABLE users_customuser ADD COLUMN city VARCHAR(100) NULL')
                elif field_name == 'postal_code':
                    cursor.execute('ALTER TABLE users_customuser ADD COLUMN postal_code VARCHAR(10) NULL')
                elif field_name == 'country':
                    cursor.execute("ALTER TABLE users_customuser ADD COLUMN country VARCHAR(100) DEFAULT 'Maroc'")
                elif field_name == 'linkedin_profile':
                    cursor.execute('ALTER TABLE users_customuser ADD COLUMN linkedin_profile TEXT NULL')
                elif field_name == 'github_profile':
                    cursor.execute('ALTER TABLE users_customuser ADD COLUMN github_profile TEXT NULL')
                elif field_name == 'portfolio_url':
                    cursor.execute('ALTER TABLE users_customuser ADD COLUMN portfolio_url TEXT NULL')
                elif field_name == 'experience_years':
                    cursor.execute('ALTER TABLE users_customuser ADD COLUMN experience_years VARCHAR(20) NULL')
                elif field_name == 'current_position':
                    cursor.execute('ALTER TABLE users_customuser ADD COLUMN current_position VARCHAR(200) NULL')
                elif field_name == 'education_level':
                    cursor.execute('ALTER TABLE users_customuser ADD COLUMN education_level VARCHAR(20) NULL')
                elif field_name == 'skills':
                    cursor.execute('ALTER TABLE users_customuser ADD COLUMN skills TEXT NULL')
                elif field_name == 'bio':
                    cursor.execute('ALTER TABLE users_customuser ADD COLUMN bio TEXT NULL')
                elif field_name == 'profile_updated_at':
                    cursor.execute('ALTER TABLE users_customuser ADD COLUMN profile_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()')


def reverse_add_profile_fields(apps, schema_editor):
    """Supprime les champs de profil (pour rollback)"""
    pass  # Ne rien faire pour éviter la perte de données


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_merge_20250812_1343'),
    ]

    operations = [
        migrations.RunPython(add_profile_fields_safely, reverse_add_profile_fields),
    ]
