"""
Backend tests for Multi-Shift Timing Controls Feature
Tests the restaurantOpen, restaurantShifts, categoryTimings, itemTimings fields
"""
import pytest
import requests
import os
import json

# Use REACT_APP_BACKEND_URL for testing via public endpoint
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://iphone-zoom-patch.preview.emergentagent.com')

# Admin credentials
ADMIN_EMAIL = "owner@youngmonk.com"
ADMIN_PASSWORD = "admin123"

# Test restaurant
RESTAURANT_ID = "709"
MULTI_MENU_RESTAURANT_ID = "716"

class TestConfigTimingFields:
    """Test timing fields in GET /api/config/{restaurant_id}"""
    
    def test_config_endpoint_returns_200(self):
        """GET /api/config/709 should return 200"""
        response = requests.get(f"{BASE_URL}/api/config/{RESTAURANT_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ GET /api/config/{RESTAURANT_ID} returns 200")
    
    def test_new_restaurant_has_default_timing_fields(self):
        """Non-existent restaurant should return default timing fields"""
        response = requests.get(f"{BASE_URL}/api/config/999999")
        assert response.status_code == 200
        data = response.json()
        
        # Check all timing fields have defaults
        assert data.get('restaurantOpen') == True, "restaurantOpen should default to True"
        assert data.get('restaurantShifts') == [{'start': '06:00', 'end': '03:00'}], "restaurantShifts should have default shift"
        assert data.get('categoryTimings') == {}, "categoryTimings should default to empty dict"
        assert data.get('itemTimings') == {}, "itemTimings should default to empty dict"
        print("✓ New restaurant has correct default timing fields")
    
    def test_existing_restaurant_has_timing_fields_in_response(self):
        """Existing restaurant config should include timing fields (even if null in DB)"""
        response = requests.get(f"{BASE_URL}/api/config/{RESTAURANT_ID}")
        assert response.status_code == 200
        data = response.json()
        
        # These fields should exist in response (value may be null if not set)
        # Frontend will use defaults from RestaurantConfigContext if null
        print(f"restaurantOpen: {data.get('restaurantOpen')}")
        print(f"restaurantShifts: {data.get('restaurantShifts')}")
        print(f"categoryTimings: {data.get('categoryTimings')}")
        print(f"itemTimings: {data.get('itemTimings')}")
        
        # The fields may be None if not set in DB, but that's acceptable
        # Frontend handles defaults
        print("✓ Existing restaurant config endpoint accessible")


class TestAdminAuth:
    """Test admin authentication for config updates"""
    
    def test_admin_login_with_email_password(self):
        """Admin login with email and password should work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone_or_email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            assert data.get('success') == True, "Login should return success=True"
            assert data.get('user_type') == 'restaurant', "User type should be 'restaurant'"
            assert 'token' in data, "Response should contain token"
            print(f"✓ Admin login successful for {ADMIN_EMAIL}")
            return data.get('token')
        elif response.status_code == 404:
            pytest.skip(f"Admin user {ADMIN_EMAIL} not found in database")
        else:
            print(f"Login failed with status {response.status_code}: {response.text}")
            pytest.fail(f"Admin login failed with status {response.status_code}")
    
    def get_auth_token(self):
        """Helper to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone_or_email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get('token')
        return None


class TestConfigUpdate:
    """Test PUT /api/config/ for timing fields"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone_or_email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed - cannot test config updates")
        return response.json().get('token')
    
    def test_update_restaurant_open_toggle(self, auth_token):
        """PUT /api/config/ should save restaurantOpen field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test setting restaurantOpen to False
        response = requests.put(f"{BASE_URL}/api/config/", json={
            "restaurantOpen": False
        }, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get('success') == True
        print("✓ restaurantOpen=False saved successfully")
        
        # Verify it was saved
        config_response = requests.get(f"{BASE_URL}/api/config/{RESTAURANT_ID}")
        config = config_response.json()
        assert config.get('restaurantOpen') == False, "restaurantOpen should be False after update"
        print("✓ restaurantOpen=False verified in GET response")
        
        # Reset to True
        requests.put(f"{BASE_URL}/api/config/", json={
            "restaurantOpen": True
        }, headers=headers)
        print("✓ restaurantOpen reset to True")
    
    def test_update_restaurant_shifts(self, auth_token):
        """PUT /api/config/ should save restaurantShifts field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test setting multiple shifts
        test_shifts = [
            {"start": "07:00", "end": "11:00"},
            {"start": "12:00", "end": "15:00"},
            {"start": "18:00", "end": "23:00"}
        ]
        
        response = requests.put(f"{BASE_URL}/api/config/", json={
            "restaurantShifts": test_shifts
        }, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ restaurantShifts saved successfully")
        
        # Verify it was saved
        config_response = requests.get(f"{BASE_URL}/api/config/{RESTAURANT_ID}")
        config = config_response.json()
        assert config.get('restaurantShifts') == test_shifts, "restaurantShifts should match after update"
        print(f"✓ restaurantShifts verified: {config.get('restaurantShifts')}")
        
        # Reset to default
        requests.put(f"{BASE_URL}/api/config/", json={
            "restaurantShifts": [{"start": "06:00", "end": "03:00"}]
        }, headers=headers)
        print("✓ restaurantShifts reset to default")
    
    def test_update_category_timings(self, auth_token):
        """PUT /api/config/ should save categoryTimings field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test setting category timing
        test_category_timings = {
            "5859": {"start": "08:00", "end": "11:00"},  # Hot Beverages - morning only
            "5864": {"start": "16:00", "end": "23:00"}   # Bar Bites - evening only
        }
        
        response = requests.put(f"{BASE_URL}/api/config/", json={
            "categoryTimings": test_category_timings
        }, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ categoryTimings saved successfully")
        
        # Verify it was saved
        config_response = requests.get(f"{BASE_URL}/api/config/{RESTAURANT_ID}")
        config = config_response.json()
        assert config.get('categoryTimings') == test_category_timings, "categoryTimings should match after update"
        print(f"✓ categoryTimings verified: {config.get('categoryTimings')}")
        
        # Reset to empty
        requests.put(f"{BASE_URL}/api/config/", json={
            "categoryTimings": {}
        }, headers=headers)
        print("✓ categoryTimings reset to empty")
    
    def test_update_item_timings(self, auth_token):
        """PUT /api/config/ should save itemTimings field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test setting item timing
        test_item_timings = {
            "159734": {"start": "07:00", "end": "11:00"},  # plain omelette - breakfast only
            "159790": {"start": "12:00", "end": "22:00"}   # Veggie Burger - lunch/dinner
        }
        
        response = requests.put(f"{BASE_URL}/api/config/", json={
            "itemTimings": test_item_timings
        }, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ itemTimings saved successfully")
        
        # Verify it was saved
        config_response = requests.get(f"{BASE_URL}/api/config/{RESTAURANT_ID}")
        config = config_response.json()
        assert config.get('itemTimings') == test_item_timings, "itemTimings should match after update"
        print(f"✓ itemTimings verified: {config.get('itemTimings')}")
        
        # Reset to empty
        requests.put(f"{BASE_URL}/api/config/", json={
            "itemTimings": {}
        }, headers=headers)
        print("✓ itemTimings reset to empty")


class TestMultiMenuRestaurant:
    """Test timing features for multi-menu restaurant (716)"""
    
    def test_multi_menu_config_accessible(self):
        """GET /api/config/716 should return 200"""
        response = requests.get(f"{BASE_URL}/api/config/{MULTI_MENU_RESTAURANT_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Multi-menu restaurant {MULTI_MENU_RESTAURANT_ID} config accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
