import os


def test_healthz_ok(client):
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.get_json() == {"status": "ok"}


def test_health_ok(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.get_json() == {"status": "ok"}


def test_frontend_returns_404_when_not_built(monkeypatch):
    from ocr_service.app import create_app

    monkeypatch.delenv("FRONTEND_DIST", raising=False)
    app = create_app(
        quota_checker=lambda: True,
        image_opener=lambda _stream: object(),
        ocr_engine=lambda _img, _lang: "",
    )
    client = app.test_client()

    resp = client.get("/")
    assert resp.status_code == 404
    assert resp.get_json() == {"error": "Frontend not built"}


def test_frontend_serves_index_when_built(tmp_path, monkeypatch):
    from ocr_service.app import create_app

    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text("<html><body>ok</body></html>")

    monkeypatch.setenv("FRONTEND_DIST", str(dist))
    app = create_app(
        quota_checker=lambda: True,
        image_opener=lambda _stream: object(),
        ocr_engine=lambda _img, _lang: "",
    )
    client = app.test_client()

    resp = client.get("/")
    assert resp.status_code == 200
    assert b"ok" in resp.data
