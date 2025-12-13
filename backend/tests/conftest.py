import pytest


@pytest.fixture()
def app():
    # Import from src package layout (pyproject sets pythonpath=src for pytest).
    from ocr_service.app import create_app

    app = create_app(
        quota_checker=lambda: True,
        image_opener=lambda _stream: object(),
        ocr_engine=lambda _img, _lang: "",
    )
    app.config.update(TESTING=True)
    return app


@pytest.fixture()
def client(app):
    return app.test_client()
