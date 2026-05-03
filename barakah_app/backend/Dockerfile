FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Create directories for static and media
RUN mkdir -p /app/static /app/media

# Collect static files (may fail if DB not ready, that's OK during build)
RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

CMD ["gunicorn", "barakah_app.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120"]
