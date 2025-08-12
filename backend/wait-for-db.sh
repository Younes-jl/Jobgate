#!/bin/sh
# wait-for-db.sh

set -e

host="$1"
shift
cmd="$@"

# Utilisation des variables d'environnement correctes pour la connexion
# POSTGRES_NAME est le nom de la base de données (jobgatedb)
# POSTGRES_USER est le nom d'utilisateur (jobgateuser) 
# POSTGRES_PASSWORD est le mot de passe (jobgatepass)

# Tenter d'abord de se connecter à la base de données postgres (toujours présente)
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$host" -U "$POSTGRES_USER" -d "postgres" -c '\q'; do
  >&2 echo "Le serveur Postgres n'est pas encore disponible - en attente..."
  sleep 2
done

# Ensuite, vérifier si la base de données spécifique existe
if ! PGPASSWORD=$POSTGRES_PASSWORD psql -h "$host" -U "$POSTGRES_USER" -d "$POSTGRES_NAME" -c '\q' 2>/dev/null; then
  >&2 echo "Base de données $POSTGRES_NAME n'existe pas encore - création..."
  # Créer la base de données si elle n'existe pas
  PGPASSWORD=$POSTGRES_PASSWORD psql -h "$host" -U "$POSTGRES_USER" -d "postgres" -c "CREATE DATABASE $POSTGRES_NAME;"
  >&2 echo "Base de données $POSTGRES_NAME créée."
fi

>&2 echo "Postgres est prêt - exécution de la commande"
exec $cmd
