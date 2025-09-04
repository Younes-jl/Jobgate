#!/bin/bash
# wait-for-db.sh - Script d'attente pour la base de données PostgreSQL

set -e

host="$1"
shift
cmd="$@"

echo "Attente de la disponibilité de PostgreSQL sur $host..."

# Fonction pour tester la connexion
test_connection() {
    PGPASSWORD="$POSTGRES_PASSWORD" pg_isready -h "$host" -U "$POSTGRES_USER" -d "postgres" -q
}

# Attendre que PostgreSQL soit prêt
until test_connection; do
    echo "PostgreSQL n'est pas encore disponible - attente..."
    sleep 2
done

echo "PostgreSQL est disponible!"

# Vérifier si la base de données existe, sinon la créer
if ! PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$host" -U "$POSTGRES_USER" -d "$POSTGRES_NAME" -c '\q' 2>/dev/null; then
    echo "Création de la base de données $POSTGRES_NAME..."
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$host" -U "$POSTGRES_USER" -d "postgres" -c "CREATE DATABASE $POSTGRES_NAME;" || true
    echo "Base de données $POSTGRES_NAME créée."
fi

echo "Base de données prête - exécution de la commande: $cmd"
exec $cmd
