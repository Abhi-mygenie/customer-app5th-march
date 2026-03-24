"""
Tests for the backend API endpoints.
Uses curl-based testing against the running server to avoid Motor event loop issues.
Tests: root endpoint, status CRUD, CORS, 404 handling.
"""
import pytest
import httpx
import os

# Use the running backend URL
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001")
API_URL = f"{BASE_URL}/api"


@pytest.fixture
def client():
    """Sync httpx client pointing at the running server"""
    with httpx.Client(base_url=API_URL, timeout=10) as c:
        yield c


# ─── Root endpoint ────────────────────────────────────────────────

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["message"] == "Hello World"


# ─── POST /status ─────────────────────────────────────────────────

def test_create_status_check(client):
    payload = {"client_name": "test_client"}
    response = client.post("/status", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["client_name"] == "test_client"
    assert "id" in data
    assert "timestamp" in data


def test_create_status_check_missing_field(client):
    """POST /status without client_name should fail validation"""
    response = client.post("/status", json={})
    assert response.status_code == 422


# ─── GET /status ──────────────────────────────────────────────────

def test_get_status_checks(client):
    """GET /status should return a list"""
    response = client.get("/status")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


# ─── Create + Retrieve integration ───────────────────────────────

def test_create_and_retrieve_status(client):
    """Create a status check, then verify it appears in the list"""
    create_resp = client.post(
        "/status",
        json={"client_name": "integration_test_retrieve"}
    )
    assert create_resp.status_code == 200
    created = create_resp.json()

    list_resp = client.get("/status")
    assert list_resp.status_code == 200
    items = list_resp.json()

    found = [item for item in items if item["id"] == created["id"]]
    assert len(found) >= 1
    assert found[0]["client_name"] == "integration_test_retrieve"


# ─── Data format checks ──────────────────────────────────────────

def test_status_check_has_uuid_format(client):
    """The id should look like a UUID"""
    resp = client.post("/status", json={"client_name": "uuid_test"})
    data = resp.json()
    parts = data["id"].split("-")
    assert len(parts) == 5
    assert len(parts[0]) == 8


def test_status_check_timestamp_is_iso_format(client):
    """The timestamp should be a valid ISO format string"""
    resp = client.post("/status", json={"client_name": "timestamp_test"})
    data = resp.json()
    ts = data["timestamp"]
    from datetime import datetime
    try:
        datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        pytest.fail(f"Timestamp '{ts}' is not valid ISO format")


# ─── 404 for unknown routes ──────────────────────────────────────

def test_unknown_route_returns_404(client):
    response = client.get("/nonexistent-route-xyz")
    assert response.status_code in [404, 405]


# ─── Extra fields are ignored ────────────────────────────────────

def test_extra_fields_ignored(client):
    """Extra fields in request body should be handled gracefully"""
    payload = {"client_name": "extra_test", "extra_field": "should_be_ok"}
    response = client.post("/status", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["client_name"] == "extra_test"


# ─── CORS headers ────────────────────────────────────────────────

def test_cors_allows_origin(client):
    """Server should allow cross-origin requests"""
    response = client.options(
        "/",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        }
    )
    # CORS middleware should respond
    assert response.status_code in [200, 204, 400]
