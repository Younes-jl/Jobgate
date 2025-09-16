# Generated migration to remove global_score from RecruiterEvaluation

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('interviews', '0025_delete_aievaluation'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='recruiterevaluation',
            name='global_score',
        ),
    ]
