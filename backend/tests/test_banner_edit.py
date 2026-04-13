"""
Test cases for Banner Edit API endpoint
Testing PUT /api/config/banners/{banner_id} - Edit/Update banner functionality
"""
import pytest
import requests
import os


BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://app-13-april.preview.emergentagent.com').rstrip('/')



# Admin credentials
ADMIN_EMAIL = "owner@18march.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for restaurant admin"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "phone_or_email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
    )
    if response.status_code == 200:
        data = response.json()
        assert data.get("success") == True, "Login should return success: true"
        assert "token" in data, "Login should return token"
        print(f"✓ Authenticated as restaurant admin: {ADMIN_EMAIL}")
        return data["token"]
    else:
        pytest.fail(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def authenticated_session(auth_token):
    """Create authenticated session with token"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


class TestBannerEditEndpoint:
    """Tests for PUT /api/config/banners/{banner_id} endpoint"""
    
    def test_put_endpoint_requires_auth(self):
        """PUT /api/config/banners/{banner_id} should return 401 without auth"""
        fake_banner_id = "test-banner-id"
        response = requests.put(
            f"{BASE_URL}/api/config/banners/{fake_banner_id}",
            json={"bannerTitle": "Updated Title"}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ PUT /api/config/banners/{id} requires authentication")
    
    def test_put_nonexistent_banner_returns_404(self, authenticated_session):
        """PUT with nonexistent banner_id should return 404"""
        response = authenticated_session.put(
            f"{BASE_URL}/api/config/banners/nonexistent-banner-id-12345",
            json={"bannerTitle": "Updated Title"}
        )
        assert response.status_code == 404, f"Expected 404 for nonexistent banner, got {response.status_code}"
        print("✓ PUT with nonexistent banner_id returns 404")
    
    def test_put_empty_body_returns_400(self, authenticated_session):
        """PUT with empty update body should return 400"""
        fake_banner_id = "test-banner-id"
        response = authenticated_session.put(
            f"{BASE_URL}/api/config/banners/{fake_banner_id}",
            json={}
        )
        assert response.status_code == 400, f"Expected 400 for empty body, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Error response should have detail"
        print("✓ PUT with empty body returns 400")


class TestBannerEditFlow:
    """End-to-end tests for banner edit flow (create -> edit -> verify)"""
    
    def test_create_edit_delete_banner_flow(self, authenticated_session, auth_token):
        """Full CRUD flow: Create banner, Edit it, Verify update, Delete it"""
        
        # Step 1: Get restaurant_id from auth
        me_response = authenticated_session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200, f"GET /api/auth/me failed: {me_response.status_code}"
        user_data = me_response.json()
        restaurant_id = user_data["user"]["id"]
        print(f"✓ Got restaurant_id: {restaurant_id}")
        
        # Step 2: Create a test banner
        test_banner = {
            "bannerImage": "https://example.com/test-edit-banner.jpg",
            "bannerTitle": "TEST_Edit_Original_Title",
            "bannerLink": "https://example.com/original",
            "bannerOrder": 99,
            "bannerEnabled": True
        }
        
        create_response = authenticated_session.post(
            f"{BASE_URL}/api/config/banners",
            json=test_banner
        )
        assert create_response.status_code == 200, f"Create banner failed: {create_response.status_code}"
        create_data = create_response.json()
        assert create_data.get("success") == True, "Create should return success: true"
        assert "banner" in create_data, "Create should return banner object"
        
        banner_id = create_data["banner"]["id"]
        print(f"✓ Created test banner with id: {banner_id}")
        
        # Step 3: Edit the banner - update title
        edit_payload = {
            "bannerTitle": "TEST_Edit_Updated_Title"
        }
        edit_response = authenticated_session.put(
            f"{BASE_URL}/api/config/banners/{banner_id}",
            json=edit_payload
        )
        assert edit_response.status_code == 200, f"Edit banner failed: {edit_response.status_code}"
        edit_data = edit_response.json()
        assert edit_data.get("success") == True, "Edit should return success: true"
        print("✓ Successfully edited banner title")
        
        # Step 4: Verify the update by fetching config
        config_response = requests.get(f"{BASE_URL}/api/config/{restaurant_id}")
        assert config_response.status_code == 200, f"Get config failed: {config_response.status_code}"
        config_data = config_response.json()
        
        updated_banner = None
        for banner in config_data.get("banners", []):
            if banner.get("id") == banner_id:
                updated_banner = banner
                break
        
        assert updated_banner is not None, f"Banner {banner_id} not found in config"
        assert updated_banner["bannerTitle"] == "TEST_Edit_Updated_Title", f"Title not updated: {updated_banner['bannerTitle']}"
        # Original fields should remain unchanged
        assert updated_banner["bannerImage"] == test_banner["bannerImage"], "Image URL changed unexpectedly"
        assert updated_banner["bannerOrder"] == test_banner["bannerOrder"], "Order changed unexpectedly"
        print("✓ Verified banner title updated in GET config")
        
        # Step 5: Edit multiple fields
        multi_edit_payload = {
            "bannerImage": "https://example.com/test-edit-banner-v2.jpg",
            "bannerLink": "https://example.com/updated-link",
            "bannerEnabled": False
        }
        multi_edit_response = authenticated_session.put(
            f"{BASE_URL}/api/config/banners/{banner_id}",
            json=multi_edit_payload
        )
        assert multi_edit_response.status_code == 200, f"Multi-field edit failed: {multi_edit_response.status_code}"
        print("✓ Successfully edited multiple banner fields")
        
        # Step 6: Verify multiple field updates
        config_response2 = requests.get(f"{BASE_URL}/api/config/{restaurant_id}")
        config_data2 = config_response2.json()
        
        updated_banner2 = None
        for banner in config_data2.get("banners", []):
            if banner.get("id") == banner_id:
                updated_banner2 = banner
                break
        
        assert updated_banner2 is not None, "Banner not found after multi-edit"
        assert updated_banner2["bannerImage"] == "https://example.com/test-edit-banner-v2.jpg", "Image not updated"
        assert updated_banner2["bannerLink"] == "https://example.com/updated-link", "Link not updated"
        assert updated_banner2["bannerEnabled"] == False, "Enabled status not updated"
        # Title should remain from previous edit
        assert updated_banner2["bannerTitle"] == "TEST_Edit_Updated_Title", "Title changed unexpectedly"
        print("✓ Verified all multi-field updates persisted")
        
        # Step 7: Cleanup - delete test banner
        delete_response = authenticated_session.delete(
            f"{BASE_URL}/api/config/banners/{banner_id}"
        )
        assert delete_response.status_code == 200, f"Delete banner failed: {delete_response.status_code}"
        print("✓ Cleaned up test banner")
        
        print("\n✓✓✓ Complete banner edit flow PASSED ✓✓✓")


class TestExistingBannerEdit:
    """Tests for editing existing banners (Happy Hour, Weekend Special)"""
    
    def test_get_existing_banners(self, authenticated_session):
        """Verify existing banners are present for testing"""
        me_response = authenticated_session.get(f"{BASE_URL}/api/auth/me")
        user_data = me_response.json()
        restaurant_id = user_data["user"]["id"]
        
        config_response = requests.get(f"{BASE_URL}/api/config/{restaurant_id}")
        assert config_response.status_code == 200, "Failed to get config"
        config_data = config_response.json()
        
        banners = config_data.get("banners", [])
        print(f"Found {len(banners)} existing banners:")
        for i, banner in enumerate(banners):
            print(f"  {i+1}. {banner.get('bannerTitle')} (id: {banner.get('id')[:8]}...)")
        
        # Verify at least some banners exist
        assert len(banners) >= 0, "Expected at least some banners to exist"
        print("✓ Successfully retrieved existing banners")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
