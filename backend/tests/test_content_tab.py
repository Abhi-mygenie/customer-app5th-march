"""
Tests for Content Tab features:
- Custom Pages CRUD (POST, PUT, DELETE /api/config/pages)
- Config update with aboutUsContent, footerText, footerLinks, navMenuOrder
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "owner@18march.com"
TEST_PASSWORD = "admin123"

class TestContentTabBackend:
    """Tests for Content tab backend APIs"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for restaurant admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone_or_email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data["user_type"] == "restaurant", "Expected restaurant user type"
        return data["token"]
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Headers with auth token"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        }
    
    # ============================================
    # Custom Pages CRUD Tests
    # ============================================
    
    def test_create_custom_page(self, auth_headers):
        """POST /api/config/pages - create a custom page"""
        page_data = {
            "title": "TEST_Privacy Policy",
            "slug": "test-privacy-policy",
            "content": "<h1>Privacy Policy</h1><p>Test content for privacy policy page.</p>",
            "published": True
        }
        response = requests.post(
            f"{BASE_URL}/api/config/pages",
            json=page_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Create page failed: {response.text}"
        data = response.json()
        assert data["success"] is True
        assert "page" in data
        assert data["page"]["title"] == page_data["title"]
        assert data["page"]["slug"] == page_data["slug"]
        assert data["page"]["content"] == page_data["content"]
        assert data["page"]["published"] is True
        assert "id" in data["page"]
        
        # Store page_id for later tests
        self.__class__.created_page_id = data["page"]["id"]
        print(f"Created page with ID: {self.__class__.created_page_id}")
    
    def test_update_custom_page(self, auth_headers):
        """PUT /api/config/pages/{page_id} - update a custom page"""
        assert hasattr(self.__class__, 'created_page_id'), "No page created in previous test"
        page_id = self.__class__.created_page_id
        
        update_data = {
            "title": "TEST_Privacy Policy Updated",
            "content": "<h1>Updated Privacy Policy</h1><p>Updated content.</p>",
            "published": False
        }
        response = requests.put(
            f"{BASE_URL}/api/config/pages/{page_id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Update page failed: {response.text}"
        data = response.json()
        assert data["success"] is True
    
    def test_update_nonexistent_page(self, auth_headers):
        """PUT /api/config/pages/{page_id} - 404 for non-existent page"""
        response = requests.put(
            f"{BASE_URL}/api/config/pages/nonexistent-page-id-12345",
            json={"title": "Updated"},
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_delete_custom_page(self, auth_headers):
        """DELETE /api/config/pages/{page_id} - delete a custom page"""
        assert hasattr(self.__class__, 'created_page_id'), "No page created in previous test"
        page_id = self.__class__.created_page_id
        
        response = requests.delete(
            f"{BASE_URL}/api/config/pages/{page_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Delete page failed: {response.text}"
        data = response.json()
        assert data["success"] is True
    
    def test_delete_nonexistent_page(self, auth_headers):
        """DELETE /api/config/pages/{page_id} - 404 for non-existent page"""
        response = requests.delete(
            f"{BASE_URL}/api/config/pages/nonexistent-page-id-12345",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    # ============================================
    # Config Update Tests (Content fields)
    # ============================================
    
    def test_update_about_us_content(self, auth_headers):
        """PUT /api/config/ - update aboutUsContent field"""
        response = requests.put(
            f"{BASE_URL}/api/config/",
            json={
                "aboutUsContent": "<h1>About Us</h1><p>We are a family restaurant.</p>",
                "aboutUsImage": "https://example.com/about-us.jpg",
                "openingHours": "<p>Mon-Fri: 10am-10pm</p><p>Sat-Sun: 9am-11pm</p>"
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Update config failed: {response.text}"
        data = response.json()
        assert data["success"] is True
        assert "config" in data
    
    def test_update_footer_content(self, auth_headers):
        """PUT /api/config/ - update footerText and footerLinks fields"""
        response = requests.put(
            f"{BASE_URL}/api/config/",
            json={
                "footerText": "© 2026 Test Restaurant. All rights reserved.",
                "footerLinks": [
                    {"label": "Privacy Policy", "url": "/privacy"},
                    {"label": "Terms of Service", "url": "/terms"}
                ]
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Update config failed: {response.text}"
        data = response.json()
        assert data["success"] is True
        assert "config" in data
        # Verify footerLinks is saved
        assert "footerLinks" in data["config"]
        assert len(data["config"]["footerLinks"]) == 2
    
    def test_update_nav_menu_order(self, auth_headers):
        """PUT /api/config/ - update navMenuOrder field"""
        response = requests.put(
            f"{BASE_URL}/api/config/",
            json={
                "navMenuOrder": [
                    {"id": "home", "label": "Home", "type": "builtin", "visible": True},
                    {"id": "about", "label": "About Us", "type": "builtin", "visible": True},
                    {"id": "menu", "label": "Menu", "type": "builtin", "visible": False}
                ]
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Update config failed: {response.text}"
        data = response.json()
        assert data["success"] is True
        assert "config" in data
        # Verify navMenuOrder is saved
        assert "navMenuOrder" in data["config"]
        assert len(data["config"]["navMenuOrder"]) == 3
        # Verify order is preserved
        assert data["config"]["navMenuOrder"][0]["id"] == "home"
        assert data["config"]["navMenuOrder"][1]["id"] == "about"
        assert data["config"]["navMenuOrder"][2]["id"] == "menu"
        assert data["config"]["navMenuOrder"][2]["visible"] is False
    
    def test_update_all_content_fields(self, auth_headers):
        """PUT /api/config/ - update all content fields at once"""
        response = requests.put(
            f"{BASE_URL}/api/config/",
            json={
                "aboutUsContent": "<h1>Combined Test</h1><p>Full content update test.</p>",
                "openingHours": "<p>Open 24/7</p>",
                "footerText": "Footer combined test",
                "footerLinks": [{"label": "Contact", "url": "/contact"}],
                "navMenuOrder": [
                    {"id": "home", "label": "Home", "type": "builtin", "visible": True},
                    {"id": "menu", "label": "Menu", "type": "builtin", "visible": True},
                    {"id": "about", "label": "About Us", "type": "builtin", "visible": True}
                ]
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Update config failed: {response.text}"
        data = response.json()
        assert data["success"] is True
    
    # ============================================
    # Auth Tests
    # ============================================
    
    def test_create_page_without_auth(self):
        """POST /api/config/pages - requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/config/pages",
            json={"title": "Test", "slug": "test", "content": "test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_update_config_without_auth(self):
        """PUT /api/config/ - requires auth"""
        response = requests.put(
            f"{BASE_URL}/api/config/",
            json={"aboutUsContent": "test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestConfigGet:
    """Tests for GET /api/config/{restaurant_id}"""
    
    def test_get_config_returns_defaults_for_content_fields(self):
        """GET /api/config/{id} - returns default values for new content fields"""
        response = requests.get(f"{BASE_URL}/api/config/nonexistent-restaurant")
        assert response.status_code == 200, f"Get config failed: {response.text}"
        data = response.json()
        
        # Verify content field defaults
        assert "aboutUsContent" in data
        assert data["aboutUsContent"] is None
        assert "footerText" in data
        assert data["footerText"] is None
        assert "footerLinks" in data
        assert data["footerLinks"] == []
        assert "customPages" in data
        assert data["customPages"] == []
        assert "navMenuOrder" in data
        assert len(data["navMenuOrder"]) == 3
        # Check default nav items
        nav_ids = [item["id"] for item in data["navMenuOrder"]]
        assert "home" in nav_ids
        assert "menu" in nav_ids
        assert "about" in nav_ids
