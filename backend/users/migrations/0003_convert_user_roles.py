from django.db import migrations

def convert_roles(apps, schema_editor):
    # Obtenir le modèle CustomUser depuis le registre des applications
    CustomUser = apps.get_model('users', 'CustomUser')
    
    # Mettre à jour les rôles ADMIN vers RECRUTEUR
    for user in CustomUser.objects.filter(role='ADMIN'):
        user.role = 'RECRUTEUR'
        user.save()
    
    # Mettre à jour les rôles USER vers CANDIDAT
    for user in CustomUser.objects.filter(role='USER'):
        user.role = 'CANDIDAT'
        user.save()
    
    # Gérer les rôles vides ou inconnus
    for user in CustomUser.objects.filter(role=''):
        user.role = 'CANDIDAT'  # Par défaut, les utilisateurs sans rôle sont des candidats
        user.save()

class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_alter_customuser_role'),
    ]

    operations = [
        migrations.RunPython(convert_roles),
    ]
