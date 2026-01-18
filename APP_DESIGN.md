# Telugu OCR App - Architecture & Database Design

> Status note (design doc): This file describes a broader, aspirational “web app” plan.
> It contains examples and URLs that may be stale.
>
> For the current, supported deployment process (staging + prod), use:
> - [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Overview

A simple web application that allows anonymous users to upload Telugu images, extract text via the existing Google Cloud Run OCR service, review and correct the extracted text, and store the results in MySQL.

---

## OCR Service Integration

### Service Endpoint

The Telugu OCR service is deployed on Google Cloud Run and available at an endpoint like:

```
https://<YOUR_CLOUD_RUN_URL>/extract

> Note: This repo contains the OCR **service** code (Flask + Tesseract + Firestore quota) and supporting scripts/tests.
> The broader “web app” described in the rest of this document (upload/review UI + MySQL persistence) is still a design plan.
```

### How to Use the OCR Service

#### cURL Example

```bash
curl -X POST \
    https://<YOUR_CLOUD_RUN_URL>/extract \
  -F "image=@/path/to/your/telugu-image.jpg"

Multi-language example (override OCR language per request):

```bash
curl -X POST \
    "https://<YOUR_CLOUD_RUN_URL>/extract?lang=kan" \
    -F "image=@/path/to/your/kannada-image.jpg"
```
```

### API Request Format

**Endpoint:** `POST /extract`

**Content-Type:** `multipart/form-data`

**Parameters:**
- `image` (required) - Image file containing Telugu text
  - Supported formats: JPG, PNG, BMP, TIFF
  - Max size: Based on Cloud Run configuration

**Optional query parameters:**
- `lang` - OCR language override for this request. Allowed values:
    - `tel` (Telugu)
    - `kan` (Kannada)
    - `hin` (Hindi / Devanagari script)
    - `eng` (English)

### API Response Format

**Success Response (200 OK):**
```json
{
    "status": "success",
    "text": "తెలుగు టెక్స్ట్ extracted from image"
}
```

**Error Responses:**

```json
// 400 Bad Request - No image provided
{
    "error": "No image file provided"
}

// 400 Bad Request - Empty filename
{
    "error": "No selected file"
}

// 429 Too Many Requests - Quota exceeded
{
    "error": "Daily quota exceeded. Please try again tomorrow."
}

// 500 Internal Server Error
{
    "error": "Error message details"
}
```

### Rate Limiting

The service has a daily quota limit configured via the `DAILY_LIMIT` environment variable. Once exceeded, requests will return a `429` status code until the next day.

#### Local Development Note (Quota)

For local development / smoke testing (when Firestore credentials are not configured), you can disable the quota check by setting:

```bash
export DISABLE_QUOTA=1
```

This skips the Firestore quota check for the running process.

---

## Screen Flow

### 1. Upload Screen (Home)
**Purpose:** Allow users to upload images for OCR processing

**UI Elements:**
- File upload area (drag & drop or browse)
- Preview of selected image (thumbnail)
- "Extract Text" button
- Recent uploads list (optional)

**Flow:**
```
User selects image → Preview shown → Click "Extract Text" 
→ Loading indicator → Navigate to Review Screen
```

---

### 2. Review & Edit Screen
**Purpose:** Display OCR results and allow corrections

**UI Elements:**
- **Left Panel:** Original uploaded image (zoomable)
- **Right Panel:** 
  - Extracted text in editable textarea
  - Character count
  - "Save Corrections" button
  - "Reprocess" button (optional - to retry OCR)
  - "Cancel" button (return to upload)
  
**Features:**
- Side-by-side comparison
- Real-time edit tracking
- Highlight changes (optional)
- Telugu font rendering support

**Flow:**
```
OCR completes → Display image + text → User edits text 
→ Click "Save" → Show success message → Navigate to History/Upload
```

---

### 3. History Screen (Optional)
**Purpose:** View past OCR jobs and corrections

**UI Elements:**
- List of previous uploads (thumbnail + date + snippet)
- Search/filter functionality
- Click to view details (opens Review screen in read-only mode)
- Delete option

**Flow:**
```
User clicks history → List loads → Click item 
→ View details (image + final text)
```

---

## MySQL Database Schema

### Single Table Design

#### `ocr_jobs`
Stores each OCR processing job with original and corrected text.

```sql
CREATE TABLE ocr_jobs (
    job_id INT AUTO_INCREMENT PRIMARY KEY,
    image_filename VARCHAR(255) NOT NULL,
    image_path VARCHAR(500) NOT NULL,  -- Storage path/URL
    original_text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,  -- OCR output
    corrected_text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,  -- User-edited text
    is_corrected BOOLEAN DEFAULT FALSE,  -- Whether user made corrections
    status ENUM('completed', 'failed') DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Database Initialization Script

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS telugu_ocr_app 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE telugu_ocr_app;

-- Create table
CREATE TABLE ocr_jobs (
    job_id INT AUTO_INCREMENT PRIMARY KEY,
    image_filename VARCHAR(255) NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    original_text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    corrected_text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    is_corrected BOOLEAN DEFAULT FALSE,
    status ENUM('completed', 'failed') DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## API Endpoints Design

### Backend API Structure

#### 1. **POST /api/upload**
Upload image, call Cloud Run OCR service, and store results.

**Request:**
```
Content-Type: multipart/form-data
Body: image file
```

**Process:**
1. Save uploaded image to storage
2. Call Cloud Run OCR endpoint: `https://<YOUR_CLOUD_RUN_URL>/extract`
3. Store results in MySQL
4. Return job details

**Response:**
```json
{
    "job_id": 123,
    "status": "completed",
    "image_url": "/uploads/image123.jpg",
    "original_text": "తెలుగు టెక్స్ట్",
    "message": "OCR completed successfully"
}
```

#### 2. **GET /api/job/{job_id}**
Get OCR job status and results.

**Response:**
```json
{
    "job_id": 123,
    "status": "completed",
    "image_url": "/uploads/image123.jpg",
    "original_text": "తెలుగు టెక్స్ట్",
    "corrected_text": "తెలుగు టెక్స్ట్",
    "is_corrected": false,
    "created_at": "2025-12-08T10:30:00Z"
}
```

#### 3. **PUT /api/job/{job_id}/correct**
Save user corrections.

**Request:**
```json
{
    "corrected_text": "corrected తెలుగు text"
}
```

**Response:**
```json
{
    "success": true,
    "job_id": 123,
    "message": "Corrections saved successfully"
}
```

#### 4. **GET /api/jobs** (Optional)
List recent jobs (with pagination).

**Query Parameters:**
- `limit`: Items to return (default: 20)

**Response:**
```json
{
    "jobs": [
        {
            "job_id": 123,
            "image_url": "/uploads/image123.jpg",
            "snippet": "First 100 chars...",
            "is_corrected": true,
            "created_at": "2025-12-08T10:30:00Z"
        }
    ]
}
```

#### 5. **DELETE /api/job/{job_id}**
Delete a job and its associated data.

---

## Implementation Workflow

### Phase 1: Basic Upload & Display
1. Create simple upload form with image preview
2. Call Cloud Run OCR service endpoint
3. Display image and text side-by-side
4. Store in MySQL after successful OCR

### Phase 2: Edit & Save
1. Make text editable in textarea
2. Implement save corrections endpoint
3. Update database with corrected text
4. Show success message

### Phase 3: Polish (Optional)
1. Add simple history view
2. Improve UI/UX
3. Add image thumbnails
4. Error handling and validation

---

## Sample Application Flow (Detailed)

```
┌─────────────────┐
│  Upload Screen  │
│  - Drop zone    │
│  - Browse btn   │
└────────┬────────┘
         │ User uploads image
         ↓
┌─────────────────┐
│ Processing      │
│ - Show loader   │
│ - Call OCR API  │
└────────┬────────┘
         │ OCR completes
         ↓
┌─────────────────┐
│  Review Screen  │
│ ┌─────┬─────┐  │
│ │Image│Text │  │
│ │     │Edit │  │
│ └─────┴─────┘  │
│   [Save] [×]   │
└────────┬────────┘
         │ User saves
         ↓
┌─────────────────┐
│  Save to DB     │
│ - Insert job    │
│ - Save text     │
│ - Track changes │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Success Message │
│ → Back to Upload│
│ → View History  │
└─────────────────┘
```

---

## Security Considerations

1. **File Upload Security:**
   - Validate file types (only images)
   - Limit file size (e.g., max 10MB)
   - Sanitize filenames
   - Scan for malware (optional)

2. **Database Security:**
   - Use parameterized queries (prevent SQL injection)
   - Implement proper user authentication
   - Encrypt sensitive data
   - Regular backups

3. **API Security:**
   - Rate limiting
   - CORS configuration
   - Input validation
   - CSRF protection

4. **Storage Security:**
   - Use signed URLs for private images
   - Set proper file permissions
   - Implement access control

---

## Configuration

Add to your environment variables:

```bash
# OCR Service
OCR_SERVICE_URL=https://<YOUR_CLOUD_RUN_URL>/extract

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=telugu_ocr_app
DB_USER=your_user
DB_PASSWORD=your_password

# Storage
UPLOAD_FOLDER=./uploads
MAX_FILE_SIZE=10485760  # 10MB
```

---

## Future Enhancements (Optional)

1. **Export functionality** - Download as PDF or TXT
2. **Batch processing** - Upload multiple images
3. **Search** - Find previous jobs by text content
4. **Analytics** - Track correction patterns for OCR improvement
