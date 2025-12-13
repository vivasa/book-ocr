#!/usr/bin/env python3

import os

import requests

# Configure via env vars to avoid editing the script.
# Example:
#   export OCR_URL="http://localhost:8080/extract"
#   export OCR_LANG="kan"
OCR_URL = os.environ.get(
    "OCR_URL", "https://telugu-ocr-prod-777583762558.us-central1.run.app/extract"
)
OCR_LANG = (os.environ.get("OCR_LANG") or "").strip().lower()
IMAGE_PATH = os.environ.get("OCR_IMAGE", "bgvd1.png")


def main() -> None:
    url = OCR_URL
    if OCR_LANG:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}lang={OCR_LANG}"

    with open(IMAGE_PATH, "rb") as f:
        files = {"image": f}
        response = requests.post(url, files=files, timeout=60)

    print("URL:", url)
    print("Status Code:", response.status_code)
    try:
        print("Response Body:", response.json())
    except Exception:
        print("Response Text:", response.text)


if __name__ == "__main__":
    main()
