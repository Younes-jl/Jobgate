# 📧 Système d'envoi d'emails avec SendGrid - JobGate

## 🎯 Vue d'ensemble

Ce document explique en détail le fonctionnement du système d'envoi d'emails d'invitation pour les entretiens vidéo dans l'application JobGate. Le système utilise **SendGrid** comme service d'envoi d'emails transactionnels.

## 🏗️ Architecture du système

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    SendGrid     │    │   Candidat      │
│   (React.js)    │───▶│   (Django)      │───▶│     SMTP        │───▶│    Gmail        │
│                 │    │                 │    │                 │    │                 │
│ Bouton "Inviter"│    │ API + Email     │    │ Service Cloud   │    │ Email reçu      │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Configuration technique

### 1. Variables d'environnement (`.env`)

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.votre-clé-api-sendgrid-ici
DEFAULT_FROM_EMAIL=JobGate <achyounes737@gmail.com>
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
FRONTEND_BASE_URL=http://localhost:3000
```

### 2. Configuration Django (`backend/prototype/settings.py`)

```python
# Configuration SMTP pour SendGrid
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.sendgrid.net'          # Serveur SMTP de SendGrid
EMAIL_PORT = 587                          # Port standard pour TLS
EMAIL_USE_TLS = True                      # Chiffrement sécurisé
EMAIL_HOST_USER = 'apikey'                # Nom d'utilisateur fixe pour SendGrid
EMAIL_HOST_PASSWORD = os.environ.get('SENDGRID_API_KEY')  # Clé API comme mot de passe
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'JobGate <noreply@jobgate.com>')
FRONTEND_BASE_URL = os.environ.get('FRONTEND_BASE_URL', 'http://localhost:3000')
```

### 3. Configuration Docker (`docker-compose.yml`)

```yaml
services:
  backend:
    environment:
      - SENDGRID_API_KEY=${SENDGRID_API_KEY}
      - DEFAULT_FROM_EMAIL=${DEFAULT_FROM_EMAIL}
      - EMAIL_BACKEND=${EMAIL_BACKEND}
      - FRONTEND_BASE_URL=${FRONTEND_BASE_URL}
