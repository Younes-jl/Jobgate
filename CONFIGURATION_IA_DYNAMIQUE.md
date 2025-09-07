# Configuration de l'IA Dynamique pour JobGate

## Problème
Les questions d'entretien sont générées de manière statique au lieu d'être créées dynamiquement par l'IA Gemini.

## Solution

### 1. Obtenir une clé API Google Gemini (GRATUIT)
- Rendez-vous sur : https://makersuite.google.com/app/apikey
- Connectez-vous avec votre compte Google
- Cliquez sur "Create API Key"
- Copiez la clé générée

### 2. Configuration du fichier .env
```bash
# Si le fichier .env n'existe pas, copiez le template
cp .env.example .env
```

Ajoutez cette ligne dans votre fichier `.env` :
```
GOOGLE_API_KEY=votre-clé-api-gemini-ici
```

### 3. Redémarrage du système
```bash
docker-compose restart backend
```

## Vérification
Une fois configuré, le système :
- ✅ Utilisera Gemini pour générer des questions personnalisées
- ✅ Adaptera les questions au titre et description de l'offre
- ✅ Ne tombera sur les questions statiques qu'en cas d'erreur

## Limites de l'API gratuite
- 15 requêtes par minute
- 1500 requêtes par jour
- Largement suffisant pour un usage normal

## Logs de débogage
Surveillez les logs du backend pour confirmer l'utilisation de Gemini :
```bash
docker-compose logs -f backend
```

Vous devriez voir :
```
✅ X questions générées avec Gemini
```

Au lieu de :
```
❌ Utilisation du fallback
```
