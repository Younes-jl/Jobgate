#!/usr/bin/env python
"""
Script de test pour vérifier l'envoi d'emails avec SendGrid
"""
import os
import django
from django.conf import settings

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prototype.settings')
django.setup()

from django.core.mail import send_mail
from django.core.mail import EmailMessage

def test_simple_email():
    """Test d'envoi d'email simple"""
    try:
        print("🧪 Test 1: Envoi d'email simple...")
        result = send_mail(
            subject='Test JobGate - Email Simple',
            message='Ceci est un test d\'envoi d\'email depuis JobGate via SendGrid.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=['test@gmail.com'],  # Remplacez par votre email
            fail_silently=False,
        )
        print(f"✅ Email envoyé avec succès! Résultat: {result}")
        return True
    except Exception as e:
        print(f"❌ Erreur lors de l'envoi: {e}")
        return False

def test_html_email():
    """Test d'envoi d'email HTML"""
    try:
        print("\n🧪 Test 2: Envoi d'email HTML...")
        html_content = """
        <html>
        <body>
            <h2>🎯 Test JobGate</h2>
            <p>Ceci est un email de test avec du contenu HTML.</p>
            <p><strong>SendGrid fonctionne correctement!</strong></p>
            <hr>
            <small>Envoyé depuis JobGate</small>
        </body>
        </html>
        """
        
        email = EmailMessage(
            subject='Test JobGate - Email HTML',
            body=html_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=['test@gmail.com'],  # Remplacez par votre email
        )
        email.content_subtype = 'html'
        result = email.send()
        print(f"✅ Email HTML envoyé avec succès! Résultat: {result}")
        return True
    except Exception as e:
        print(f"❌ Erreur lors de l'envoi HTML: {e}")
        return False

def check_settings():
    """Vérifier les paramètres email"""
    print("🔧 Vérification des paramètres...")
    print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    
    api_key = os.environ.get('SENDGRID_API_KEY', 'Non configuré')
    if api_key.startswith('SG.'):
        print(f"SENDGRID_API_KEY: Configuré (commence par SG.)")
    else:
        print(f"SENDGRID_API_KEY: {api_key}")

if __name__ == '__main__':
    print("📧 Test de configuration SendGrid pour JobGate")
    print("=" * 50)
    
    check_settings()
    
    print("\n" + "=" * 50)
    print("⚠️  IMPORTANT: Remplacez 'test@gmail.com' par votre vraie adresse email!")
    print("=" * 50)
    
    # Tester l'envoi d'emails
    test_simple_email()
    test_html_email()
    
    print("\n✅ Script de test prêt!")
    print("📝 Instructions:")
    print("1. Ouvrez ce fichier")
    print("2. Remplacez 'test@example.com' par votre email")
    print("3. Décommentez les lignes test_simple_email() et test_html_email()")
    print("4. Relancez le script")
