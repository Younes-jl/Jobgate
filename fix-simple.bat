@echo off
echo Fixing migration conflicts...

echo Stopping containers...
docker-compose down

echo Starting database...
docker-compose up -d db

echo Waiting for database...
timeout /t 10

echo Running migrations...
docker-compose run --rm backend python manage.py migrate --fake-initial
docker-compose run --rm backend python manage.py migrate

echo Starting all services...
docker-compose up -d

echo Migration fix completed!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
