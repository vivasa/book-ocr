import os
import pytesseract
from flask import Flask, request, jsonify
from PIL import Image

app = Flask(__name__)

@app.route('/extract', methods=['POST'])
def extract_text():
    # 1. Validate that an image was sent
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        # 2. Open image from memory
        image = Image.open(file.stream)
        
        # 3. Extract text using Telugu language code ('tel')
        text = pytesseract.image_to_string(image, lang='tel')
        
        return jsonify({
            "status": "success",
            "text": text.strip()
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Local development server
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
    