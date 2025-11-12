FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8000

# Create a startup script that initializes the database
RUN echo '#!/bin/bash\n\
set -e\n\
echo "Waiting for database..."\n\
until pg_isready -h postgres -U recalibra; do\n\
  sleep 1\n\
done\n\
echo "Database is ready!"\n\
echo "Creating database tables..."\n\
python -c "from app.db.session import engine; from app.db.models import Base; Base.metadata.create_all(bind=engine)" || true\n\
echo "Starting server..."\n\
exec uvicorn app.main:app --host 0.0.0.0 --port 8000\n\
' > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]

