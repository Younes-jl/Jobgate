# 🧪 Guide de Test SendGrid pour JobGate

## ✅ Diagnostic actuel

Votre configuration SendGrid est **correctement installée** ! 

### État actuel :
- ✅ SendGrid API Key configurée
- ✅ SMTP configuré (smtp.sendgrid.net:587)
- ✅ Variables d'environnement détectées
- ✅ Docker containers opérationnels

### ⚠️ Action nécessaire : Vérifier l'identité de l'expéditeur

L'erreur indique que vous devez configurer une **Sender Identity** dans SendGrid.

## 🔧 Configuration requise dans SendGrid

### Option 1 : Domain Authentication (Recommandée pour production)
1. **Dans SendGrid Dashboard** → `Settings` → `Sender Authentication`
2. **Cliquez sur "Authenticate Your Domain"**
3. **Ajoutez votre domaine** (ex: jobgate.com)
4. **Suivez les instructions DNS** de SendGrid
5. **Utilisez ensuite** : `DEFAULT_FROM_EMAIL=JobGate <noreply@votre-domaine.com>`

### Option 2 : Single Sender Verification (Plus simple pour tests)
1. **Dans SendGrid Dashboard** → `Settings` → `Sender Authentication`
2. **Cliquez sur "Create a Single Sender"**
3. **Remplissez le formulaire** :
   - From Name: `JobGate`
   - From Email Address: `votre-email@gmail.com` (votre vrai email)
   - Reply To: `votre-email@gmail.com`
   - Company Address: Votre adresse
4. **Vérifiez votre email** en cliquant sur le lien reçu
5. **Modifiez votre .env** :
   ```
   DEFAULT_FROM_EMAIL=JobGate <votre-email@gmail.com>
   ```

## 🧪 Tests à effectuer

### Test 1 : Configuration Single Sender (plus rapide)
```bash
# 1. Créez un Single Sender avec votre email
# 2. Modifiez backend/.env avec votre email vérifié
# 3. Testez :
docker exec -it projet-video-interview-jobgate-backend-1 python test_email.py
```

### Test 2 : Test manuel via Django shell
```bash
docker exec -it projet-video-interview-jobgate-backend-1 python manage.py shell
```
```python
from django.core.mail import send_mail
send_mail(
    'Test JobGate', 
    'Email d\'invitation test', 
    'JobGate <votre-email-verifie@gmail.com>',  # Votre email vérifié
    ['destinataire@email.com'],  # Email de destination
    fail_silently=False
)
```

### Test 3 : Test via votre application
Une fois la Sender Identity configurée, testez directement via l'interface :
1. Créez une offre d'emploi
2. Ajoutez un candidat  
3. Cliquez sur "Inviter"
4. Vérifiez la réception de l'email

## 📧 Types d'emails JobGate

Votre application enverra automatiquement :
- **Invitations d'entretien** aux candidats
- **Liens de session vidéo** pour les entretiens
- **Notifications** aux recruteurs

## 🔍 Diagnostic des erreurs

### Erreur "Sender Identity" → Solution :
Configurez une Sender Identity dans SendGrid (voir options ci-dessus)

### Erreur "Authentication failed" → Solutions :
- Vérifiez la clé API SendGrid
- Vérifiez les variables d'environnement
- Redémarrez les containers

### Erreur "Rate limit" → Solutions :
- Compte gratuit limité à 100 emails/jour
- Espacez vos tests

## 🎯 Configuration recommandée pour l'équipe

Pour un projet d'équipe, utilisez **Single Sender** avec un email dédié au projet :
1. Créez `jobgate.projet@gmail.com`
2. Configurez comme Single Sender
3. Partagez les credentials avec l'équipe
4. Utilisez `DEFAULT_FROM_EMAIL=JobGate Project <jobgate.projet@gmail.com>`

---

## 🚀 Prochaine étape

**Configurez votre Sender Identity** et relancez les tests !
