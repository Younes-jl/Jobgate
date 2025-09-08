# Utiliser une image Python officielle
FROM python:3.11-slim 

# Variables d'environnement
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# Installer les dépendances système minimales + FFmpeg
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Répertoire de travail
WORKDIR /app

# Installer les dépendances Python optimisées (CPU-only pour réduire la taille)
COPY requirements.txt .

# Installer d'abord les dépendances de base
RUN pip install --no-cache-dir \
    Django==5.2.5 \
    djangorestframework==3.16.0 \
    django-cors-headers==4.7.0 \
    djangorestframework_simplejwt==5.5.1 \
    djoser==2.3.3 \
    python-dotenv==1.0.0 \
    cloudinary==1.36.0 \
    requests==2.32.4 \
    google-generativeai==0.3.2 \
    psycopg2-binary==2.9.10

# Installer les dépendances IA optimisées (CPU-only, plus petit)
RUN pip install --no-cache-dir torch==2.1.0+cpu --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir transformers==4.35.0
RUN pip install --no-cache-dir openai-whisper==20231117
RUN pip install --no-cache-dir ffmpeg-python==0.2.0

# Étape 7: Copier le reste du code de l'application
COPY . .

# Étape 8: Convertir les fins de ligne et rendre le script exécutable
RUN sed -i 's/\r$//' wait-for-db.sh && chmod +x wait-for-db.sh