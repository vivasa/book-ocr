import os
import datetime
import pytesseract
from flask import Flask, request, jsonify
from PIL import Image
from google.cloud import firestore

app = Flask(__name__)

# --- CONFIGURATION ---
DAILY_LIMIT = 2  # Set your safe limit here
# ---------------------

# Initialize Firestore Client
db = firestore.Client(database='ocr-budget-limit')

def check_and_update_quota():
    """
    Checks if the daily limit has been reached. 
    Returns True if request is allowed, False if limit exceeded.
    """
    today_str = datetime.datetime.now().strftime('%Y-%m-%d')
    doc_ref = db.collection('daily_stats').document('usage')

    # Run this in a transaction to prevent race conditions
    @firestore.transactional
    def update_in_transaction(transaction, ref):
        snapshot = ref.get(transaction=transaction)
        
        current_count = 0
        
        if snapshot.exists:
            data = snapshot.to_dict()
            stored_date = data.get('date')
            
            # If the date in DB is today, use the stored count
            if stored_date == today_str:
                current_count = data.get('count', 0)
            else:
                # New day! Reset count to 0
                current_count = 0
        
        # Check limit
        if current_count >= DAILY_LIMIT:
            return False
        
        # Increment and save
        transaction.set(ref, {
            'date': today_str,
            'count': current_count + 1
        })
        return True

    transaction = db.transaction()
    return update_in_transaction(transaction, doc_ref)

@app.route('/extract', methods=['POST'])
def extract_text():
    # 1. CHECK QUOTA FIRST
    try:
        allowed = check_and_update_quota()
        if not allowed:
            return jsonify({
                "error": "Daily quota exceeded. Please try again tomorrow."
            }), 429
    except Exception as e:
        # If DB fails, fail safe or log error (here we fail safe)
        print(f"Database Error: {e}")
        return jsonify({"error": "Service temporarily unavailable"}), 500

    # 2. STANDARD LOGIC
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        image = Image.open(file.stream)
        text = pytesseract.image_to_string(image, lang='tel')
        return jsonify({"status": "success", "text": text.strip()})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))