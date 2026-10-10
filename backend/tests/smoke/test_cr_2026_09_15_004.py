# CR-2026-09-15-004: Admin login now calls POS directly (two-step).
# db.users is never read. JWT carries all user data as extra claims.
# get_current_user reads claims only — no db.users lookup.

import os
import time
import pytest
import httpx

BASE_URL   = os.environ.get("TEST_BASE_URL", "http://localhost:8001")
ADMIN_EMAIL = "owner@kunafamahal.com"
ADMIN_PASS  = "Qplazm@10"
EXPECTED_RESTAURANT_ID = "689"
EXPECTED_RESTAURANT_NAME = "Kunafa Mahal"

@pytest.fixture(scope="module")
def client():
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        yield c


@pytest.fixture(scope="module")
def admin_token(client):
    resp = client.post("/api/auth/login", json={
        "phone_or_email": ADMIN_EMAIL,
        "password": ADMIN_PASS,
    })
    for _ in range(3):
        if resp.status_code != 429:
            break
        time.sleep(21)
        resp = client.post("/api/auth/login", json={
            "phone_or_email": ADMIN_EMAIL,
            "password": ADMIN_PASS,
        })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["token"]


@pytest.mark.smoke
def test_admin_login_success_200(client):
    """T1: Correct credentials → 200, user_type=restaurant, token, pos_token, user with restaurant_id."""
    resp = client.post("/api/auth/login", json={
        "phone_or_email": ADMIN_EMAIL,
        "password": ADMIN_PASS,
    })
    for _ in range(3):
        if resp.status_code != 429:
            break
        time.sleep(21)
        resp = client.post("/api/auth/login", json={
            "phone_or_email": ADMIN_EMAIL,
            "password": ADMIN_PASS,
        })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data.get("user_type") == "restaurant"
    assert data.get("token", "").startswith("ey"), "Missing/invalid JWT token"
    assert data.get("pos_token"), "Missing pos_token"
    user = data.get("user", {})
    assert str(user.get("restaurant_id")) == EXPECTED_RESTAURANT_ID, (
        f"Expected restaurant_id={EXPECTED_RESTAURANT_ID}, got {user.get('restaurant_id')}"
    )
    assert user.get("restaurant_name") == EXPECTED_RESTAURANT_NAME, (
        f"Expected restaurant_name={EXPECTED_RESTAURANT_NAME}, got {user.get('restaurant_name')}"
    )


@pytest.mark.smoke
def test_admin_login_wrong_password_401(client):
    """T2: Wrong password → 401."""
    time.sleep(2)
    resp = client.post("/api/auth/login", json={
        "phone_or_email": ADMIN_EMAIL,
        "password": "WrongPassword123",
    })
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"


@pytest.mark.smoke
def test_admin_login_unknown_email_401(client):
    """T3: Unknown email → 401."""
    time.sleep(2)
    resp = client.post("/api/auth/login", json={
        "phone_or_email": "unknown@doesnotexist.com",
        "password": "SomePassword123",
    })
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"


@pytest.mark.smoke
def test_auth_me_reads_jwt_claims_only(client, admin_token):
    """T4: /api/auth/me with new JWT → returns restaurant_id from JWT claims (no db.users read)."""
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    user = data.get("user", {})
    assert str(user.get("restaurant_id")) == EXPECTED_RESTAURANT_ID, (
        f"restaurant_id mismatch: expected {EXPECTED_RESTAURANT_ID}, got {user.get('restaurant_id')}"
    )
    assert user.get("restaurant_name") == EXPECTED_RESTAURANT_NAME


@pytest.mark.smoke
def test_old_jwt_no_restaurant_id_returns_401(client):
    """T5: Old-format JWT (no restaurant_id claim) → 401 Session expired."""
    import jwt as pyjwt
    import datetime
    # Craft a JWT without restaurant_id (old format)
    secret = os.environ.get("JWT_SECRET", "dev-secret-change-in-production")
    old_token = pyjwt.encode({
        "user_id": "123",
        "user_type": "restaurant",
        "exp": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)).timestamp(),
    }, secret, algorithm="HS256")
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {old_token}"})
    assert resp.status_code == 401, f"Expected 401 for old JWT, got {resp.status_code}: {resp.text}"
