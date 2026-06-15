from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_app_starts():
    # If the app fails to start, TestClient(app) would have raised an error
    pass

def test_root_returns_ok():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_health_returns_healthy():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_all_routes_registered():
    routes = [route.path for route in app.routes]
    expected_routes = ["/transcribe", "/extract-skills", "/save-profile", "/profile/{profile_id}", "/match-jobs", "/share/{slug}"]
    for route in expected_routes:
        assert route in routes

def test_security_headers_present():
    response = client.get("/")
    headers = response.headers
    assert "Strict-Transport-Security" in headers
    assert "X-Content-Type-Options" in headers
    assert "X-Frame-Options" in headers

def test_cors_headers_on_options():
    response = client.options(
        "/", 
        headers={
            "Origin": "http://localhost:5173", 
            "Access-Control-Request-Method": "POST"
        }
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
