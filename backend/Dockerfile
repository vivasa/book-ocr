# Use a lightweight Python base image
FROM python:3.9-slim

# Install system dependencies
# tesseract-ocr: The OCR engine
# tesseract-ocr-tel: The specific training data for Telugu
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-tel \
    tesseract-ocr-kan \
    tesseract-ocr-hin \
    tesseract-ocr-eng \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend application code
COPY . .

# Cloud Run expects the app to listen on port 8080
ENV PORT 8080

# Make the src/ package importable (ocr_service.*)
ENV PYTHONPATH /app/src

# (Optional) If you bake frontend assets into this image, point Flask at them.
# For the combined UI+API image, prefer the repo-root Dockerfile.
# ENV FRONTEND_DIST /app/frontend/dist

# Start the application using Gunicorn (production web server)
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 ocr_service.app:app
