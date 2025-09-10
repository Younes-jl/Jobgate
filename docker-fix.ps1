# Docker Fix Script for JobGate
Write-Host "🔧 Fixing Docker issues and starting JobGate..." -ForegroundColor Yellow

# Stop Docker Desktop
Write-Host "Stopping Docker Desktop..." -ForegroundColor Blue
Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue

# Wait a moment
Start-Sleep -Seconds 5

# Start Docker Desktop
Write-Host "Starting Docker Desktop..." -ForegroundColor Blue
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -WindowStyle Hidden

# Wait for Docker to start
Write-Host "Waiting for Docker to initialize..." -ForegroundColor Blue
Start-Sleep -Seconds 30

# Clean up any existing containers and images
Write-Host "Cleaning up Docker resources..." -ForegroundColor Blue
docker-compose down --volumes --remove-orphans 2>$null
docker system prune -af 2>$null

# Build and start services
Write-Host "Building and starting services..." -ForegroundColor Green
docker-compose build --no-cache
docker-compose up -d

Write-Host "✅ Docker fix completed!" -ForegroundColor Green
Write-Host "Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
