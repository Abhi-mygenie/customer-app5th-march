"""
Test cases for Restaurant Config API endpoints
Testing GET /api/config/{restaurant_id} for admin UI configuration
Now includes all 27+ config fields for landing_config, menu_config, and order_config
"""
import pytest
import requests
import os


BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://order-management-app-6.preview.emergentagent.com').rstrip('/')


# All config fields that should be present in API response
ALL_CONFIG_FIELDS = [
    # Landing Page Visibility (11 fields)
    "showLogo",
    "showWelcomeText",
    "showDescription",
    "showSocialIcons",
    "showTableNumber",
    "showPromotions",
    "showPoweredBy",
    "showCallWaiter",
    "showPayBill",
    "showAboutUs",
    "showFooter",
    # Menu Page Visibility (2 fields)
    "showPromotionsOnMenu",
    "showCategories",
    # Order Page Visibility (7 fields)
    "showCustomerDetails",
    "showCustomerName",
    "showCustomerPhone",
    "showCookingInstructions",
    "showSpecialInstructions",
    "showPriceBreakdown",
    "showTableInfo",
    # Branding (5 fields)
    "logoUrl",
    "primaryColor",
    "welcomeMessage",
    "tagline",
    "instagramUrl",
    # Other
    "banners"
]


class TestConfigAPIExistingRestaurant:
    """Tests for config endpoint with existing restaurant (478) - ALL 27+ FIELDS"""
    
    def test_get_config_returns_200(self):
        """GET /api/config/478 should return 200 status"""
        response = requests.get(f"{BASE_URL}/api/config/478")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/config/478 returns 200")
    
    def test_config_has_restaurant_id(self):
        """Config should contain the correct restaurant_id"""
        response = requests.get(f"{BASE_URL}/api/config/478")
        data = response.json()
        assert "restaurant_id" in data, "Missing restaurant_id field"
        assert data["restaurant_id"] == "478", f"Expected restaurant_id '478', got '{data['restaurant_id']}'"
        print("✓ Config contains correct restaurant_id")

    def test_config_has_all_27_plus_fields(self):
        """Config should have all 27+ required fields"""
        response = requests.get(f"{BASE_URL}/api/config/478")
        data = response.json()
        
        missing_fields = []
        for field in ALL_CONFIG_FIELDS:
            if field not in data:
                missing_fields.append(field)
        
        assert len(missing_fields) == 0, f"Missing fields: {missing_fields}"
        print(f"✓ Config contains all {len(ALL_CONFIG_FIELDS)} required fields")
    
    def test_config_landing_page_visibility_fields(self):
        """Config should have all landing page visibility fields (11 fields)"""
        response = requests.get(f"{BASE_URL}/api/config/478")
        data = response.json()
        
        landing_fields = [
            "showLogo", "showWelcomeText", "showDescription", "showSocialIcons",
            "showTableNumber", "showPromotions", "showPoweredBy", "showCallWaiter",
            "showPayBill", "showAboutUs", "showFooter"
        ]
        
        for field in landing_fields:
            assert field in data, f"Missing landing page field: {field}"
            assert isinstance(data[field], bool), f"{field} should be boolean, got {type(data[field])}"
            # For restaurant 478, all should be true
            assert data[field] == True, f"{field} should be true for restaurant 478"
        
        print("✓ All 11 landing page visibility fields present and set to true")
    
    def test_config_menu_page_visibility_fields(self):
        """Config should have menu page visibility fields (2 fields)"""
        response = requests.get(f"{BASE_URL}/api/config/478")
        data = response.json()
        
        menu_fields = ["showPromotionsOnMenu", "showCategories"]
        
        for field in menu_fields:
            assert field in data, f"Missing menu page field: {field}"
            assert isinstance(data[field], bool), f"{field} should be boolean"
            assert data[field] == True, f"{field} should be true for restaurant 478"
        
        print("✓ All 2 menu page visibility fields present and set to true")
    
    def test_config_order_page_visibility_fields(self):
        """Config should have order page visibility fields (7 fields)"""
        response = requests.get(f"{BASE_URL}/api/config/478")
        data = response.json()
        
        order_fields = [
            "showCustomerDetails", "showCustomerName", "showCustomerPhone",
            "showCookingInstructions", "showSpecialInstructions",
            "showPriceBreakdown", "showTableInfo"
        ]
        
        for field in order_fields:
            assert field in data, f"Missing order page field: {field}"
            assert isinstance(data[field], bool), f"{field} should be boolean"
            assert data[field] == True, f"{field} should be true for restaurant 478"
        
        print("✓ All 7 order page visibility fields present and set to true")
    
    def test_config_branding_fields(self):
        """Config should have branding override fields including instagramUrl"""
        response = requests.get(f"{BASE_URL}/api/config/478")
        data = response.json()
        
        branding_fields = ["logoUrl", "primaryColor", "welcomeMessage", "tagline", "instagramUrl"]
        for field in branding_fields:
            assert field in data, f"Missing branding field: {field}"
        
        # Verify expected values for restaurant 478
        assert data["primaryColor"] == "#F26B33", f"Expected primaryColor '#F26B33', got '{data['primaryColor']}'"
        assert data["welcomeMessage"] == "Welcome to 18March!", f"Expected welcomeMessage 'Welcome to 18March!', got '{data['welcomeMessage']}'"
        assert data["tagline"] == "Crafted with passion, served with love", f"Expected tagline 'Crafted with passion, served with love', got '{data['tagline']}'"
        print("✓ All 5 branding fields present with correct values")
    
    def test_config_has_banners(self):
        """Config should have banners array"""
        response = requests.get(f"{BASE_URL}/api/config/478")
        data = response.json()
        
        assert "banners" in data, "Missing banners field"
        assert isinstance(data["banners"], list), "banners should be a list"
        assert len(data["banners"]) == 3, f"Expected 3 banners, got {len(data['banners'])}"
        print("✓ Config contains 3 banners")
    
    def test_banner_structure(self):
        """Each banner should have required fields"""
        response = requests.get(f"{BASE_URL}/api/config/478")
        data = response.json()
        
        banner_fields = ["id", "bannerImage", "bannerTitle", "bannerOrder", "bannerEnabled"]
        for i, banner in enumerate(data["banners"]):
            for field in banner_fields:
                assert field in banner, f"Banner {i} missing field: {field}"
            assert banner["bannerEnabled"] == True, f"Banner {i} should be enabled"
        print("✓ All banners have correct structure")


