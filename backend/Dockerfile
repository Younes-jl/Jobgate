# Étape 1: Utiliser une image Python officielle
FROM python:3.11-slim 

# Étape 2: Définir les variables d'environnement
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Étape 3: Définir le répertoire de travail
WORKDIR /app

# Étape 4: Copier et installer les dépendances
COPY requirements.txt .
RUN pip install -r requirements.txt

# Étape 5: Copier le reste du code de l'application
COPY . .