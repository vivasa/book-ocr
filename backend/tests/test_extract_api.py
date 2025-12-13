from __future__ import annotations

import io


def _fake_image_file(filename: str = "img.png"):
    # Flask test client accepts (fileobj, filename)
    return io.BytesIO(b"fake-image-bytes"), filename


def test_extract_missing_image_returns_400(client):
    resp = client.post("/extract")
    assert resp.status_code == 400
    assert resp.get_json() == {"error": "No image file provided"}


def test_extract_empty_filename_returns_400(client):
    data = {"image": _fake_image_file(filename="")}
    resp = client.post("/extract", data=data, content_type="multipart/form-data")
    assert resp.status_code == 400
    assert resp.get_json() == {"error": "No selected file"}


def test_extract_unsupported_lang_returns_400(client):
    data = {"image": _fake_image_file()}
    resp = client.post(
        "/extract?lang=zzz",
        data=data,
        content_type="multipart/form-data",
    )
    assert resp.status_code == 400
    assert resp.get_json() == {"error": "Unsupported OCR language. Allowed: tel, kan, hin, eng."}


def test_extract_success_calls_tesseract_with_selected_lang(monkeypatch):
    from ocr_service.app import create_app

    seen = {}

    def quota_ok() -> bool:
        return True

    def open_ok(_stream):
        return object()

    def ocr_ok(_img, lang: str):
        seen["lang"] = lang
        return " hello "

    app = create_app(quota_checker=quota_ok, image_opener=open_ok, ocr_engine=ocr_ok)
    client = app.test_client()

    data = {"image": _fake_image_file()}
    resp = client.post(
        "/extract?lang=kan",
        data=data,
        content_type="multipart/form-data",
    )

    assert resp.status_code == 200
    assert resp.get_json() == {"status": "success", "text": "hello"}
    assert seen["lang"] == "kan"


def test_extract_quota_exceeded_returns_429():
    from ocr_service.app import create_app

    app = create_app(
        quota_checker=lambda: False,
        image_opener=lambda _stream: object(),
        ocr_engine=lambda _img, _lang: "hello",
    )
    client = app.test_client()

    data = {"image": _fake_image_file()}
    resp = client.post("/extract", data=data, content_type="multipart/form-data")
    assert resp.status_code == 429
    assert resp.get_json() == {"error": "Daily quota exceeded. Please try again tomorrow."}


def test_extract_firestore_failure_returns_500():
    from ocr_service.app import create_app

    def quota_boom() -> bool:
        raise RuntimeError("boom")

    app = create_app(
        quota_checker=quota_boom,
        image_opener=lambda _stream: object(),
        ocr_engine=lambda _img, _lang: "hello",
    )
    client = app.test_client()

    data = {"image": _fake_image_file()}
    resp = client.post("/extract", data=data, content_type="multipart/form-data")
    assert resp.status_code == 500
    assert resp.get_json() == {"error": "Service temporarily unavailable"}
