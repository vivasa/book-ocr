# Use a lightweight Python base image
FROM python:3.9-slim

# Install system dependencies
# tesseract-ocr: The OCR engine
# tesseract-ocr-tel: The specific training data for Telugu
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-tel \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Cloud Run expects the app to listen on port 8080
ENV PORT 8080

# Start the application using Gunicorn (production web server)
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app
