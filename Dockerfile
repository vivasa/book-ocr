### Frontend build stage
FROM node:20-slim AS frontend-build

WORKDIR /work/frontend

COPY frontend/package*.json ./
RUN npm ci --no-fund --no-audit

COPY frontend ./
# Avoid relying on node_modules/.bin shims (can be mislinked in some CI builds)
RUN node ./node_modules/vite/bin/vite.js build


### Backend runtime stage
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-tel \
    tesseract-ocr-kan \
    tesseract-ocr-hin \
    tesseract-ocr-eng \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy built frontend assets
COPY --from=frontend-build /work/frontend/dist /app/frontend/dist

ENV PORT=8080
ENV PYTHONPATH=/app/src
ENV FRONTEND_DIST=/app/frontend/dist

CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 ocr_service.app:app
