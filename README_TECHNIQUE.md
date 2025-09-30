# JobGate - Plateforme d'Entretiens Vidéo IA

## 📋 Vue d'ensemble

JobGate est une plateforme complète d'entretiens vidéo automatisés avec évaluation par intelligence artificielle. Elle permet aux recruteurs de créer des campagnes d'entretiens, générer des questions automatiquement, et évaluer les candidats grâce à des modèles IA gratuits.

## 🏗️ Architecture du Système

```mermaid
graph TB
    subgraph "Frontend (React.js)"
        A[Interface Recruteur]
        B[Interface Candidat]
        C[Dashboard Évaluation]
    end
    
    subgraph "Backend (Django REST)"
        D[API REST]
        E[Authentification JWT]
        F[Gestion Campagnes]
        G[Service IA]
    end
    
    subgraph "Base de Données"
        H[(PostgreSQL)]
    end
    
    subgraph "Services Externes"
        I[Cloudinary - Stockage Vidéo]
        J[SendGrid - Emails]
        K[Google Gemini - IA]
        L[Whisper - Transcription]
    end
    
    A --> D
    B --> D
    C --> D
    D --> H
    G --> K
    G --> L
    D --> I
    D --> J
```

## 🛠️ Stack Technique

### Backend
- **Framework**: Django 5.2.5 + Django REST Framework 3.16.0
- **Base de données**: PostgreSQL 16
- **Authentification**: JWT (djangorestframework_simplejwt)
- **Stockage vidéo**: Cloudinary
- **Email**: SendGrid
- **IA**: Google Gemini, OpenAI Whisper, VADER, TextBlob

### Frontend
- **Framework**: React.js 19.1.1
- **UI**: Bootstrap 5.3.7 + React Bootstrap 2.10.10
- **Routing**: React Router DOM 7.8.0
- **HTTP Client**: Axios 1.11.0
- **Authentification**: JWT Decode 4.0.0

### Infrastructure
- **Containerisation**: Docker + Docker Compose
- **Base de données**: PostgreSQL avec optimisations de performance
- **Reverse Proxy**: Nginx (production)

## 📦 Modèles de Données Principaux

### Utilisateurs et Authentification
- **CustomUser**: Système d'authentification avec rôles (RECRUTEUR/CANDIDAT)
- **Profils**: Informations détaillées des utilisateurs

### Gestion des Entretiens
- **JobOffer**: Offres d'emploi avec types de contrats
- **InterviewCampaign**: Campagnes d'entretiens liées aux offres
- **InterviewQuestion**: Questions avec types (technique/comportementale/générale)
- **InterviewAnswer**: Réponses vidéo avec métadonnées et scores
- **CampaignLink**: Liens sécurisés avec tokens d'expiration

### Évaluation IA
- **AIEvaluation**: Résultats d'analyse IA des réponses
- **EvaluationCriteria**: Critères d'évaluation personnalisables

## 🚀 Installation et Configuration

### Prérequis
- **Docker** et **Docker Compose**
- **Git**
- **Node.js** 18+ (pour développement local)
- **Python** 3.11+ (pour développement local)

### 1. Clonage du Projet
```bash
git clone https://github.com/votre-organisation/jobgate.git
cd jobgate
```

### 2. Configuration des Variables d'Environnement

Copiez le fichier d'exemple et configurez vos clés API :
```bash
cp .env.example .env
```

**Variables obligatoires à configurer dans `.env` :**
```env
# Base de données (déjà configuré pour Docker)
POSTGRES_NAME=jobgatedb
POSTGRES_USER=jobgateuser
POSTGRES_PASSWORD=jobgatepass
POSTGRES_HOST=db

# Cloudinary (Stockage vidéo)
CLOUDINARY_CLOUD_NAME=votre-cloud-name
CLOUDINARY_API_KEY=votre-api-key
CLOUDINARY_API_SECRET=votre-api-secret

# SendGrid (Emails)
SENDGRID_API_KEY=votre-sendgrid-api-key
DEFAULT_FROM_EMAIL=JobGate <votre-email@domaine.com>

# Google Gemini (IA - Gratuit 15 req/min)
GOOGLE_API_KEY=votre-google-gemini-api-key

# URL Frontend
FRONTEND_BASE_URL=http://localhost:3000
```

### 3. Démarrage avec Docker (Recommandé)

```bash
# Démarrage de tous les services
docker-compose up -d

# Vérification des logs
docker-compose logs -f

# Arrêt des services
docker-compose down
```

**Services disponibles :**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Base de données**: localhost:5432

### 4. Installation Locale (Développement)

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

## 🤖 Configuration des Modèles IA

### Modèles Intégrés (100% Gratuits)

1. **Google Gemini** (Analyse de contenu)
   - Modèle: `gemini-1.5-flash`
   - Limite: 15 requêtes/minute
   - Configuration: `GOOGLE_API_KEY`

2. **OpenAI Whisper** (Transcription audio)
   - Modèle: `whisper-base` (local)
   - Installation automatique via requirements.txt
   - Pas de limite de requêtes

3. **VADER** (Analyse de sentiment)
   - Modèle local, pas de configuration requise
   - Analyse du sentiment des réponses

