# 🚀 Premier Déploiement JobGate - Guide Rapide

## ⚡ Démarrage Rapide (5 minutes)

### 1. Clonage et Configuration Initiale
```bash
# Cloner le projet
git clone https://github.com/votre-organisation/jobgate.git
cd jobgate

# Copier et configurer les variables d'environnement
cp .env.example .env
```

### 2. Configuration Minimale Requise

Éditez le fichier `.env` avec ces valeurs **OBLIGATOIRES** :

```env
# === CLÉS API REQUISES ===
# Google Gemini (GRATUIT - 15 req/min)
GOOGLE_API_KEY=votre-cle-google-gemini

# Cloudinary (Stockage vidéo)
CLOUDINARY_CLOUD_NAME=votre-cloud-name
CLOUDINARY_API_KEY=votre-api-key  
CLOUDINARY_API_SECRET=votre-api-secret

# SendGrid (Emails)
SENDGRID_API_KEY=votre-sendgrid-api-key
DEFAULT_FROM_EMAIL=JobGate <votre-email@domaine.com>

# === CONFIGURATION AUTOMATIQUE ===
# Ces valeurs sont déjà configurées pour Docker
POSTGRES_NAME=jobgatedb
POSTGRES_USER=jobgateuser
POSTGRES_PASSWORD=jobgatepass
POSTGRES_HOST=db
FRONTEND_BASE_URL=http://localhost:3000
```

### 3. Démarrage avec Docker
```bash
# Démarrer tous les services
docker-compose up -d

# Vérifier que tout fonctionne
docker-compose ps
```

### 4. Accès aux Services
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/
- **Admin Django**: http://localhost:8000/admin/

## 🔑 Obtention des Clés API (Gratuit)

### Google Gemini API (IA - GRATUIT)
1. Aller sur [Google AI Studio](https://aistudio.google.com/)
2. Se connecter avec un compte Google
3. Cliquer sur "Get API Key"
4. Créer un nouveau projet
5. Copier la clé générée

### Cloudinary (Stockage Vidéo - GRATUIT)
1. Créer un compte sur [Cloudinary](https://cloudinary.com/)
2. Aller dans Dashboard
3. Copier : Cloud Name, API Key, API Secret

### SendGrid (Emails - GRATUIT)
1. Créer un compte sur [SendGrid](https://sendgrid.com/)
2. Aller dans Settings > API Keys
3. Créer une nouvelle API Key
4. Copier la clé générée

## 🧪 Test Rapide du Système

### 1. Création d'un Compte Admin
```bash
docker-compose exec backend python manage.py createsuperuser
```

### 2. Test des Fonctionnalités
1. **Frontend** : Aller sur http://localhost:3000
2. **Inscription** : Créer un compte recruteur
3. **Campagne** : Créer une campagne d'entretien
4. **Questions IA** : Tester la génération automatique
5. **Admin** : Vérifier http://localhost:8000/admin/

## 🐛 Dépannage Rapide

### Problème : Services ne démarrent pas
```bash
# Vérifier les logs
docker-compose logs

# Redémarrer proprement
docker-compose down
docker-compose up -d
```

### Problème : Erreur de base de données
```bash
# Réinitialiser la base de données
docker-compose down -v
docker-compose up -d
```

### Problème : Frontend ne se charge pas
```bash
# Reconstruire le frontend
docker-compose build frontend
docker-compose up -d frontend
```

## 📋 Checklist de Validation

- [ ] **Docker** : `docker-compose ps` montre tous les services "Up"
- [ ] **Frontend** : http://localhost:3000 accessible
- [ ] **Backend** : http://localhost:8000/api/ retourne du JSON
- [ ] **Admin** : http://localhost:8000/admin/ accessible
- [ ] **Base de données** : Connexion OK (visible dans les logs backend)
- [ ] **IA** : Génération de questions fonctionne
- [ ] **Emails** : Test d'envoi réussi
- [ ] **Vidéos** : Upload sur Cloudinary OK

## 🚀 Passage en Production

Une fois le test local réussi, suivre le **GUIDE_DEPLOIEMENT_EQUIPE.md** pour la production.

### Configuration Production Rapide
```bash
# Copier la configuration de production
cp docker-compose.yml docker-compose.prod.yml

# Modifier les variables pour la production
nano .env
```

Variables supplémentaires pour production :
```env
DEBUG=False
ALLOWED_HOSTS=votre-domaine.com
CORS_ALLOWED_ORIGINS=https://votre-domaine.com
SECRET_KEY=cle-secrete-production-64-caracteres-minimum
```

## 📞 Support Immédiat

### Erreurs Communes et Solutions

1. **"Port 3000 already in use"**
   ```bash
   docker-compose down
   sudo lsof -ti:3000 | xargs kill -9
   docker-compose up -d
   ```

2. **"Permission denied"**
   ```bash
   sudo chown -R $USER:$USER .
   ```

3. **"API Key invalid"**
   - Vérifier que les clés API sont correctes dans `.env`
   - Redémarrer : `docker-compose restart backend`

### Contact d'Urgence
- **Développeur Principal** : Younes - achyounes737@gmail.com
- **Documentation Complète** : Voir `README_TECHNIQUE.md`

---

**⏱️ Temps estimé de déploiement** : 5-10 minutes  
**💰 Coût** : 0€ (toutes les APIs utilisées sont gratuites)  
**🔧 Prérequis** : Docker + Docker Compose uniquement
