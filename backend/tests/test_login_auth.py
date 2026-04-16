"""
Test Login Authentication API endpoints
Covers:
- Admin login (email + password)
- Customer login (phone + password)
- Customer login (phone + OTP)
- Send OTP endpoint
- Reset password endpoint
- Set password endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

# Test credentials
ADMIN_EMAIL = "owner@youngmonk.com"
ADMIN_PASSWORD = "admin123"
RESTAURANT_ID = "709"
POS_ID = "0001"

class TestAdminLogin:
    """Admin/Restaurant user login tests"""
    
    def test_admin_login_with_correct_credentials(self):
        """Admin login with email + password returns success=true and user_type=restaurant"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone_or_email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "restaurant_id": RESTAURANT_ID,
            "pos_id": POS_ID
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("user_type") == "restaurant"
        assert "token" in data
        assert "user" in data
        assert data["user"].get("email") == ADMIN_EMAIL
    
    def test_admin_login_with_wrong_password(self):
        """Admin login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone_or_email": ADMIN_EMAIL,
            "password": "wrongpassword123",
            "restaurant_id": RESTAURANT_ID,
            "pos_id": POS_ID
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
    
    def test_admin_login_without_password(self):
        """Admin login without password returns 400 (password required for restaurant)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone_or_email": ADMIN_EMAIL,
            "restaurant_id": RESTAURANT_ID,
            "pos_id": POS_ID
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"


class TestSendOtp:
    """OTP sending endpoint tests"""
    
    def test_send_otp_to_registered_phone(self):
        """Send OTP to a registered phone should succeed"""
        # First, check if a customer exists using check-customer endpoint
        check_res = requests.post(f"{BASE_URL}/api/auth/check-customer", json={
            "phone": "7505242126",
            "restaurant_id": RESTAURANT_ID,
            "pos_id": POS_ID
        })
        
        # Now send OTP
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": "7505242126",
            "restaurant_id": RESTAURANT_ID,
            "pos_id": POS_ID
        })
        # Should succeed if customer exists, or fail with 404 if not
        if check_res.json().get("exists"):
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            data = response.json()
            assert data.get("success") == True
            assert "message" in data
        else:
            assert response.status_code == 404, f"Expected 404 for non-existent phone, got {response.status_code}"
    
    def test_send_otp_to_unregistered_phone(self):
        """Send OTP to unregistered phone returns 404"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": "9999999999",  # Unlikely to be registered
            "restaurant_id": RESTAURANT_ID,
            "pos_id": POS_ID
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"


class TestCustomerLogin:
    """Customer login tests (phone + password or phone + OTP)"""
    
    def test_customer_login_without_password_or_otp(self):
        """Customer login without password or OTP returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone_or_email": "7505242126",
            "restaurant_id": RESTAURANT_ID,
            "pos_id": POS_ID
        })
        # Should return 400 or 404 depending on if customer exists
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}: {response.text}"
    
    def test_customer_login_with_wrong_password(self):
        """Customer login with wrong password returns 401"""
        # First check if customer exists
        check_res = requests.post(f"{BASE_URL}/api/auth/check-customer", json={
            "phone": "7505242126",
            "restaurant_id": RESTAURANT_ID,
            "pos_id": POS_ID
        })
        
        if check_res.json().get("exists"):
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "phone_or_email": "7505242126",
                "password": "wrongpassword",
                "restaurant_id": RESTAURANT_ID,
                "pos_id": POS_ID
            })
            # Either 401 (wrong password) or 401 (no password set - "use OTP to login")
            assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        else:
            pytest.skip("Customer not found - skipping wrong password test")
    
    def test_customer_login_with_invalid_otp(self):
        """Customer login with invalid OTP returns 401"""
        check_res = requests.post(f"{BASE_URL}/api/auth/check-customer", json={
            "phone": "7505242126",
            "restaurant_id": RESTAURANT_ID,
            "pos_id": POS_ID
        })
        
        if check_res.json().get("exists"):
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "phone_or_email": "7505242126",
                "otp": "000000",  # Invalid OTP
                "restaurant_id": RESTAURANT_ID,
                "pos_id": POS_ID
            })
            assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        else:
            pytest.skip("Customer not found - skipping invalid OTP test")


class TestOtpLoginFlow:
    """Full OTP login flow test"""
    
    def test_full_otp_login_flow(self):
        """Test: send OTP -> login with OTP"""
        # First check if customer exists
        check_res = requests.post(f"{BASE_URL}/api/auth/check-customer", json={
            "phone": "7505242126",
            "restaurant_id": RESTAURANT_ID,
            "pos_id": POS_ID
        })
        
        if not check_res.json().get("exists"):
            pytest.skip("Customer 7505242126 not found - skipping OTP flow test")
        
        # Step 1: Send OTP
        send_res = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": "7505242126",
            "restaurant_id": RESTAURANT_ID,
            "pos_id": POS_ID
        })
        assert send_res.status_code == 200, f"Failed to send OTP: {send_res.text}"
        
        # The OTP is returned for testing purposes
        otp_data = send_res.json()
        otp = otp_data.get("otp_for_testing")
        assert otp is not None, "OTP not returned in test mode"
        
        # Step 2: Login with OTP
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone_or_email": "7505242126",
            "otp": otp,
            "restaurant_id": RESTAURANT_ID,
            "pos_id": POS_ID
        })
        assert login_res.status_code == 200, f"OTP login failed: {login_res.text}"
        
        data = login_res.json()
        assert data.get("success") == True
        assert data.get("user_type") == "customer"
        assert "token" in data
        assert "user" in data
        assert "has_password" in data["user"]


class TestCheckCustomer:
    """Check customer endpoint tests"""
    
    def test_check_customer_endpoint(self):
        """Check customer endpoint returns exists status and has_password"""
        response = requests.post(f"{BASE_URL}/api/auth/check-customer", json={
            "phone": "7505242126",
            "restaurant_id": RESTAURANT_ID,
            "pos_id": POS_ID
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "exists" in data
        if data["exists"]:
            assert "customer" in data
            assert "has_password" in data["customer"]


class TestSetPassword:
    """Set password endpoint tests"""
    
    def test_set_password_mismatched(self):
        """Set password with mismatched passwords returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/set-password", json={
            "phone": "9999999999",
            "password": "password123",
            "confirm_password": "differentpassword",
            "restaurant_id": RESTAURANT_ID,
            "pos_id": POS_ID
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
    
    def test_set_password_too_short(self):
        """Set password with short password returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/set-password", json={
            "phone": "9999999999",
            "password": "123",
            "confirm_password": "123",
            "restaurant_id": RESTAURANT_ID,
            "pos_id": POS_ID
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"


class TestResetPassword:
    """Reset password endpoint tests"""
    
    def test_reset_password_mismatched(self):
        """Reset password with mismatched passwords returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "phone": "7505242126",
            "otp": "123456",
            "new_password": "newpassword123",
            "confirm_password": "differentpassword",
            "restaurant_id": RESTAURANT_ID,
            "pos_id": POS_ID
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
    
    def test_reset_password_invalid_otp(self):
        """Reset password with invalid OTP returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "phone": "7505242126",
            "otp": "000000",
            "new_password": "newpassword123",
            "confirm_password": "newpassword123",
            "restaurant_id": RESTAURANT_ID,
            "pos_id": POS_ID
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"


class TestNonExistentUser:
    """Tests for non-existent users"""
    
    def test_login_nonexistent_user(self):
        """Login with non-existent user returns 404"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone_or_email": "nonexistent@test.com",
            "password": "somepassword",
            "restaurant_id": RESTAURANT_ID,
            "pos_id": POS_ID
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