4. **TextBlob** (Analyse linguistique)
   - Modèle local, pas de configuration requise
   - Analyse grammaticale et linguistique

### Obtenir une Clé API Google Gemini (Gratuite)

1. Allez sur [Google AI Studio](https://aistudio.google.com/)
2. Créez un compte Google si nécessaire
3. Cliquez sur "Get API Key"
4. Créez un nouveau projet ou sélectionnez un projet existant
5. Copiez la clé API générée dans votre fichier `.env`

## 📋 Fonctionnalités Principales

### Pour les Recruteurs
- ✅ Création et gestion des offres d'emploi
- ✅ Configuration de campagnes d'entretiens
- ✅ Génération automatique de questions par IA
- ✅ Questions comportementales prédéfinies (6 catégories)
- ✅ Évaluation automatique des réponses vidéo
- ✅ Dashboard complet d'évaluation des candidats
- ✅ Système de notifications email

### Pour les Candidats
- ✅ Interface d'entretien intuitive
- ✅ Enregistrement vidéo direct dans le navigateur
- ✅ Questions séquentielles avec minuteur
- ✅ Prévisualisation avant soumission

### Évaluation IA Automatique
- ✅ **Transcription automatique** des réponses vidéo
- ✅ **Analyse de sentiment** (positif/négatif/neutre)
- ✅ **Évaluation du contenu** (pertinence, structure)
- ✅ **Score de confiance** basé sur l'analyse vocale
- ✅ **Feedback détaillé** avec forces et faiblesses
- ✅ **Score global** sur 100 points

## 🔧 Scripts Utiles

### Développement
```bash
# Nettoyage Docker complet
./clean-docker.ps1

# Démarrage développement
./start-dev.ps1

# Correction des migrations
./fix-migrations.ps1
```

### Tests
```bash
# Test de l'intégration IA
python test_ai_integration.py

# Test des questions générées
python test_ai_questions.py

# Test de l'évaluation complète
python test_recruiter_evaluation.py
```

## 🚀 Déploiement Production

### 1. Configuration Production
```env
# Variables supplémentaires pour production
DEBUG=False
ALLOWED_HOSTS=votre-domaine.com,www.votre-domaine.com
CORS_ALLOWED_ORIGINS=https://votre-domaine.com

# Base de données production
DATABASE_URL=postgresql://user:password@host:port/database

# Sécurité
SECRET_KEY=votre-secret-key-securise
SECURE_SSL_REDIRECT=True
```

### 2. Docker Production
```bash
# Build des images de production
docker-compose -f docker-compose.prod.yml build

# Démarrage production
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Migrations et Données Initiales
```bash
# Migrations de base de données
docker-compose exec backend python manage.py migrate

# Création d'un superutilisateur
docker-compose exec backend python manage.py createsuperuser

# Collecte des fichiers statiques
docker-compose exec backend python manage.py collectstatic
```

## 🔒 Sécurité

### Authentification
- **JWT Tokens** avec expiration automatique
- **Refresh tokens** pour sessions longues
- **Liens temporaires** avec tokens d'expiration pour les entretiens

### Protection des Données
- **CORS** configuré pour les domaines autorisés
- **Validation des données** côté backend et frontend
- **Stockage sécurisé** des vidéos sur Cloudinary
- **Variables d'environnement** pour les clés sensibles

## 📊 Monitoring et Logs

### Logs Docker
```bash
# Logs en temps réel
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Health Checks
- **Backend**: http://localhost:8000/api/
- **Base de données**: Intégré dans docker-compose
- **Frontend**: http://localhost:3000

## 🐛 Dépannage

### Problèmes Courants

1. **Erreur de connexion à la base de données**
   ```bash
   docker-compose down
   docker-compose up -d db
   # Attendre que PostgreSQL soit prêt
   docker-compose up -d backend frontend
   ```

2. **Problème de permissions Docker**
   ```bash
   sudo chown -R $USER:$USER .
   ```

3. **Erreur de migration Django**
   ```bash
   docker-compose exec backend python manage.py makemigrations
   docker-compose exec backend python manage.py migrate
   ```

4. **Problème de modules Node.js**
   ```bash
   docker-compose exec frontend npm install
   ```

## 📞 Support et Contact

### Équipe de Développement
- **Lead Developer**: Younes
- **Email**: achyounes737@gmail.com

### Documentation Technique
- **Architecture IA**: Voir `AI_MODELS_DOCUMENTATION.md`
- **Configuration IA**: Voir `SETUP_AI_EVALUATION.md`
- **Guide Firebase**: Voir `FIREBASE_SETUP.md`

## 🎯 Prochaines Étapes

### Améliorations Prévues
- [ ] Interface d'administration avancée
- [ ] Rapports et analytics détaillés
- [ ] Intégration de nouveaux modèles IA
- [ ] API mobile pour application native
- [ ] Système de notifications en temps réel

### Contribution
1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Committez vos changements (`git commit -am 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créez une Pull Request

---

**Version**: 1.0.0  
**Dernière mise à jour**: Septembre 2024  
**Licence**: Propriétaire - JobGate Team
