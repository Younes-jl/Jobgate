# JobGate - Plateforme d'Entretiens Vidéo

JobGate est une plateforme d'entretiens vidéo qui facilite le processus de recrutement en permettant aux recruteurs de créer des offres d'emploi et aux candidats de postuler. Les candidats peuvent enregistrer des réponses vidéo aux questions prédéfinies, ce qui permet aux recruteurs d'évaluer leurs compétences et leur adéquation au poste.

## Configuration Rapide

### Prérequis
- Docker et Docker Compose
- Compte SendGrid (gratuit pour 100 emails/jour)

### Configuration Email avec SendGrid

1. **Créez un compte SendGrid** : [sendgrid.com](https://sendgrid.com)
2. **Obtenez votre clé API** :
   - Dashboard SendGrid → `Settings` → `API Keys`
   - Créez une clé avec permissions d'envoi d'emails
   - Copiez la clé (format: `SG.xxxxxxxxx`)

3. **Configuration** :
   ```bash
   # Copiez et éditez le fichier d'environnement
   cp backend/.env.example backend/.env
   # Remplacez SENDGRID_API_KEY par votre vraie clé API
   ```

### Démarrage

```bash
# Construction et démarrage
docker-compose up --build

# Accès :
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
```

### Test d'envoi d'emails

```bash
docker exec -it projet-video-interview-jobgate-backend-1 python manage.py shell
```
```python
from django.core.mail import send_mail
send_mail('Test JobGate', 'Test depuis JobGate', 'JobGate <noreply@jobgate.com>', ['votre@email.com'])
```

## Structure du Projet

Le projet utilise une architecture full-stack avec :

- **Backend** : API Django REST Framework
- **Frontend** : Application React
- **Déploiement** : Docker et docker-compose

### Structure des dossiers

```
projet-video-interview-jobGate/
│
├── backend/                     # API Django REST Framework
│   ├── prototype/               # Configuration Django principale
│   ├── users/                   # Application de gestion des utilisateurs
│   ├── manage.py                # Script de gestion Django
│   └── Dockerfile               # Configuration Docker pour le backend
│
├── frontend/                    # Application React
│   ├── public/                  # Fichiers statiques
│   ├── src/                     # Code source React
│   │   ├── Components/          # Composants React
│   │   │   ├── auth/            # Composants d'authentification
│   │   │   ├── Candidat/        # Interface utilisateur Candidat
│   │   │   └── Recruteur/       # Interface utilisateur Recruteur
│   │   ├── services/            # Services et API
│   │   └── utils/               # Utilitaires
│   └── Dockerfile               # Configuration Docker pour le frontend
│
├── docker-compose.yml           # Configuration docker-compose
├── clean-docker.ps1             # Script pour nettoyer les conteneurs Docker
└── start-dev.ps1                # Script pour démarrer l'environnement de développement
```

## Interfaces Utilisateur

L'application est conçue avec deux interfaces distinctes selon le rôle de l'utilisateur :

### Interface Recruteur (`Components/Recruteur/`)
- **RecruiterDashboard.js** : Tableau de bord principal du recruteur
- **JobOfferList.js** : Liste des offres d'emploi créées par le recruteur
- **CreateOfferWithCampaign.js** : Création d'une offre d'emploi avec campagne d'entretiens
- **JobApplicationsList.js** : Liste des candidatures pour une offre spécifique
- **OffresAvecCandidatures.js** : Liste des offres ayant reçu des candidatures

### Interface Candidat (`Components/Candidat/`)
- **CandidateDashboard.js** : Tableau de bord principal du candidat
- **JobOfferDetails.js** : Détails d'une offre d'emploi
- **jobOffersApi.js** : Fonctions API pour les offres d'emploi
- **CandidateStyles.css** : Styles spécifiques à l'interface candidat

### Module d'Authentification (`Components/auth/`)
- **LoginPage.js** : Page de connexion
- **useAuth.js** : Hook React pour la gestion de l'authentification
- **authApi.js** : Fonctions API pour l'authentification

## Configuration de l'Environnement de Développement

1. Cloner le dépôt
2. Installer Docker Desktop
3. Exécuter `docker-compose build` pour construire les images
4. Exécuter `docker-compose up` pour démarrer les conteneurs
5. L'application sera accessible à l'adresse http://localhost:3000

## Démarrage Rapide

Pour démarrer l'environnement de développement sous Windows :

```powershell
.\start-dev.ps1
```

Pour arrêter et nettoyer les conteneurs Docker :

```powershell
.\clean-docker.ps1
```

## Contribution

Pour contribuer au projet :

1. Gardez la structure des dossiers cohérente
2. Placez les nouveaux composants dans le dossier correspondant à l'interface (Candidat ou Recruteur)
3. Utilisez les conventions de nommage existantes
4. Documentez votre code avec des commentaires JSDoc
