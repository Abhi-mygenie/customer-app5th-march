"""
Test suite for new phone and social media fields in config API
Tests: phone, facebookUrl, twitterUrl, youtubeUrl, whatsappNumber fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for restaurant admin"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "phone_or_email": "owner@18march.com",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data, "Token not in login response"
    return data["token"]

@pytest.fixture(scope="module")
def restaurant_id(auth_token):
    """Get restaurant ID from authenticated user"""
    response = requests.get(f"{BASE_URL}/api/auth/me", headers={
        "Authorization": f"Bearer {auth_token}"
    })
    assert response.status_code == 200, f"Get user failed: {response.text}"
    data = response.json()
    return data["user"]["id"]


class TestPutConfigNewFields:
    """Test PUT /api/config/ accepts new phone and social media fields"""
    
    def test_put_config_accepts_phone_field(self, auth_token):
        """PUT /api/config/ should accept phone field"""
        response = requests.put(
            f"{BASE_URL}/api/config/",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={"phone": "+91 9876543210"}
        )
        assert response.status_code == 200, f"PUT config failed: {response.text}"
        data = response.json()
        assert data["success"] is True
        assert data["config"]["phone"] == "+91 9876543210"
    
    def test_put_config_accepts_facebook_url(self, auth_token):
        """PUT /api/config/ should accept facebookUrl field"""
        response = requests.put(
            f"{BASE_URL}/api/config/",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={"facebookUrl": "https://facebook.com/testrestaurant"}
        )
        assert response.status_code == 200, f"PUT config failed: {response.text}"
        data = response.json()
        assert data["success"] is True
        assert data["config"]["facebookUrl"] == "https://facebook.com/testrestaurant"
    
    def test_put_config_accepts_twitter_url(self, auth_token):
        """PUT /api/config/ should accept twitterUrl field"""
        response = requests.put(
            f"{BASE_URL}/api/config/",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={"twitterUrl": "https://x.com/testrestaurant"}
        )
        assert response.status_code == 200, f"PUT config failed: {response.text}"
        data = response.json()
        assert data["success"] is True
        assert data["config"]["twitterUrl"] == "https://x.com/testrestaurant"
    
    def test_put_config_accepts_youtube_url(self, auth_token):
        """PUT /api/config/ should accept youtubeUrl field"""
        response = requests.put(
            f"{BASE_URL}/api/config/",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={"youtubeUrl": "https://youtube.com/@testrestaurant"}
        )
        assert response.status_code == 200, f"PUT config failed: {response.text}"
        data = response.json()
        assert data["success"] is True
        assert data["config"]["youtubeUrl"] == "https://youtube.com/@testrestaurant"
    
    def test_put_config_accepts_whatsapp_number(self, auth_token):
        """PUT /api/config/ should accept whatsappNumber field"""
        response = requests.put(
            f"{BASE_URL}/api/config/",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={"whatsappNumber": "+919876543210"}
        )
        assert response.status_code == 200, f"PUT config failed: {response.text}"
        data = response.json()
        assert data["success"] is True
        assert data["config"]["whatsappNumber"] == "+919876543210"
    
    def test_put_config_all_social_fields_together(self, auth_token):
        """PUT /api/config/ should accept all social fields in single request"""
        test_data = {
            "phone": "+91 1111111111",
            "facebookUrl": "https://facebook.com/all-test",
            "twitterUrl": "https://x.com/all-test",
            "youtubeUrl": "https://youtube.com/@all-test",
            "whatsappNumber": "+911111111111"
        }
        response = requests.put(
            f"{BASE_URL}/api/config/",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=test_data
        )
        assert response.status_code == 200, f"PUT config failed: {response.text}"
        data = response.json()
        assert data["success"] is True
        config = data["config"]
        assert config["phone"] == test_data["phone"]
        assert config["facebookUrl"] == test_data["facebookUrl"]
        assert config["twitterUrl"] == test_data["twitterUrl"]
        assert config["youtubeUrl"] == test_data["youtubeUrl"]
        assert config["whatsappNumber"] == test_data["whatsappNumber"]


class TestGetConfigNewFields:
    """Test GET /api/config/{restaurant_id} returns new fields"""
    
    def test_get_config_returns_phone_field(self, auth_token, restaurant_id):
        """GET /api/config/{id} should return phone field"""
        # First set a value
        requests.put(
            f"{BASE_URL}/api/config/",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={"phone": "+91 2222222222"}
        )
        
        # Then verify it persists
        response = requests.get(f"{BASE_URL}/api/config/{restaurant_id}")
        assert response.status_code == 200, f"GET config failed: {response.text}"
        data = response.json()
        assert "phone" in data, "phone field not in GET response"
        assert data["phone"] == "+91 2222222222"
    
    def test_get_config_returns_facebook_url(self, auth_token, restaurant_id):
        """GET /api/config/{id} should return facebookUrl field"""
        requests.put(
            f"{BASE_URL}/api/config/",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={"facebookUrl": "https://facebook.com/get-test"}
        )
        
        response = requests.get(f"{BASE_URL}/api/config/{restaurant_id}")
        assert response.status_code == 200
        data = response.json()
        assert "facebookUrl" in data
        assert data["facebookUrl"] == "https://facebook.com/get-test"
    
    def test_get_config_returns_twitter_url(self, auth_token, restaurant_id):
        """GET /api/config/{id} should return twitterUrl field"""
        requests.put(
            f"{BASE_URL}/api/config/",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={"twitterUrl": "https://x.com/get-test"}
        )
        
        response = requests.get(f"{BASE_URL}/api/config/{restaurant_id}")
        assert response.status_code == 200
        data = response.json()
        assert "twitterUrl" in data
        assert data["twitterUrl"] == "https://x.com/get-test"
    
    def test_get_config_returns_youtube_url(self, auth_token, restaurant_id):
        """GET /api/config/{id} should return youtubeUrl field"""
        requests.put(
            f"{BASE_URL}/api/config/",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={"youtubeUrl": "https://youtube.com/@get-test"}
        )
        
        response = requests.get(f"{BASE_URL}/api/config/{restaurant_id}")
        assert response.status_code == 200
        data = response.json()
        assert "youtubeUrl" in data
        assert data["youtubeUrl"] == "https://youtube.com/@get-test"
    
    def test_get_config_returns_whatsapp_number(self, auth_token, restaurant_id):
        """GET /api/config/{id} should return whatsappNumber field"""
        requests.put(
            f"{BASE_URL}/api/config/",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={"whatsappNumber": "+912222222222"}
        )
        
        response = requests.get(f"{BASE_URL}/api/config/{restaurant_id}")
        assert response.status_code == 200
        data = response.json()
        assert "whatsappNumber" in data
        assert data["whatsappNumber"] == "+912222222222"


class TestGetConfigDefaultValues:
    """Test GET /api/config/{restaurant_id} returns defaults for nonexistent restaurant"""
    
    def test_get_config_defaults_include_new_fields(self):
        """GET /api/config/{nonexistent_id} should include null defaults for new fields"""
        response = requests.get(f"{BASE_URL}/api/config/nonexistent_test_id_12345")
        assert response.status_code == 200
        data = response.json()
        
        # All new fields should be present with null/None default
        assert "phone" in data, "phone field missing from defaults"
        assert "facebookUrl" in data, "facebookUrl field missing from defaults"
        assert "twitterUrl" in data, "twitterUrl field missing from defaults"
        assert "youtubeUrl" in data, "youtubeUrl field missing from defaults"
        assert "whatsappNumber" in data, "whatsappNumber field missing from defaults"
        
        # Values should be None/null
        assert data["phone"] is None
        assert data["facebookUrl"] is None
        assert data["twitterUrl"] is None
        assert data["youtubeUrl"] is None
        assert data["whatsappNumber"] is None
