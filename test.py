#!/usr/bin/env python3

import requests

# The URL of your local Docker container
url = "http://localhost:8080/extract"

# Path to your local image
image_path = "markandeya.png"  # Make sure this file exists

try:
    with open(image_path, "rb") as f:
        # The key 'image' must match what the Flask app expects
        files = {"image": f}
        response = requests.post(url, files=files)
        
    print("Status Code:", response.status_code)
    print("Response Body:", response.json())

except Exception as e:
    print(f"Error: {e}")
