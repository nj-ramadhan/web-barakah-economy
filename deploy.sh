#!/bin/bash

# Script Deployment Barakah Economy (Auto Migration & Optimizations)
# Lokasi: web-barakah-economy/deploy.sh

echo "🚀 Memulai proses update Barakah Economy..."

# Check force flag
FORCE_BUILD=false
for arg in "$@"; do
    if [ "$arg" = "--force" ] || [ "$arg" = "-f" ]; then
        FORCE_BUILD=true
    fi
done

# Get the current commit hash before pull
PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "none")

# 1. Tarik kodingan terbaru
echo "📥 Menarik kode terbaru dari GitHub..."
PULL_OUTPUT=$(git pull origin main 2>/dev/null || echo "Git pull failed or skipped")
echo "$PULL_OUTPUT"

# Get the new commit hash
NEW_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "none")

# Detect which parts changed (comparing working tree against PREV_COMMIT)
# This captures pulled changes, local changes (unstaged/staged), and untracked files.
BACKEND_CHANGED=false
FRONTEND_CHANGED=false
DOCKER_CHANGED=false

if [ "$PREV_COMMIT" != "none" ]; then
    CHANGES=$(git diff --name-only "$PREV_COMMIT" 2>/dev/null)
    UNTRACKED=$(git status --porcelain 2>/dev/null | grep "^??" | cut -c4-)
    ALL_CHANGES=$(printf "%s\n%s" "$CHANGES" "$UNTRACKED" | grep -v '^$')
    
    if [ -n "$ALL_CHANGES" ]; then
        echo "🔍 Berkas yang berubah:"
        echo "$ALL_CHANGES"
        
        if echo "$ALL_CHANGES" | grep -q "^barakah_app/backend/"; then
            BACKEND_CHANGED=true
        fi
        if echo "$ALL_CHANGES" | grep -q "^barakah_app/frontend/"; then
            FRONTEND_CHANGED=true
        fi
        if echo "$ALL_CHANGES" | grep -qE "^barakah_app/docker-compose.yml$|^barakah_app/nginx_vps.conf$|^deploy.sh$"; then
            DOCKER_CHANGED=true
        fi
    fi
else
    BACKEND_CHANGED=true
    FRONTEND_CHANGED=true
    DOCKER_CHANGED=true
fi

cd barakah_app

if [ "$BACKEND_CHANGED" = false ] && [ "$FRONTEND_CHANGED" = false ] && [ "$DOCKER_CHANGED" = false ] && [ "$FORCE_BUILD" = false ]; then
    echo "✅ Website sudah versi terbaru (Already up to date). Tidak ada perubahan terdeteksi."
    echo "🚀 Memastikan semua kontainer tetap berjalan..."
    docker compose up -d
    exit 0
fi

# 2. Rebuild services based on changes
if [ "$FORCE_BUILD" = true ] || [ "$DOCKER_CHANGED" = true ]; then
    echo "🏗️ Membangun ulang (rebuild) semua kontainer..."
    docker compose up -d --build
elif [ "$BACKEND_CHANGED" = true ] && [ "$FRONTEND_CHANGED" = true ]; then
    echo "🏗️ Membangun ulang (rebuild) kontainer backend & frontend..."
    docker compose up -d --build backend frontend
elif [ "$BACKEND_CHANGED" = true ]; then
    echo "🏗️ Membangun ulang (rebuild) kontainer backend..."
    docker compose up -d --build backend
elif [ "$FRONTEND_CHANGED" = true ]; then
    echo "🏗️ Membangun ulang (rebuild) kontainer frontend..."
    docker compose up -d --build frontend
else
    echo "🚀 Memulai ulang kontainer tanpa membangun ulang..."
    docker compose up -d
fi

# 3. Migrasi database & collect static (hanya jika backend/docker berubah)
if [ "$FORCE_BUILD" = true ] || [ "$BACKEND_CHANGED" = true ] || [ "$DOCKER_CHANGED" = true ]; then
    echo "🗄️ Mendeteksi perubahan model..."
    docker compose exec -T backend python manage.py makemigrations
    echo "🗄️ Menjalankan migrasi database..."
    docker compose exec -T backend python manage.py migrate --noinput
    echo "🎨 Mengumpulkan file static..."
    docker compose exec -T backend python manage.py collectstatic --noinput
else
    echo "⏭️ Tidak ada perubahan backend. Melewati migrasi & collectstatic."
fi

# 4. Clean up old images
echo "🧹 Membersihkan image Docker lama (prune)..."
docker image prune -f

echo "✅ Update selesai! Website Anda sudah versi terbaru."
