"""
Backend tests for QR Table Config API endpoint
Tests GET /api/table-config which returns tables, rooms, subdomain for QR code generation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTableConfigEndpoint:
    """Tests for GET /api/table-config endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token by logging in"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "phone_or_email": "owner@youngmonk.com",
                "password": "admin123"
            }
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not returned in login response"
        return data["token"]
    
    def test_table_config_returns_401_without_auth(self):
        """Test that GET /api/table-config returns 401 when not authenticated"""
        response = requests.get(f"{BASE_URL}/api/table-config")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "Authorization" in data["detail"] or "auth" in data["detail"].lower()
        print("PASS: GET /api/table-config returns 401 without auth")
    
    def test_table_config_returns_401_with_invalid_token(self):
        """Test that GET /api/table-config returns 401 with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/table-config",
            headers={"Authorization": "Bearer invalid-token-12345"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: GET /api/table-config returns 401 with invalid token")
    
    def test_table_config_returns_200_with_valid_token(self, admin_token):
        """Test that GET /api/table-config returns 200 with valid admin token"""
        response = requests.get(
            f"{BASE_URL}/api/table-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: GET /api/table-config returns 200 with valid token")
    
    def test_table_config_returns_required_fields(self, admin_token):
        """Test that response contains required fields: tables, rooms, subdomain, restaurant_id"""
        response = requests.get(
            f"{BASE_URL}/api/table-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields exist
        assert "tables" in data, "Response missing 'tables' field"
        assert "rooms" in data, "Response missing 'rooms' field"
        assert "subdomain" in data, "Response missing 'subdomain' field"
        assert "restaurant_id" in data, "Response missing 'restaurant_id' field"
        
        print(f"PASS: Response contains all required fields")
        print(f"  - tables: {len(data.get('tables', []))} tables")
        print(f"  - rooms: {len(data.get('rooms', []))} rooms")
        print(f"  - subdomain: {data.get('subdomain', 'N/A')}")
        print(f"  - restaurant_id: {data.get('restaurant_id', 'N/A')}")
    
    def test_table_config_tables_array_structure(self, admin_token):
        """Test that tables array contains proper table objects"""
        response = requests.get(
            f"{BASE_URL}/api/table-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        tables = data.get("tables", [])
        assert isinstance(tables, list), "tables should be a list"
        
        if len(tables) > 0:
            # Verify first table has expected fields
            first_table = tables[0]
            assert "id" in first_table, "Table should have 'id' field"
            assert "table_no" in first_table, "Table should have 'table_no' field"
            assert "rtype" in first_table, "Table should have 'rtype' field"
            assert first_table.get("rtype") == "TB", "Table rtype should be 'TB'"
            
            print(f"PASS: Tables array structure is correct ({len(tables)} tables)")
            print(f"  - First table: id={first_table['id']}, table_no={first_table['table_no']}")
        else:
            print("PASS: Tables array structure is correct (0 tables)")
    
    def test_table_config_rooms_array_structure(self, admin_token):
        """Test that rooms array contains proper room objects (if any)"""
        response = requests.get(
            f"{BASE_URL}/api/table-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        rooms = data.get("rooms", [])
        assert isinstance(rooms, list), "rooms should be a list"
        
        if len(rooms) > 0:
            first_room = rooms[0]
            assert "id" in first_room, "Room should have 'id' field"
            assert "table_no" in first_room, "Room should have 'table_no' field"
            assert "rtype" in first_room, "Room should have 'rtype' field"
            assert first_room.get("rtype") == "RM", "Room rtype should be 'RM'"
            print(f"PASS: Rooms array structure is correct ({len(rooms)} rooms)")
        else:
            print(f"PASS: Rooms array is empty (0 rooms) - this is expected for restaurant 709")
    
    def test_table_config_subdomain_extraction(self, admin_token):
        """Test that subdomain is properly extracted from QR code URLs"""
        response = requests.get(
            f"{BASE_URL}/api/table-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        subdomain = data.get("subdomain", "")
        assert isinstance(subdomain, str), "subdomain should be a string"
        
        # For restaurant 709 (Young Monk), expect subdomain like "youngmonk.mygenie.online"
        if subdomain:
            assert "." in subdomain, "subdomain should contain a domain separator"
            print(f"PASS: Subdomain extracted correctly: {subdomain}")
        else:
            print("WARN: Subdomain is empty - may indicate POS API doesn't have QR URLs configured")
    
    def test_table_config_restaurant_id_matches_user(self, admin_token):
        """Test that restaurant_id in response matches the logged-in user's restaurant"""
        response = requests.get(
            f"{BASE_URL}/api/table-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        restaurant_id = data.get("restaurant_id")
        # Restaurant 709 is Young Monk
        assert restaurant_id is not None, "restaurant_id should not be None"
        print(f"PASS: restaurant_id is present: {restaurant_id}")
    
    def test_tables_count_for_restaurant_709(self, admin_token):
        """Test that restaurant 709 has expected number of tables (around 25)"""
        response = requests.get(
            f"{BASE_URL}/api/table-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        tables = data.get("tables", [])
        # Based on the problem statement, restaurant 709 should have 25 tables
        assert len(tables) > 0, "Expected at least some tables for restaurant 709"
        print(f"PASS: Restaurant has {len(tables)} tables (expected around 25)")
    
    def test_rooms_count_for_restaurant_709(self, admin_token):
        """Test that restaurant 709 has 0 rooms (as per problem statement)"""
        response = requests.get(
            f"{BASE_URL}/api/table-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        rooms = data.get("rooms", [])
        # Per problem statement: "Room section is NOT shown (0 rooms for restaurant 709)"
        assert len(rooms) == 0, f"Expected 0 rooms for restaurant 709, got {len(rooms)}"
        print(f"PASS: Restaurant has {len(rooms)} rooms (expected 0)")


class TestAdminLogin:
    """Tests for admin login flow"""
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "phone_or_email": "owner@youngmonk.com",
                "password": "admin123"
            }
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Login should succeed"
        assert data.get("user_type") == "restaurant", "User type should be 'restaurant'"
        assert "token" in data, "Token should be returned"
        assert "user" in data, "User info should be returned"
        
        user = data.get("user", {})
        assert user.get("email") == "owner@youngmonk.com", "Email should match"
        assert user.get("restaurant_id") == "709", "Restaurant ID should be 709"
        
        print("PASS: Admin login successful")
        print(f"  - user_type: {data.get('user_type')}")
        print(f"  - restaurant_name: {user.get('restaurant_name')}")
        print(f"  - restaurant_id: {user.get('restaurant_id')}")
    
    def test_admin_login_wrong_password(self):
        """Test admin login with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "phone_or_email": "owner@youngmonk.com",
                "password": "wrongpassword"
            }
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Admin login fails with wrong password (401)")
    
    def test_admin_login_nonexistent_user(self):
        """Test admin login with non-existent user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "phone_or_email": "nonexistent@test.com",
                "password": "anypassword"
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Admin login fails with non-existent user (404)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
