FROM python:3.10-slim

WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt ./

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Expose the port the app runs on (Hugging Face Spaces uses 7860)
EXPOSE 7860

# Start the application using gunicorn and eventlet
CMD gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:${PORT:-7860} main:app