class TestConfigAPIDefaultsRestaurant:
    """Tests for config endpoint with non-existing restaurant (999) - returns defaults"""
    
    def test_get_config_defaults_returns_200(self):
        """GET /api/config/999 should return 200 status with defaults"""
        response = requests.get(f"{BASE_URL}/api/config/999")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/config/999 returns 200")
    
    def test_defaults_has_correct_restaurant_id(self):
        """Defaults should have requested restaurant_id"""
        response = requests.get(f"{BASE_URL}/api/config/999")
        data = response.json()
        assert data["restaurant_id"] == "999", f"Expected restaurant_id '999', got '{data['restaurant_id']}'"
        print("✓ Default config has correct restaurant_id")

    def test_defaults_has_all_27_plus_fields(self):
        """Default config should also have all 27+ fields"""
        response = requests.get(f"{BASE_URL}/api/config/999")
        data = response.json()
        
        missing_fields = []
        for field in ALL_CONFIG_FIELDS:
            if field not in data:
                missing_fields.append(field)
        
        assert len(missing_fields) == 0, f"Missing default fields: {missing_fields}"
        print(f"✓ Default config contains all {len(ALL_CONFIG_FIELDS)} required fields")
    
    def test_defaults_all_visibility_toggles_true(self):
        """Defaults should have ALL visibility toggles set to true"""
        response = requests.get(f"{BASE_URL}/api/config/999")
        data = response.json()
        
        visibility_fields = [
            # Landing page (11)
            "showLogo", "showWelcomeText", "showDescription", "showSocialIcons",
            "showTableNumber", "showPromotions", "showPoweredBy", "showCallWaiter",
            "showPayBill", "showAboutUs", "showFooter",
            # Menu page (2)
            "showPromotionsOnMenu", "showCategories",
            # Order page (7)
            "showCustomerDetails", "showCustomerName", "showCustomerPhone",
            "showCookingInstructions", "showSpecialInstructions",
            "showPriceBreakdown", "showTableInfo"
        ]
        
        for field in visibility_fields:
            assert data[field] == True, f"Default {field} should be true, got {data[field]}"
        
        print(f"✓ All {len(visibility_fields)} visibility toggles default to true")
    
    def test_defaults_has_default_primary_color(self):
        """Defaults should use default primaryColor #61B4E5"""
        response = requests.get(f"{BASE_URL}/api/config/999")
        data = response.json()
        assert data["primaryColor"] == "#61B4E5", f"Expected default primaryColor '#61B4E5', got '{data['primaryColor']}'"
        print("✓ Default config has correct default primaryColor")
    
    def test_defaults_has_default_welcome_message(self):
        """Defaults should use default welcomeMessage"""
        response = requests.get(f"{BASE_URL}/api/config/999")
        data = response.json()
        assert data["welcomeMessage"] == "Welcome!", f"Expected default welcomeMessage 'Welcome!', got '{data['welcomeMessage']}'"
        print("✓ Default config has correct default welcomeMessage")
    
    def test_defaults_has_empty_banners(self):
        """Defaults should have empty banners array"""
        response = requests.get(f"{BASE_URL}/api/config/999")
        data = response.json()
        assert data["banners"] == [], f"Expected empty banners array, got {data['banners']}"
        print("✓ Default config has empty banners array")
    
    def test_defaults_branding_nullable_fields(self):
        """Defaults should have null for optional branding fields"""
        response = requests.get(f"{BASE_URL}/api/config/999")
        data = response.json()
        
        assert data["logoUrl"] is None, f"Expected logoUrl to be null, got '{data['logoUrl']}'"
        assert data["tagline"] is None, f"Expected tagline to be null, got '{data['tagline']}'"
        assert data["instagramUrl"] is None, f"Expected instagramUrl to be null, got '{data['instagramUrl']}'"
        print("✓ Default nullable branding fields are null")


class TestConfigAPIPutUpdate:
    """Test PUT /api/config/ endpoint accepts new fields in update payload"""
    
    @pytest.fixture
    def authenticated_session(self):
        """Create an authenticated session with restaurant admin credentials"""
        # Note: This test requires admin auth which is not available in current setup
        # Skipping actual PUT tests as they require authentication
        pytest.skip("PUT tests require restaurant admin authentication")
        return None
    
    def test_put_endpoint_exists(self):
        """PUT /api/config/ endpoint should exist (returns 401 without auth)"""
        response = requests.put(f"{BASE_URL}/api/config/", json={"showLogo": True})
        # 401 means endpoint exists but requires auth
        # 422 would mean validation error (also OK - endpoint exists)
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422, got {response.status_code}"
        print("✓ PUT /api/config/ endpoint exists (requires auth)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
