# Fix migration conflicts for JobGate project
Write-Host "🔧 Fixing migration conflicts..." -ForegroundColor Yellow

# Stop all containers
Write-Host "Stopping containers..." -ForegroundColor Blue
docker-compose down

# Start only the database
Write-Host "Starting database..." -ForegroundColor Blue
docker-compose up -d db

# Wait for database to be ready
Start-Sleep -Seconds 10

# Mark the problematic migration as fake (since fields already exist)
Write-Host "Marking problematic migration as fake..." -ForegroundColor Blue
docker-compose run --rm backend python manage.py migrate users 0007 --fake-initial

# Run all migrations
Write-Host "Running migrations..." -ForegroundColor Blue
docker-compose run --rm backend python manage.py migrate

# Start all services
Write-Host "Starting all services..." -ForegroundColor Green
docker-compose up -d

Write-Host "✅ Migration fix completed!" -ForegroundColor Green
Write-Host "Backend should be available at http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend should be available at http://localhost:3000" -ForegroundColor Cyan
