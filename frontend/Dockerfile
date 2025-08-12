# Utiliser une image Node.js plus légère
FROM node:18-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier package.json et package-lock.json pour meilleur cache
COPY package*.json ./

# Installer les dépendances avec le flag CI pour plus de rapidité
# et désactiver les scripts de génération pour accélérer l'installation
RUN npm ci --silent --no-audit --no-fund --prefer-offline

# Copier le reste du code
COPY . .

# La commande par défaut pour lancer le serveur de développement
CMD ["npm", "start"]