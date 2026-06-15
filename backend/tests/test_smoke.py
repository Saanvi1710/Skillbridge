from main import app

def test_app_starts(unauthed_client):
    pass

def test_root_returns_ok(unauthed_client):
    response = unauthed_client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_health_returns_healthy(unauthed_client):
    response = unauthed_client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_ready_check_success(unauthed_client):
    response = unauthed_client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"

def test_ready_check_failure(unauthed_client, monkeypatch):
    # Mock os.getenv to simulate missing GROQ_API_KEY
    monkeypatch.setenv("GROQ_API_KEY", "")
    response = unauthed_client.get("/ready")
    assert response.status_code == 503
    assert response.json()["status"] == "degraded"
    assert "groq" in response.json()["failed"]



def test_security_headers_present(unauthed_client):
    response = unauthed_client.get("/")
    headers = response.headers
    assert "Strict-Transport-Security" in headers
    assert "X-Content-Type-Options" in headers
    assert "X-Frame-Options" in headers
    assert "X-XSS-Protection" in headers
    assert "Referrer-Policy" in headers
    assert "X-Request-ID" in headers

def test_cors_headers_on_options(unauthed_client):
    response = unauthed_client.options(
        "/", 
        headers={
            "Origin": "http://localhost:5173", 
            "Access-Control-Request-Method": "POST"
        }
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
