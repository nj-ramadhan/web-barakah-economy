#!/bin/bash

# Script to deploy Barakah Economy App on VPS
# Ensure you are in the barakah_app directory

echo "🚀 Starting Deployment..."

# 1. Pull latest code from GitHub
echo "📥 Pulling latest code..."
git pull origin main

# 2. Build and restart containers
echo "🏗️ Rebuilding containers..."
docker-compose up -d --build

# 3. Run Migrations
echo "🗄️ Running database migrations..."
docker-compose exec backend python manage.py migrate --noinput

# 4. Collect Static Files
echo "🎨 Collecting static files..."
docker-compose exec backend python manage.py collectstatic --noinput

# 5. Clean up old images
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

echo "✅ Deployment Successful!"
