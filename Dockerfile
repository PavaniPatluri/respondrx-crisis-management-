FROM python:3.10-slim

WORKDIR /app

# Copy the backend requirements first for caching
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend source
COPY backend/ ./backend/

# Move into the backend folder for execution
WORKDIR /app/backend

# Expose the port Flask is running on
EXPOSE 5000

# Start the application using gunicorn and eventlet
CMD ["gunicorn", "--worker-class", "eventlet", "-w", "1", "--bind", "0.0.0.0:5000", "main:app"]