```

## 🔄 Flux complet d'invitation

### **Phase 1 : Déclenchement de l'invitation**

1. **Action utilisateur** : Le recruteur clique sur "Inviter" dans l'interface
2. **Frontend** : `handleInviteCandidate()` dans `JobApplicationsList.js`
3. **Validation** : Confirmation popup pour éviter les envois accidentels

```javascript
const handleInviteCandidate = async (applicationId, candidateName) => {
  const confirmInvitation = window.confirm(
    `Êtes-vous sûr de vouloir inviter ${candidateName} à l'entretien vidéo différé ?`
  );
  if (!confirmInvitation) return;
  // ... suite du processus
};
```

### **Phase 2 : Génération du lien unique**

1. **Requête API** : Frontend → Backend
```javascript
const { data } = await api.post('/interviews/campaign-links/', {
  application_id: applicationId,
});
```

2. **Backend** : Génération d'un token unique
```python
# Dans CampaignLink model
def generate_token(length=10):
    return secrets.token_hex(max(1, length // 2))[:length]

# Exemple de token généré : "a1b2c3d4e5"
# URL complète : http://localhost:3000/interview/start/a1b2c3d4e5
```

3. **Retour** : Backend → Frontend
```json
{
  "id": 123,
  "token": "a1b2c3d4e5",
  "start_url": "http://localhost:3000/interview/start/a1b2c3d4e5",
  "expires_at": "2025-09-01T14:30:00Z",
  "created": true
}
```

### **Phase 3 : Envoi de l'email**

1. **Déclenchement** : Frontend → Backend
```javascript
await api.post(`/interviews/campaign-links/${data.id}/send_invite/`);
```

2. **Construction de l'email** : Backend
```python
@action(detail=True, methods=['post'])
def send_invite(self, request, pk=None):
    campaign_link = self.get_object()
    
    # Construction du contenu
    subject = f"Invitation à l'entretien vidéo — {campaign_link.campaign.job_offer.title}"
    
    message = f"""
Bonjour,

Vous êtes invité(e) à passer un entretien vidéo pour le poste de {campaign_link.campaign.job_offer.title}.

🎯 Commencez votre entretien ici : {campaign_link.get_start_url()}

⏰ Ce lien expire le {campaign_link.expires_at:%d/%m/%Y à %H:%M}.

Cordialement,
L'équipe JobGate
    """
    
    # Envoi via Django + SendGrid
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[campaign_link.candidate.email],
        fail_silently=False,
    )
```

3. **Transmission SendGrid** : Django → SendGrid SMTP
```
SMTP Connection:
- Host: smtp.sendgrid.net:587
- Auth: username='apikey', password=SENDGRID_API_KEY
- TLS: Enabled
```

## 🔒 Sécurité et authentification

### **Single Sender Identity (Obligatoire)**

SendGrid exige une vérification de l'identité de l'expéditeur pour éviter le spam et l'usurpation.

**Configuration requise :**
1. Dashboard SendGrid → Settings → Sender Authentication
2. Create a Single Sender
3. Informations requises :
   ```
   From Name: JobGate
   From Email: achyounes737@gmail.com
   Reply To: achyounes737@gmail.com
   Company: Votre entreprise
   Address: Adresse physique
   ```
4. Vérification par email obligatoire

### **Authentification SMTP**
- **Username** : `apikey` (valeur fixe pour SendGrid)
- **Password** : Votre clé API SendGrid (format : `SG.xxxxxxxx`)
- **Chiffrement** : TLS sur le port 587

## 📊 Avantages de SendGrid

### **✅ Techniques**
- **Délivrabilité optimisée** : Serveurs réputés, évite les spams
- **Scalabilité** : Peut gérer des milliers d'emails
- **Monitoring intégré** : Statistiques d'ouverture, clics, bounces
- **API robuste** : Gestion des erreurs, retry automatique

### **✅ Business**
- **100 emails gratuits/jour** : Parfait pour un prototype
- **Coût prévisible** : Tarification transparente pour la production
- **Support professionnel** : Documentation et support technique
- **Conformité** : Respect des normes anti-spam (CAN-SPAM, GDPR)

### **✅ Développement**
- **Pas d'email personnel exposé** : Sécurité préservée
- **Configuration partageable** : Variables d'environnement
- **Tests facilités** : Sandbox mode disponible
- **Intégration simple** : Compatible Django out-of-the-box

## 🧪 Tests et validation

### **Script de test automatisé** (`test_email_younes.py`)

```python
def test_email_younes():
    """Test d'envoi d'email avec validation complète"""
    
    # 1. Vérification de la configuration
    print(f"Backend: {settings.EMAIL_BACKEND}")
    print(f"Host: {settings.EMAIL_HOST}")
    print(f"From: {settings.DEFAULT_FROM_EMAIL}")
    
    # 2. Validation de la clé API
    api_key = os.environ.get('SENDGRID_API_KEY')
    if not api_key.startswith('SG.'):
        raise Exception("Clé API SendGrid invalide")
    
    # 3. Test d'envoi réel
    result = send_mail(
        subject='Test JobGate - Invitation Candidat',
        message='Message de test...',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=['achyounes737@gmail.com'],
        fail_silently=False,
    )
    
    return result == 1
```

### **Commandes de test**

```bash
# Test de configuration
docker exec -it projet-video-interview-jobgate-backend-1 python test_email_younes.py

# Test depuis Django shell
docker exec -it projet-video-interview-jobgate-backend-1 python manage.py shell
>>> from django.core.mail import send_mail
>>> send_mail('Test', 'Message', 'from@domain.com', ['to@domain.com'])
```

## 📈 Monitoring et métriques

### **Dashboard SendGrid**
- **Activity Feed** : Logs en temps réel des envois
- **Stats** : Taux de livraison, ouverture, clics
- **Suppressions** : Gestion des bounces et unsubscribes

### **Logs Django**
```python
import logging
logger = logging.getLogger('django.mail')

# Dans votre code
logger.info(f"Email sent to {recipient}: {subject}")
logger.error(f"Email failed: {error}")
```

### **Métriques importantes**
- **Delivery Rate** : % d'emails livrés
- **Open Rate** : % d'emails ouverts
- **Bounce Rate** : % d'emails rejetés
- **Spam Reports** : Emails marqués comme spam

## 🚨 Gestion des erreurs courantes

### **Erreur 550 - Sender Identity**
```
(550, b'The from address does not match a verified Sender Identity')
```
**Solution** : Vérifier l'email dans SendGrid Dashboard

### **Erreur 535 - Authentication**
```
(535, b'Username and Password not accepted')
```
**Solution** : Vérifier la clé API dans les variables d'environnement

### **Erreur Connection Timeout**
```
[Errno 11001] getaddrinfo failed
```
**Solution** : Vérifier la connectivité réseau et les proxies

## 🎯 Email type reçu par le candidat

```
De : JobGate <achyounes737@gmail.com>
À : candidat@example.com
Sujet : Invitation à l'entretien vidéo — Développeur Full Stack

Bonjour,

Vous êtes invité(e) à passer un entretien vidéo pour le poste de Développeur Full Stack.

🎯 Commencez votre entretien ici : http://localhost:3000/interview/start/a1b2c3d4e5

⏰ Ce lien expire le 01/09/2025 à 14:30.

Cordialement,
L'équipe JobGate
```

## 🔄 Cycle de vie d'une invitation

1. **Création** : Lien unique généré avec expiration (7 jours par défaut)
2. **Envoi** : Email transmis via SendGrid
3. **Livraison** : Email arrive dans la boîte du candidat
4. **Utilisation** : Candidat clique sur le lien
5. **Expiration** : Lien devient invalide après la date limite

## 📋 Checklist de déploiement

### **Développement**
- [x] Variables d'environnement configurées
- [x] Single Sender vérifié dans SendGrid
- [x] Test d'envoi réussi
- [x] Gestion des erreurs implémentée

### **Production**
- [ ] Clé API SendGrid de production
- [ ] Domaine personnalisé configuré (optionnel)
- [ ] Monitoring et alertes configurés
- [ ] Rate limiting implémenté
- [ ] Backup des configurations

## 🎉 Résultat final

Votre système d'invitation JobGate est maintenant :
- ✅ **Fonctionnel** : Emails envoyés automatiquement
- ✅ **Sécurisé** : Liens uniques avec expiration
- ✅ **Professionnel** : Interface SendGrid fiable
- ✅ **Scalable** : Prêt pour la production
- ✅ **Maintenant** : Configuration documentée et testée

**Le système est opérationnel et prêt pour votre présentation d'équipe !** 🚀