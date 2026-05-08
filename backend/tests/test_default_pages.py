"""
Backend API tests for default pages: About Us, Contact, Feedback
- Tests config GET for aboutUsContent, openingHours, feedbackEnabled, navMenuOrder
- Tests feedback POST (public endpoint)
- Tests seeded default content for multiple restaurants
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestConfigDefaultPages:
    """Tests for GET /api/config/{restaurant_id} - default page content"""
    
    def test_config_478_has_about_us_content(self):
        """Verify 478 has aboutUsContent with seeded rich content"""
        response = requests.get(f"{BASE_URL}/api/config/478")
        assert response.status_code == 200
        data = response.json()
        
        # Check aboutUsContent exists and has expected h2 headings
        assert "aboutUsContent" in data
        assert data["aboutUsContent"] is not None
        assert "Our Story" in data["aboutUsContent"]
        assert "Our Mission" in data["aboutUsContent"]
        assert "Our Values" in data["aboutUsContent"]
        print(f"✓ 478 aboutUsContent contains: Our Story, Our Mission, Our Values")
        
    def test_config_478_has_about_us_image(self):
        """Verify 478 has aboutUsImage"""
        response = requests.get(f"{BASE_URL}/api/config/478")
        assert response.status_code == 200
        data = response.json()
        
        assert "aboutUsImage" in data
        assert data["aboutUsImage"] is not None
        assert data["aboutUsImage"].startswith("http")
        print(f"✓ 478 aboutUsImage: {data['aboutUsImage'][:50]}...")
        
    def test_config_478_has_opening_hours(self):
        """Verify 478 has openingHours with table structure"""
        response = requests.get(f"{BASE_URL}/api/config/478")
        assert response.status_code == 200
        data = response.json()
        
        assert "openingHours" in data
        assert data["openingHours"] is not None
        assert "<table>" in data["openingHours"]
        assert "Monday" in data["openingHours"]
        print(f"✓ 478 openingHours contains table with days")
        
    def test_config_478_has_nav_menu_order_with_5_items(self):
        """Verify 478 navMenuOrder has 5 built-in items"""
        response = requests.get(f"{BASE_URL}/api/config/478")
        assert response.status_code == 200
        data = response.json()
        
        assert "navMenuOrder" in data
        nav_items = data["navMenuOrder"]
        assert len(nav_items) >= 5
        
        # Check for the 5 built-in items
        nav_ids = [item["id"] for item in nav_items]
        assert "home" in nav_ids
        assert "menu" in nav_ids
        assert "about" in nav_ids
        assert "contact" in nav_ids
        assert "feedback" in nav_ids
        print(f"✓ 478 navMenuOrder has 5 items: {nav_ids}")
        
    def test_config_478_has_feedback_enabled(self):
        """Verify 478 has feedbackEnabled field"""
        response = requests.get(f"{BASE_URL}/api/config/478")
        assert response.status_code == 200
        data = response.json()
        
        assert "feedbackEnabled" in data
        assert data["feedbackEnabled"] == True
        print(f"✓ 478 feedbackEnabled: True")
        
    def test_config_478_has_social_links(self):
        """Verify 478 has social media links (from previous tests)"""
        response = requests.get(f"{BASE_URL}/api/config/478")
        assert response.status_code == 200
        data = response.json()
        
        assert "instagramUrl" in data
        assert data["instagramUrl"] is not None
        assert "facebookUrl" in data
        assert data["facebookUrl"] is not None
        assert "phone" in data
        assert data["phone"] is not None
        print(f"✓ 478 social links present: instagram, facebook, phone")
        
    def test_config_689_kunafa_mahal_has_seeded_defaults(self):
        """Verify 689 (Kunafa Mahal) has seeded default content"""
        response = requests.get(f"{BASE_URL}/api/config/689")
        assert response.status_code == 200
        data = response.json()
        
        # Check seeded content exists
        assert "aboutUsContent" in data
        assert data["aboutUsContent"] is not None
        assert "Our Story" in data["aboutUsContent"]
        
        assert "aboutUsImage" in data
        assert data["aboutUsImage"] is not None
        
        assert "openingHours" in data
        assert data["openingHours"] is not None
        
        assert "navMenuOrder" in data
        assert len(data["navMenuOrder"]) >= 5
        
        assert "feedbackEnabled" in data
        print(f"✓ 689 (Kunafa Mahal) has seeded defaults")
        
    def test_config_new_restaurant_returns_defaults(self):
        """Verify a non-existent restaurant returns default config"""
        response = requests.get(f"{BASE_URL}/api/config/nonexistent999")
        assert response.status_code == 200
        data = response.json()
        
        # Should have default navMenuOrder
        assert "navMenuOrder" in data
        nav_items = data["navMenuOrder"]
        nav_ids = [item["id"] for item in nav_items]
        assert "home" in nav_ids
        assert "feedback" in nav_ids
        
        # feedbackEnabled should default to True
        assert data["feedbackEnabled"] == True
        print(f"✓ Non-existent restaurant returns defaults with feedbackEnabled=True")


class TestFeedbackAPI:
    """Tests for POST /api/config/feedback (public endpoint)"""
    
    def test_submit_feedback_success(self):
        """Submit feedback with valid data"""
        feedback_data = {
            "restaurant_id": "478",
            "name": "TEST_Feedback User",
            "email": "test_feedback@example.com",
            "rating": 5,
            "message": "TEST_Great experience!"
        }
        response = requests.post(f"{BASE_URL}/api/config/feedback", json=feedback_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "Thank you" in data["message"]
        print(f"✓ Feedback submitted successfully")
        
    def test_submit_feedback_without_email(self):
        """Submit feedback without email (optional field)"""
        feedback_data = {
            "restaurant_id": "478",
            "name": "TEST_Anonymous User",
            "rating": 4,
            "message": "TEST_Good food!"
        }
        response = requests.post(f"{BASE_URL}/api/config/feedback", json=feedback_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        print(f"✓ Feedback without email submitted successfully")
        
    def test_submit_feedback_missing_required_fields(self):
        """Submit feedback missing required fields should fail"""
        # Missing name
        feedback_data = {
            "restaurant_id": "478",
            "rating": 5,
            "message": "TEST_Missing name"
        }
        response = requests.post(f"{BASE_URL}/api/config/feedback", json=feedback_data)
        assert response.status_code == 422  # Validation error
        print(f"✓ Feedback without name rejected (422)")
        
    def test_submit_feedback_invalid_rating(self):
        """Submit feedback with invalid rating should fail"""
        # Rating out of range (must be 1-5)
        feedback_data = {
            "restaurant_id": "478",
            "name": "TEST_User",
            "rating": 10,  # Invalid
            "message": "TEST_Bad rating"
        }
        response = requests.post(f"{BASE_URL}/api/config/feedback", json=feedback_data)
        assert response.status_code == 422  # Validation error
        print(f"✓ Feedback with invalid rating rejected (422)")
        
    def test_submit_feedback_for_different_restaurant(self):
        """Submit feedback for restaurant 689"""
        feedback_data = {
            "restaurant_id": "689",
            "name": "TEST_Kunafa Lover",
            "email": "kunafa@test.com",
            "rating": 5,
            "message": "TEST_Best kunafa ever!"
        }
        response = requests.post(f"{BASE_URL}/api/config/feedback", json=feedback_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        print(f"✓ Feedback for restaurant 689 submitted successfully")


class TestAdminContactAndFeedbackSettings:
    """Tests for admin config update - Contact and Feedback sub-tab fields"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        login_data = {
            "phone_or_email": "owner@18march.com",
            "password": "admin123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
        
    def test_update_contact_fields(self, auth_token):
        """Update Contact sub-tab fields: address, contactEmail, mapEmbedUrl"""
        update_data = {
            "address": "TEST_123 Food Street, Gourmet City",
            "contactEmail": "test_contact@18march.com",
            "mapEmbedUrl": "https://www.google.com/maps/embed?pb=test123"
        }
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.put(f"{BASE_URL}/api/config/", json=update_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        config = data["config"]
        assert config["address"] == update_data["address"]
        assert config["contactEmail"] == update_data["contactEmail"]
        assert config["mapEmbedUrl"] == update_data["mapEmbedUrl"]
        print(f"✓ Contact fields (address, contactEmail, mapEmbedUrl) updated")
        
    def test_update_feedback_settings(self, auth_token):
        """Update Feedback sub-tab fields: feedbackEnabled, feedbackIntroText"""
        update_data = {
            "feedbackEnabled": True,
            "feedbackIntroText": "TEST_We love hearing from you!"
        }
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.put(f"{BASE_URL}/api/config/", json=update_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        config = data["config"]
        assert config["feedbackEnabled"] == True
        assert config["feedbackIntroText"] == update_data["feedbackIntroText"]
        print(f"✓ Feedback settings (feedbackEnabled, feedbackIntroText) updated")
        
    def test_verify_updated_config_persists(self, auth_token):
        """Verify updated config fields persist in GET - using admin's restaurant_id"""
        # Admin's restaurant_id is pos_0001_restaurant_478
        response = requests.get(f"{BASE_URL}/api/config/pos_0001_restaurant_478")
        assert response.status_code == 200
        data = response.json()
        
        # Verify Contact fields from previous test
        assert "address" in data
        assert data["address"] == "TEST_123 Food Street, Gourmet City"
        assert "contactEmail" in data
        assert data["contactEmail"] == "test_contact@18march.com"
        assert "mapEmbedUrl" in data
        
        # Verify Feedback fields
        assert "feedbackEnabled" in data
        assert data["feedbackEnabled"] == True
        assert "feedbackIntroText" in data
        print(f"✓ Updated config fields persisted for admin's restaurant")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
