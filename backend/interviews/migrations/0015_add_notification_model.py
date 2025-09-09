# Generated manually for notification system

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('interviews', '0013_aievaluation'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255, verbose_name='Titre')),
                ('message', models.TextField(verbose_name='Message')),
                ('notification_type', models.CharField(choices=[('APPLICATION_STATUS', 'Changement de statut de candidature'), ('INTERVIEW_INVITATION', "Invitation à un entretien"), ('INTERVIEW_REMINDER', "Rappel d'entretien"), ('JOB_MATCH', 'Nouvelle opportunité correspondante'), ('PROFILE_UPDATE', 'Mise à jour de profil'), ('SYSTEM', 'Notification système')], max_length=50, verbose_name='Type de notification')),
                ('priority', models.CharField(choices=[('LOW', 'Faible'), ('MEDIUM', 'Moyenne'), ('HIGH', 'Élevée'), ('URGENT', 'Urgente')], default='MEDIUM', max_length=10, verbose_name='Priorité')),
                ('is_read', models.BooleanField(default=False, verbose_name='Lu')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('read_at', models.DateTimeField(blank=True, null=True, verbose_name='Date de lecture')),
                ('action_url', models.URLField(blank=True, null=True, verbose_name="URL d'action")),
                ('campaign_link', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='interviews.campaignlink', verbose_name='Lien de campagne')),
                ('job_application', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='interviews.jobapplication', verbose_name='Candidature liée')),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL, verbose_name='Destinataire')),
            ],
            options={
                'verbose_name': 'Notification',
                'verbose_name_plural': 'Notifications',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['recipient', '-created_at'], name='interviews_notificat_recipie_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['recipient', 'is_read'], name='interviews_notificat_recipie_is_read_idx'),
        ),
    ]
