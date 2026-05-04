#!/bin/bash

# Script Deployment Barakah Economy (Auto Migration)
# Lokasi: web-barakah-economy/deploy.sh

echo "🚀 Memulai proses update Barakah Economy..."

# 1. Tarik kodingan terbaru
echo "📥 Menarik kode terbaru dari GitHub..."
git pull origin main

# 2. Masuk ke folder barakah_app dan rebuild
echo "🏗️ Membangun ulang (rebuild) kontainer..."
cd barakah_app
docker compose up -d --build

# 3. Migrasi database
# Menggunakan 'exec' ke service 'backend' agar lebih stabil
echo "🗄️ Mendeteksi perubahan model..."
docker compose exec -T backend python manage.py makemigrations
echo "🗄️ Menjalankan migrasi database..."
docker compose exec -T backend python manage.py migrate --noinput

# 4. Collect static
echo "🎨 Mengumpulkan file static..."
docker compose exec -T backend python manage.py collectstatic --noinput

# 5. Clean up old images
echo "🧹 Membersihkan image Docker lama (prune)..."
docker image prune -f

echo "✅ Update selesai! Website Anda sudah versi terbaru."
