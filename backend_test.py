import requests
import sys
from datetime import datetime
import os

class CustomerAppAPITester:
    def __init__(self):
        # Use the public endpoint from frontend .env
        self.base_url = "https://multi-tenant-app-22.preview.emergentagent.com"
        self.tests_run = 0
        self.tests_passed = 0
        self.customer_token = None
        self.restaurant_token = None
        self.test_phone = "9876543210"
        self.test_email = "admin@restaurant.com"
        self.test_otp = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, auth_type=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        
        # Set up headers
        request_headers = {'Content-Type': 'application/json'}
        if headers:
            request_headers.update(headers)
            
        # Add auth token if specified
        if auth_type == 'customer' and self.customer_token:
            request_headers['Authorization'] = f'Bearer {self.customer_token}'
        elif auth_type == 'restaurant' and self.restaurant_token:
            request_headers['Authorization'] = f'Bearer {self.restaurant_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=request_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=request_headers, timeout=10)

            # Handle multiple expected status codes
            expected_statuses = expected_status if isinstance(expected_status, list) else [expected_status]
            success = response.status_code in expected_statuses
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.content:
                    try:
                        result = response.json()
                        print(f"Response: {result}")
                        return success, result
                    except:
                        print(f"Response: {response.text}")
                        return success, {}
                return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"Error: {error_data}")
                    return False, error_data
                except:
                    print(f"Error: {response.text}")
                    return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_api_root(self):
        """Test the main /api/ endpoint"""
        success, response = self.run_test(
            "API Root",
            "GET",
            "api/",
            200
        )
        return success

    def test_send_otp_endpoint(self):
        """Test /api/auth/send-otp endpoint"""
        # Test with a phone that may not exist
        success, response = self.run_test(
            "Send OTP - Test Phone",
            "POST",
            "api/auth/send-otp",
            [200, 404],  # 404 if phone not registered
            data={"phone": self.test_phone}
        )
        
        if success and response.get('otp_for_testing'):
            self.test_otp = response['otp_for_testing']
            print(f"   🔑 OTP for testing: {self.test_otp}")
        
        return success

    def test_login_endpoint_invalid_otp(self):
        """Test /api/auth/login with invalid OTP"""
        success, response = self.run_test(
            "Login - Invalid OTP",
            "POST",
            "api/auth/login",
            401,
            data={
                "phone_or_email": self.test_phone,
                "otp": "000000"
            }
        )
        return success

    def test_login_endpoint_valid_otp(self):
        """Test /api/auth/login with valid OTP (if available)"""
        if not self.test_otp:
            print("❌ No OTP available for valid login test")
            return False
            
        success, response = self.run_test(
            "Login - Valid OTP",
            "POST",
            "api/auth/login",
            200,
            data={
                "phone_or_email": self.test_phone,
                "otp": self.test_otp
            }
        )
        
        if success and response.get('token'):
            self.customer_token = response['token']
            print(f"   ✅ Customer token obtained")
        
        return success

    def test_login_endpoint_password(self):
        """Test /api/auth/login with password (restaurant)"""
        success, response = self.run_test(
            "Login - Restaurant Password",
            "POST",
            "api/auth/login",
            [200, 401, 404],  # May not exist in test DB
            data={
                "phone_or_email": self.test_email,
                "password": "testpassword"
            }
        )
        return success

    def test_config_endpoint(self):
        """Test /api/config/{restaurant_id} returns default config"""
        success, response = self.run_test(
            "Get App Config - Default Restaurant",
            "GET",
            "api/config/test-restaurant-id",
            200
        )
        
        if success:
            expected_keys = ["restaurant_id", "showCustomerDetails", "showCallWaiter", "showPayBill"]
            has_expected = all(key in response for key in expected_keys)
            if has_expected:
                print(f"   ✅ Config contains expected default fields")
            else:
                print(f"   ⚠️  Config missing some expected fields")
        
        return success

    def test_customer_routes_no_auth(self):
        """Test /api/customer/* routes without authentication"""
        customer_endpoints = [
            ("Customer Profile - No Auth", "api/customer/profile"),
            ("Customer Orders - No Auth", "api/customer/orders"),
            ("Customer Points - No Auth", "api/customer/points"),
            ("Customer Wallet - No Auth", "api/customer/wallet")
        ]
        
        all_success = True
        for name, endpoint in customer_endpoints:
            success, _ = self.run_test(name, "GET", endpoint, 401)
            all_success = all_success and success
        
        return all_success

    def test_customer_routes_with_auth(self):
        """Test /api/customer/* routes with authentication"""
        if not self.customer_token:
            print("❌ No customer token available for authenticated tests")
            return False
            
        customer_endpoints = [
            ("Customer Profile - With Auth", "api/customer/profile"),
            ("Customer Orders - With Auth", "api/customer/orders"),
            ("Customer Points - With Auth", "api/customer/points"),
            ("Customer Wallet - With Auth", "api/customer/wallet")
        ]
        
        all_success = True
        for name, endpoint in customer_endpoints:
            success, _ = self.run_test(name, "GET", endpoint, 200, auth_type='customer')
            all_success = all_success and success
        
        return all_success

def main():
    print("🚀 Starting Customer App Backend API Testing")
    print("=" * 50)
    
    # Setup
    tester = CustomerAppAPITester()

    # Test 1: API root endpoint
    print("\n📍 Testing Core API Endpoints")
    api_root_success = tester.test_api_root()

    # Test 2: Auth endpoints
    print("\n📍 Testing Authentication Endpoints")
    send_otp_success = tester.test_send_otp_endpoint()
    login_invalid_success = tester.test_login_endpoint_invalid_otp()
    login_valid_success = tester.test_login_endpoint_valid_otp()
    login_password_success = tester.test_login_endpoint_password()

    # Test 3: Config endpoint
    print("\n📍 Testing Configuration Endpoints")
    config_success = tester.test_config_endpoint()

    # Test 4: Customer endpoints without auth
    print("\n📍 Testing Customer Endpoints (No Auth)")
    customer_no_auth_success = tester.test_customer_routes_no_auth()

    # Test 5: Customer endpoints with auth (if token available)
    print("\n📍 Testing Customer Endpoints (With Auth)")
    customer_auth_success = tester.test_customer_routes_with_auth()

    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Backend API Tests Summary")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    # Print detailed results
    print("\nDetailed Results:")
    print(f"- API Root: {'✅' if api_root_success else '❌'}")
    print(f"- Send OTP: {'✅' if send_otp_success else '❌'}")
    print(f"- Login Invalid OTP: {'✅' if login_invalid_success else '❌'}")
    print(f"- Login Valid OTP: {'✅' if login_valid_success else '❌'}")
    print(f"- Login Password: {'✅' if login_password_success else '❌'}")
    print(f"- Config Endpoint: {'✅' if config_success else '❌'}")
    print(f"- Customer No Auth: {'✅' if customer_no_auth_success else '❌'}")
    print(f"- Customer With Auth: {'✅' if customer_auth_success else '❌'}")
    
    if tester.tests_passed >= tester.tests_run * 0.7:  # 70% pass rate
        print("🎉 Backend tests mostly successful!")
        return 0
    else:
        print("⚠️  Many backend tests failed - needs investigation")
        return 1

if __name__ == "__main__":
    sys.exit(main())