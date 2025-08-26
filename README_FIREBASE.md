# JobGate - Stockage vidéo avec Firebase

## Aperçu

JobGate utilise Firebase Cloud Storage pour stocker les vidéos d'entretien des candidats. Cette solution offre :

- ✅ Stockage scalable et sécurisé
- ✅ URLs signées avec expiration automatique  
- ✅ Gestion automatique des permissions
- ✅ Interface d'administration intégrée
- ✅ Support des fichiers volumineux
- ✅ CDN global pour une diffusion rapide

## Configuration rapide

### 1. Mode développement (stockage local)
Par défaut, l'application utilise le stockage local pour le développement :

```bash
# Dans votre .env ou variables d'environnement
USE_FIREBASE_STORAGE=false
```

### 2. Mode production (Firebase Storage)
Pour utiliser Firebase Storage :

```bash
# Activer Firebase
USE_FIREBASE_STORAGE=true

# Configuration Firebase
FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
FIREBASE_CREDENTIALS={"type":"service_account",...}
```

Voir [FIREBASE_SETUP.md](FIREBASE_SETUP.md) pour la configuration complète.

## Utilisation

### Upload automatique des vidéos
Lorsqu'un candidat enregistre sa réponse, la vidéo est automatiquement :
1. Uploadée vers Firebase Storage (si activé) ou stockée localement
2. Liée à la question et au candidat dans la base de données
3. Accessible via une URL sécurisée avec expiration

### Interface d'administration
Les recruteurs peuvent voir et télécharger les vidéos depuis l'admin Django :
- Liste des réponses avec métadonnées (durée, taille)
- Liens directs vers les vidéos
- Gestion des scores et commentaires

### API REST
L'API expose les URLs des vidéos dans les réponses :

```json
{
  "id": 1,
  "candidate_name": "John Doe",
  "question_text": "Présentez-vous en 2 minutes",
  "duration_formatted": "02:15",
  "file_size_formatted": "15.2 MB",
  "video_url": "https://storage.googleapis.com/...",
  "status": "completed",
  "created_at": "2025-08-26T19:30:00Z"
}
```

## Fonctionnalités avancées

### URLs signées avec expiration
Les vidéos sont accessibles via des URLs signées qui expirent automatiquement :
- **Par défaut** : 1 heure pour l'affichage
- **Streaming** : Configurable via `get_video_streaming_url(expiration_hours=24)`

### Gestion des permissions
- Seuls les utilisateurs authentifiés peuvent accéder aux vidéos
- Les URLs expirent automatiquement pour la sécurité
- Possibilité de révoquer l'accès en régénérant les URLs

### Optimisations
- Upload progressif pour les gros fichiers
- Compression automatique côté client
- CDN Firebase pour une diffusion rapide mondiale

## Tests

### Test de connexion Firebase
```bash
docker-compose exec backend python manage.py test_firebase
```

### Test complet avec upload
```bash
docker-compose exec backend python manage.py test_firebase --upload-test
```

## Monitoring

### Métriques disponibles
- Nombre de vidéos stockées
- Espace de stockage utilisé
- Bande passante consommée
- Temps d'upload moyen

### Firebase Console
Accédez à [Firebase Console](https://console.firebase.google.com) pour :
- Voir l'usage du stockage
- Gérer les règles de sécurité
- Monitorer les performances
- Configurer les alertes

## Migration

### Du stockage local vers Firebase
Si vous avez déjà des vidéos en stockage local :

```python
# Shell Django
from interviews.models import InterviewAnswer
from interviews.firebase_storage import FirebaseStorage

storage = FirebaseStorage()
for answer in InterviewAnswer.objects.filter(video_file__isnull=False):
    # Script de migration automatique
    # (Voir FIREBASE_SETUP.md pour le script complet)
```

### Sauvegarde
Vos vidéos Firebase sont automatiquement sauvegardées, mais vous pouvez :
- Exporter via Firebase Console
- Utiliser gsutil pour les sauvegardes programmées
- Configurer la réplication multi-région

## Sécurité

### Règles de stockage Firebase
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /interview_answers/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && resource.size < 100 * 1024 * 1024;
    }
  }
}
```

### Bonnes pratiques
- ✅ Ne jamais exposer les credentials Firebase côté client
- ✅ Utiliser des URLs signées avec expiration courte
- ✅ Monitorer l'usage pour détecter les anomalies
- ✅ Configurer des quotas appropriés
- ✅ Activer la double authentification sur Firebase Console

## Dépannage

### Erreurs courantes
1. **"Firebase credentials not found"**
   - Vérifiez `FIREBASE_CREDENTIALS` ou `FIREBASE_CREDENTIALS_PATH`

2. **"Permission denied"**  
   - Vérifiez les règles de sécurité Firebase
   - Vérifiez les permissions du compte de service

3. **"File too large"**
   - Ajustez les limites dans les règles Firebase
   - Vérifiez la configuration Django `FILE_UPLOAD_MAX_MEMORY_SIZE`

### Support
- 📖 [Documentation complète](FIREBASE_SETUP.md)
- 🔧 Command de test: `python manage.py test_firebase`
- 📞 Logs Django pour diagnostics détaillés
