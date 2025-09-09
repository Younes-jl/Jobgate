# Generated manually for JobApplication fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('interviews', '0015_add_notification_model'),
    ]

    operations = [
        migrations.AddField(
            model_name='jobapplication',
            name='lettre_motivation',
            field=models.TextField(help_text='Lettre de motivation du candidat', verbose_name='Lettre de motivation', default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='jobapplication',
            name='filiere',
            field=models.CharField(help_text="Filière d'études ou domaine de spécialisation", max_length=255, verbose_name='Filière', default=''),
            preserve_default=False,
        ),
    ]
