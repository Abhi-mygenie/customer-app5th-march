"""
Backend regression tests for CR-2026-06-17-001 Menu Order Enhancements.

Covers:
- POST /api/auth/login with admin owner@18march.com
- GET /api/config/478 (public) returns config with new optional fields acceptable
- PUT /api/config/ accepts and persists `channelOverrides` and `stationTimings`
- Cleanup: reset channelOverrides={} and stationTimings={} on restaurant 478
"""
import os
import pytest
import requests

# Backend URL - use REACT_APP_BACKEND_URL if set, otherwise local supervisor backend
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "http://localhost:8001").rstrip("/")

ADMIN_EMAIL = "owner@18march.com"
ADMIN_PASSWORD = "Qplazm@10"
RESTAURANT_ID = "478"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(session):
    resp = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"phone_or_email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    assert resp.status_code == 200, f"login failed: {resp.status_code} {resp.text}"
    data = resp.json()
    assert data.get("success") is True, f"login success!=true: {data}"
    assert data.get("token"), "no token in login response"
    # pos_token may be present (returned from upstream POS auth)
    user = data.get("user") or {}
    # Note: backend login response does not expose 'user_type' field, but the
    # id prefix 'pos_..._restaurant_' indicates a restaurant admin.
    assert "restaurant" in (user.get("id") or ""), f"restaurant admin id expected: {user}"
    assert str(user.get("restaurant_id")) == RESTAURANT_ID, f"restaurant_id expected {RESTAURANT_ID}: {user}"
    return data["token"]


class TestAuth:
    """Admin login flow"""

    def test_login_returns_token_and_pos_token(self, session):
        resp = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone_or_email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=20,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") is True
        assert isinstance(data.get("token"), str) and len(data["token"]) > 0
        # pos_token is best-effort (depends on upstream POS); just assert key exists or None
        assert "pos_token" in data
        user = data.get("user", {})
        assert "restaurant" in (user.get("id") or "")
        assert str(user.get("restaurant_id")) == RESTAURANT_ID

    def test_login_invalid_password(self, session):
        resp = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone_or_email": ADMIN_EMAIL, "password": "wrongpass"},
            timeout=20,
        )
        assert resp.status_code in (200, 400, 401)
        if resp.status_code == 200:
            assert resp.json().get("success") is False


class TestConfigGet:
    """Public GET /api/config/{rid}"""

    def test_get_config_public_no_auth(self, session):
        resp = session.get(f"{BASE_URL}/api/config/{RESTAURANT_ID}", timeout=20)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert isinstance(data, dict)
        # new optional fields may be absent/null/empty — all acceptable
        for key in ("stationTimings", "channelOverrides"):
            if key in data:
                assert data[key] is None or isinstance(data[key], dict)


class TestConfigPutRoundTrip:
    """PUT /api/config/ persists new CR fields"""

    def test_put_then_get_persists_overrides(self, session, auth_token):
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        payload = {
            "channelOverrides": {
                "category": {"cat-test": {"takeaway": False}},
                "item": {"item-test": {"delivery": False}},
            },
            "stationTimings": {"station-test": {"start": "09:00", "end": "22:00"}},
        }
        put_resp = requests.put(f"{BASE_URL}/api/config/", json=payload, headers=headers, timeout=30)
        assert put_resp.status_code == 200, f"PUT failed: {put_resp.status_code} {put_resp.text}"

        # GET reflects values
        get_resp = requests.get(f"{BASE_URL}/api/config/{RESTAURANT_ID}", timeout=20)
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert data.get("channelOverrides", {}).get("category", {}).get("cat-test", {}).get("takeaway") is False
        assert data.get("channelOverrides", {}).get("item", {}).get("item-test", {}).get("delivery") is False
        st = data.get("stationTimings", {}).get("station-test", {})
        assert st.get("start") == "09:00"
        assert st.get("end") == "22:00"

    def test_reset_overrides_cleanup(self, session, auth_token):
        """Reset to empty so we don't pollute restaurant 478"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        payload = {"channelOverrides": {}, "stationTimings": {}}
        put_resp = requests.put(f"{BASE_URL}/api/config/", json=payload, headers=headers, timeout=30)
        assert put_resp.status_code == 200

        get_resp = requests.get(f"{BASE_URL}/api/config/{RESTAURANT_ID}", timeout=20)
        assert get_resp.status_code == 200
        data = get_resp.json()
        # After reset, fields should either be missing or empty dicts
        assert data.get("channelOverrides", {}) in ({}, None) or (
            not data["channelOverrides"].get("category") and not data["channelOverrides"].get("item")
        )
        assert data.get("stationTimings", {}) in ({}, None) or not data["stationTimings"]
