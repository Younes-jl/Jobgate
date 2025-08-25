#!/usr/bin/env python
"""
Script de test rapide pour achyounes737@gmail.com
"""
import os
import django
from django.conf import settings

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prototype.settings')
django.setup()

from django.core.mail import send_mail

def test_email_younes():
    """Test d'envoi d'email avec votre adresse"""
    try:
        print("🧪 Test d'envoi d'email JobGate...")
        print(f"📧 De: {settings.DEFAULT_FROM_EMAIL}")
        print(f"📧 À: achyounes737@gmail.com")
        print("📧 Envoi en cours...")
        
        result = send_mail(
            subject='✅ Test JobGate - Invitation Candidat',
            message="""
Bonjour,

Ceci est un test d'envoi d'email d'invitation depuis JobGate.

Vous êtes invité(e) à passer un entretien vidéo pour le poste de développeur.

Lien d'entretien: http://localhost:3000/interview/test-123

Cordialement,
L'équipe JobGate
            """,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=['achyounes737@gmail.com'],
            fail_silently=False,
        )
        
        if result == 1:
            print("✅ EMAIL ENVOYÉ AVEC SUCCÈS!")
            print("📱 Vérifiez votre boîte email (y compris les spams)")
            print("🎯 SendGrid fonctionne parfaitement!")
            return True
        else:
            print(f"⚠️ Résultat inattendu: {result}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur lors de l'envoi: {e}")
        print("\n🔧 SOLUTION:")
        if "does not match a verified Sender Identity" in str(e):
            print("1. Allez sur: https://app.sendgrid.com/settings/sender_auth")
            print("2. Cliquez sur 'Create a Single Sender'")
            print("3. Utilisez l'email: achyounes737@gmail.com")
            print("4. Vérifiez votre email après création")
            print("5. Relancez ce test")
        return False

if __name__ == '__main__':
    print("📧 Test SendGrid JobGate - achyounes737@gmail.com")
    print("=" * 55)
    
    # Afficher la configuration actuelle
    print(f"🔧 Configuration email:")
    print(f"   - Backend: {settings.EMAIL_BACKEND}")
    print(f"   - Host: {settings.EMAIL_HOST}")
    print(f"   - From: {settings.DEFAULT_FROM_EMAIL}")
    
    api_key = os.environ.get('SENDGRID_API_KEY', 'Non configuré')
    if api_key.startswith('SG.'):
        print(f"   - API Key: ✅ Configurée")
    else:
        print(f"   - API Key: ❌ Non configurée")
    
    print("\n" + "=" * 55)
    
    success = test_email_younes()
    
    if success:
        print("\n🎉 FÉLICITATIONS!")
        print("📧 L'envoi d'emails fonctionne parfaitement")
        print("🚀 Votre fonction d'invitation candidats est prête!")
    else:
        print("\n📋 PROCHAINES ÉTAPES:")
        print("1. Configurez Single Sender dans SendGrid")
        print("2. Utilisez l'email: achyounes737@gmail.com")
        print("3. Vérifiez l'email de confirmation")
        print("4. Relancez ce test")
