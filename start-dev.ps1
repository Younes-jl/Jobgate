#!/bin/bash
# start-dev.ps1
# Script pour démarrer facilement l'environnement de développement

Write-Host "🚀 Démarrage de l'environnement JobGate..." -ForegroundColor Cyan

# Vérifier si Docker est en cours d'exécution
try {
    docker info | Out-Null
} catch {
    Write-Host "⚠️ Docker n'est pas en cours d'exécution. Veuillez démarrer Docker Desktop avant de continuer." -ForegroundColor Red
    exit 1
}

# Demander si l'utilisateur veut reconstruire les images
$rebuild = Read-Host "Voulez-vous reconstruire les images avant de démarrer? [O/N]"
if ($rebuild -eq "O" -or $rebuild -eq "o") {
    Write-Host "Reconstruction des images..." -ForegroundColor Yellow
    docker-compose build
}

# Démarrer les conteneurs en mode détaché
Write-Host "Démarrage des services (db, backend, frontend)..." -ForegroundColor Yellow
docker-compose up -d

# Attendre quelques secondes pour que les services démarrent
Write-Host "Attente du démarrage des services..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Vérifier si les services sont en cours d'exécution
$services = docker-compose ps --services --filter "status=running"
if ($services -match "backend" -and $services -match "frontend" -and $services -match "db") {
    Write-Host "✅ Tous les services sont en cours d'exécution!" -ForegroundColor Green
    
    # Afficher les URLs d'accès
    Write-Host "`nVous pouvez accéder à votre application aux adresses suivantes:" -ForegroundColor Cyan
    Write-Host "- Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "- Backend API: http://localhost:8000/api/" -ForegroundColor White
    Write-Host "- Backend Admin: http://localhost:8000/admin/" -ForegroundColor White
    
    # Ouvrir le navigateur avec l'application
    $openBrowser = Read-Host "Voulez-vous ouvrir le frontend dans votre navigateur? [O/N]"
    if ($openBrowser -eq "O" -or $openBrowser -eq "o") {
        Start-Process "http://localhost:3000"
    }
} else {
    Write-Host "⚠️ Certains services n'ont pas démarré correctement." -ForegroundColor Red
    Write-Host "Exécutez 'docker-compose logs' pour voir les erreurs." -ForegroundColor Yellow
}

Write-Host "`nPour afficher les logs en temps réel, exécutez:" -ForegroundColor Cyan
Write-Host "docker-compose logs -f" -ForegroundColor White

Write-Host "`nPour arrêter les services, exécutez:" -ForegroundColor Cyan
Write-Host "docker-compose down" -ForegroundColor White
