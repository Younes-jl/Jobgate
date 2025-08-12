# Étape 1: Utiliser une image Python officielle
FROM python:3.11-slim 

# Étape 2: Définir les variables d'environnement
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
# Désactiver pip version check pour accélérer l'installation
ENV PIP_DISABLE_PIP_VERSION_CHECK 1
# Ne pas créer les fichiers .pyc
ENV PYTHONDONTWRITEBYTECODE 1

# Étape 3: Installer les dépendances système nécessaires
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Étape 4: Définir le répertoire de travail
WORKDIR /app

# Étape 5: Copier et installer les dépendances avec des optimisations
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Étape 6: Copier le reste du code de l'application
COPY . .

# Étape 7: Rendre le script d'attente exécutable
RUN chmod +x wait-for-db.sh