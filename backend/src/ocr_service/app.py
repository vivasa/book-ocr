import datetime
import os
from typing import Callable, Optional

import pytesseract
from flask import Flask, jsonify, request
from PIL import Image

# --- CONFIGURATION ---
DAILY_LIMIT = int(os.environ.get("DAILY_LIMIT", 2))
FIRESTORE_DATABASE = os.environ.get("FIRESTORE_DATABASE", "ocr-budget-limit")
OCR_LANGUAGE = os.environ.get("OCR_LANGUAGE", "tel")
# ---------------------

# Allowed Tesseract language codes for per-request override.
# Keep this list tight to avoid unexpected CPU cost / misuse.
ALLOWED_OCR_LANGUAGES = {
    "tel",  # Telugu
    "kan",  # Kannada
    "hin",  # Hindi (Devanagari script)
    "eng",  # English
}


def create_app(
    *,
    quota_checker: Optional[Callable[[], bool]] = None,
    image_opener: Optional[Callable[[object], object]] = None,
    ocr_engine: Optional[Callable[[object, str], str]] = None,
) -> Flask:
    disable_quota = (os.environ.get("DISABLE_QUOTA", "") or "").strip().lower() in {"1", "true", "yes"}
    frontend_dist = os.environ.get("FRONTEND_DIST", "")
    app = Flask(
        __name__,
        static_folder=(frontend_dist or None),
        static_url_path="/",
    )

    def check_and_update_quota() -> bool:
        """Return True if request is allowed; False if daily limit exceeded."""
        # Import + initialize Firestore lazily so tests don't need google libs.
        from google.cloud import firestore  # type: ignore

        db = firestore.Client(database=FIRESTORE_DATABASE)
        today_str = datetime.datetime.now().strftime("%Y-%m-%d")
        doc_ref = db.collection("daily_stats").document("usage")

        @firestore.transactional
        def update_in_transaction(transaction: firestore.Transaction, ref):
            snapshot = ref.get(transaction=transaction)

            current_count = 0
            if snapshot.exists:
                data = snapshot.to_dict() or {}
                stored_date = data.get("date")
                if stored_date == today_str:
                    current_count = data.get("count", 0)

            if current_count >= DAILY_LIMIT:
                return False

            transaction.set(
                ref,
                {
                    "date": today_str,
                    "count": current_count + 1,
                },
            )
            return True

        transaction = db.transaction()
        return update_in_transaction(transaction, doc_ref)

    effective_quota_checker = quota_checker or check_and_update_quota
    effective_image_opener = image_opener or (lambda stream: Image.open(stream))
    effective_ocr_engine = ocr_engine or (lambda img, lang: pytesseract.image_to_string(img, lang=lang))

    @app.route("/extract", methods=["POST"])
    def extract_text():
        # 1. CHECK QUOTA FIRST
        if not disable_quota:
            try:
                allowed = effective_quota_checker()
                if not allowed:
                    return (
                        jsonify({"error": "Daily quota exceeded. Please try again tomorrow."}),
                        429,
                    )
            except Exception as e:
                # If DB fails, fail safe
                print(f"Database Error: {e}")
                return jsonify({"error": "Service temporarily unavailable"}), 500

        if "image" not in request.files:
            return jsonify({"error": "No image file provided"}), 400

        file = request.files["image"]
        if file.filename == "":
            return jsonify({"error": "No selected file"}), 400

        requested_lang = (request.args.get("lang") or "").strip().lower()
        lang = OCR_LANGUAGE
        if requested_lang:
            if requested_lang not in ALLOWED_OCR_LANGUAGES:
                return (
                    jsonify(
                        {
                            "error": "Unsupported OCR language. Allowed: tel, kan, hin, eng.",
                        }
                    ),
                    400,
                )
            lang = requested_lang

        try:
            image = effective_image_opener(file.stream)
            text = effective_ocr_engine(image, lang)
            return jsonify({"status": "success", "text": text.strip()})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/healthz", methods=["GET"])
    def healthz():
        return jsonify({"status": "ok"}), 200

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def frontend(path: str):
        # Don't interfere with API routes.
        if path.startswith("extract"):
            return jsonify({"error": "Not found"}), 404

        resp = _try_serve_frontend_file(app, path)
        if resp is not None:
            return resp
        return jsonify({"error": "Frontend not built"}), 404

    return app


def _try_serve_frontend_file(app: Flask, path: str):
    if not app.static_folder:
        return None

    index_path = os.path.join(app.static_folder, "index.html")
    if not os.path.exists(index_path):
        return None

    # Serve static asset if it exists, otherwise fall back to index.html (SPA routing).
    candidate = os.path.join(app.static_folder, path)
    if path and os.path.exists(candidate) and os.path.isfile(candidate):
        return app.send_static_file(path)
    return app.send_static_file("index.html")

# Gunicorn entrypoint
app = create_app()
