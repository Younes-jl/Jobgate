#!/bin/bash
# clean-docker.ps1
# Script pour nettoyer les ressources Docker non utilisées

Write-Host "🧹 Nettoyage des ressources Docker non utilisées..." -ForegroundColor Cyan

# Demander si l'utilisateur veut supprimer complètement le volume de base de données
$resetDB = Read-Host "Voulez-vous réinitialiser complètement la base de données? [O/N]"

if ($resetDB -eq "O" -or $resetDB -eq "o") {
    # Arrêter les conteneurs en cours d'exécution et supprimer les volumes
    Write-Host "Arrêt des conteneurs et suppression des volumes..." -ForegroundColor Yellow
    docker-compose down -v
    
    # Supprimer explicitement le volume postgres_data
    Write-Host "Suppression du volume de la base de données..." -ForegroundColor Yellow
    docker volume rm projet-video-interview-jobgate_postgres_data 2>$null
    
    Write-Host "Base de données complètement réinitialisée!" -ForegroundColor Green
} else {
    # Arrêter les conteneurs en cours d'exécution sans supprimer les volumes
    Write-Host "Arrêt des conteneurs en cours d'exécution..." -ForegroundColor Yellow
    docker-compose down
}

# Supprimer les images non utilisées
Write-Host "Suppression des images Docker non utilisées..." -ForegroundColor Yellow
docker image prune -f

# Supprimer les volumes non utilisés (sauf ceux qui sont attachés à des conteneurs)
Write-Host "Suppression des volumes Docker non utilisés..." -ForegroundColor Yellow
docker volume prune -f

# Supprimer les réseaux non utilisés
Write-Host "Suppression des réseaux Docker non utilisés..." -ForegroundColor Yellow
docker network prune -f

# Supprimer les conteneurs arrêtés
Write-Host "Suppression des conteneurs arrêtés..." -ForegroundColor Yellow
docker container prune -f

# Reconstruire les images si nécessaire
$rebuild = Read-Host "Voulez-vous reconstruire les images avant de redémarrer? [O/N]"
if ($rebuild -eq "O" -or $rebuild -eq "o") {
    Write-Host "Reconstruction des images..." -ForegroundColor Yellow
    docker-compose build
}

# Informations finales
Write-Host "✅ Nettoyage terminé! Toutes les ressources Docker non utilisées ont été supprimées." -ForegroundColor Green
Write-Host "Pour redémarrer votre environnement, exécutez 'docker-compose up -d'" -ForegroundColor Cyan
