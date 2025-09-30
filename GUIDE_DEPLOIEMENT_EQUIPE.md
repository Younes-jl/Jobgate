# Guide de Déploiement JobGate - Équipe Technique

## 🎯 Objectif
Ce guide détaille les étapes de déploiement de JobGate pour l'équipe technique, de l'installation locale au déploiement en production.

## 📋 Checklist de Déploiement

### Phase 1: Préparation de l'Environnement
- [ ] **Serveur configuré** (Ubuntu 20.04+ recommandé)
- [ ] **Docker et Docker Compose installés**
- [ ] **Nginx installé** (pour production)
- [ ] **Certificat SSL configuré** (Let's Encrypt recommandé)
- [ ] **Nom de domaine pointé** vers le serveur

### Phase 2: Configuration des Services Externes
- [ ] **Compte Cloudinary créé** et configuré
- [ ] **Compte SendGrid créé** et API key obtenue
- [ ] **Google Gemini API key** obtenue (gratuite)
- [ ] **Base de données PostgreSQL** configurée (locale ou cloud)

### Phase 3: Déploiement
- [ ] **Code source cloné** et configuré
- [ ] **Variables d'environnement** configurées
- [ ] **Services Docker** démarrés
- [ ] **Migrations de base de données** appliquées
- [ ] **Tests de fonctionnement** réalisés

## 🚀 Procédure de Déploiement Détaillée

### 1. Préparation du Serveur

#### Installation des Dépendances
```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation de Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Installation de Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Installation de Nginx
sudo apt install nginx -y

# Installation de Certbot pour SSL
sudo apt install certbot python3-certbot-nginx -y
```

#### Configuration du Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. Configuration du Projet

#### Clonage et Configuration
```bash
# Clonage du projet
git clone https://github.com/votre-organisation/jobgate.git
cd jobgate

# Configuration des variables d'environnement
cp .env.example .env
nano .env  # Éditer avec les vraies valeurs
```

#### Variables d'Environnement Production
```env
# === CONFIGURATION PRODUCTION ===
DEBUG=False
ALLOWED_HOSTS=votre-domaine.com,www.votre-domaine.com
CORS_ALLOWED_ORIGINS=https://votre-domaine.com,https://www.votre-domaine.com

# === BASE DE DONNÉES ===
POSTGRES_NAME=jobgatedb_prod
POSTGRES_USER=jobgateuser_prod
POSTGRES_PASSWORD=mot_de_passe_securise_complexe
POSTGRES_HOST=db
POSTGRES_PORT=5432

# === SÉCURITÉ ===
SECRET_KEY=votre-secret-key-django-tres-securise-64-caracteres-minimum
SECURE_SSL_REDIRECT=True
SECURE_PROXY_SSL_HEADER=HTTP_X_FORWARDED_PROTO,https

# === SERVICES EXTERNES ===
# Cloudinary
CLOUDINARY_CLOUD_NAME=votre-cloud-name
CLOUDINARY_API_KEY=votre-api-key
CLOUDINARY_API_SECRET=votre-api-secret
USE_CLOUDINARY_STORAGE=true

# SendGrid
SENDGRID_API_KEY=votre-sendgrid-api-key
DEFAULT_FROM_EMAIL=JobGate <noreply@votre-domaine.com>

# Google Gemini IA
GOOGLE_API_KEY=votre-google-gemini-api-key
USE_GEMINI=true
AI_EVALUATION_ENABLED=true

# === URLS ===
FRONTEND_BASE_URL=https://votre-domaine.com
BACKEND_BASE_URL=https://api.votre-domaine.com
```

### 3. Configuration Docker Production

#### Création du docker-compose.prod.yml
```yaml
version: '3.8'

services:
  db:
    image: postgres:16
    restart: always
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data/
    environment:
      - POSTGRES_DB=${POSTGRES_NAME}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    networks:
      - jobgate_network

  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile.prod
    restart: always
    command: >
      sh -c "python manage.py migrate &&
             python manage.py collectstatic --noinput &&
             gunicorn prototype.wsgi:application --bind 0.0.0.0:8000 --workers 3"
    volumes:
      - static_volume:/app/staticfiles
      - media_volume:/app/media
    environment:
      - DEBUG=False
      - POSTGRES_NAME=${POSTGRES_NAME}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_HOST=db
      - SECRET_KEY=${SECRET_KEY}
      - ALLOWED_HOSTS=${ALLOWED_HOSTS}
      - SENDGRID_API_KEY=${SENDGRID_API_KEY}
      - DEFAULT_FROM_EMAIL=${DEFAULT_FROM_EMAIL}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
      - CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
      - CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}
    depends_on:
      - db
    networks:
      - jobgate_network

  frontend:
    build: 
      context: ./frontend
      dockerfile: Dockerfile.prod
    restart: always
    volumes:
      - frontend_build:/app/build
    networks:
      - jobgate_network

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/sites-enabled:/etc/nginx/sites-enabled
      - static_volume:/var/www/static
      - media_volume:/var/www/media
      - frontend_build:/var/www/html
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - backend
      - frontend
    networks:
      - jobgate_network

volumes:
  postgres_data_prod:
  static_volume:
  media_volume:
  frontend_build:

networks:
  jobgate_network:
    driver: bridge
```

### 4. Configuration Nginx

#### Création du fichier de configuration Nginx
```bash
sudo mkdir -p /etc/nginx/sites-available
sudo nano /etc/nginx/sites-available/jobgate
```

```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.com www.votre-domaine.com;

    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;
    
    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Frontend React
    location / {
        root /var/www/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        
        # Headers de sécurité
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    }

    # API Backend Django
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout pour les requêtes IA longues
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Admin Django
    location /admin/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Fichiers statiques Django
    location /static/ {
        alias /var/www/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Fichiers média
    location /media/ {
        alias /var/www/media/;
        expires 1y;
        add_header Cache-Control "public";
    }

    # Optimisations
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    client_max_body_size 100M;  # Pour les uploads vidéo
}
```

#### Activation de la configuration
```bash
sudo ln -s /etc/nginx/sites-available/jobgate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Obtention du Certificat SSL

```bash
# Certificat Let's Encrypt
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com

# Renouvellement automatique
sudo crontab -e
# Ajouter: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 6. Déploiement Final

#### Démarrage des Services
```bash
# Build et démarrage
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Vérification des logs
docker-compose -f docker-compose.prod.yml logs -f
```

#### Configuration Initiale
```bash
# Création du superutilisateur
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Collecte des fichiers statiques
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# Test des migrations
docker-compose -f docker-compose.prod.yml exec backend python manage.py showmigrations
```

## 🧪 Tests de Validation

### Tests Automatisés
```bash
# Test de l'API
curl -f https://votre-domaine.com/api/ || echo "Erreur API"

# Test du frontend
curl -f https://votre-domaine.com/ || echo "Erreur Frontend"

# Test de l'admin
curl -f https://votre-domaine.com/admin/ || echo "Erreur Admin"
```

### Tests Fonctionnels
1. **Inscription/Connexion** - Tester l'authentification
2. **Création de campagne** - Tester la création par un recruteur
3. **Passage d'entretien** - Tester l'interface candidat
4. **Évaluation IA** - Tester l'analyse automatique
5. **Emails** - Vérifier l'envoi des notifications

## 🔧 Maintenance et Monitoring

### Scripts de Maintenance
```bash
# Backup de base de données
docker-compose -f docker-compose.prod.yml exec db pg_dump -U ${POSTGRES_USER} ${POSTGRES_NAME} > backup_$(date +%Y%m%d_%H%M%S).sql

# Nettoyage des logs Docker
docker system prune -f

# Mise à jour du projet
git pull origin main
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Monitoring
```bash
# Vérification de l'état des services
docker-compose -f docker-compose.prod.yml ps

# Utilisation des ressources
docker stats

# Logs en temps réel
docker-compose -f docker-compose.prod.yml logs -f --tail=100
```

## 🚨 Dépannage Production

### Problèmes Courants

1. **Service ne démarre pas**
   ```bash
   docker-compose -f docker-compose.prod.yml logs [service_name]
   ```

2. **Erreur 502 Bad Gateway**
   - Vérifier que le backend est démarré
   - Vérifier la configuration Nginx
   - Vérifier les logs du backend

3. **Problème de certificat SSL**
   ```bash
   sudo certbot certificates
   sudo certbot renew --dry-run
   ```

4. **Base de données inaccessible**
   ```bash
   docker-compose -f docker-compose.prod.yml exec db psql -U ${POSTGRES_USER} -d ${POSTGRES_NAME}
   ```

### Rollback d'Urgence
```bash
# Retour à la version précédente
git checkout [commit_hash_precedent]
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

#
### Procédure d'Escalade
1. **Niveau 1**: Redémarrage des services Docker
2. **Niveau 2**: Vérification des logs et configuration
3. **Niveau 3**: Contact du développeur principal
4. **Niveau 4**: Rollback vers version stable

---

**Version**: 1.0.0  
**Dernière mise à jour**: Septembre 2024  
**Responsable**: Équipe Technique JobGate
