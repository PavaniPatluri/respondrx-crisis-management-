FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements first
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Expose port (default to 5000, can be overridden by $PORT)
EXPOSE 5000

# Start the application using gunicorn with eventlet for SocketIO support
CMD gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:${PORT:-5000} main:app
