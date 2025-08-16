# Structure des composants React

Cette nouvelle organisation des composants suit une structure logique basée sur les fonctionnalités de l'application. Voici une explication de chaque dossier :

## 1. Auth
Contient tous les composants et services liés à l'authentification :
- `LoginPage.js` : Page de connexion
- `PrivateRoute.js` : Composant pour protéger les routes
- `useAuth.js` : Hook React personnalisé pour gérer l'état d'authentification
- `authApi.js` : Service API pour les opérations d'authentification

## 2. Dashboard
Divisé en deux sous-dossiers selon le type d'utilisateur :

### 2.1 Recruiter
- `RecruiterDashboard.js` : Tableau de bord pour les recruteurs

### 2.2 Candidate
- `CandidateDashboard.js` : Tableau de bord pour les candidats
- `CandidateStyles.css` : Styles spécifiques pour les composants candidat

## 3. JobOffer
Composants liés aux offres d'emploi :

### 3.1 List
- `JobOfferList.js` : Liste des offres d'emploi

### 3.2 Detail
- `JobOfferDetails.js` : Détails d'une offre d'emploi spécifique

### 3.3 Create
- `CreateOfferWithCampaign.js` : Formulaire de création d'une offre d'emploi

En plus, ce dossier contient :
- `jobOffersApi.js` : Service API pour les opérations sur les offres d'emploi

## 4. Application
Composants liés aux candidatures :

### 4.1 List
- `ApplicationsOverview.js` : Vue d'ensemble des candidatures
- `JobApplicationsList.js` : Liste des candidatures pour une offre d'emploi
- `MyApplicationsList.js` : Liste des candidatures d'un candidat

### 4.2 Detail
- `ApplicationDetail.js` : Détails d'une candidature spécifique
- `ApplicationDetailPage.js` : Page complète de détails d'une candidature

## 5. Interview
Composants liés aux entretiens :

### 5.1 Campaign
- `InterviewCampaign.js` : Gestion des campagnes d'entretien

## Important

Les chemins d'importation dans les fichiers doivent être mis à jour pour refléter cette nouvelle structure de dossiers. Par exemple, au lieu de :

```javascript
import { useAuth } from '../auth/useAuth';
```

Utiliser :

```javascript
import { useAuth } from '../Auth/useAuth';
```

Assurez-vous de maintenir la cohérence de la casse (majuscules/minuscules) dans les chemins d'importation, car JavaScript est sensible à la casse.
