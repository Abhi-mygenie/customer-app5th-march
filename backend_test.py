import requests
import sys
from datetime import datetime
import json

class CustomerCaptureAPITester:
    def __init__(self, base_url="https://order-time-estimate.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        
        # Test credentials from agent context
        self.admin_email = "owner@18march.com"
        self.admin_password = "admin123"
        self.restaurant_id = "478"
        self.test_otp = "1111"
        self.test_existing_phone = "123456789000"  # Should exist in DB
        self.test_new_phone = "987654321000"  # Should not exist

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
            if details:
                print(f"   📝 {details}")
        else:
            print(f"❌ {test_name} - FAILED")
            if details:
                print(f"   📝 {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
                print(f"   Response: {json.dumps(response_data, indent=2)}")
            except:
                response_data = response.text
                print(f"   Response: {response_data}")

            return success, response_data

        except Exception as e:
            print(f"   Error: {str(e)}")
            return False, {"error": str(e)}

    def test_admin_login(self):
        """Test admin login to get token"""
        print("\n" + "="*50)
        print("TESTING ADMIN LOGIN")
        print("="*50)
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "/api/auth/login",
            200,
            data={
                "phone_or_email": self.admin_email,
                "password": self.admin_password
            }
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            self.log_result("Admin Login", True, f"Token obtained for user: {response.get('user', {}).get('email')}")
            return True
        else:
            self.log_result("Admin Login", False, "Failed to obtain admin token")
            return False

    def test_check_customer_api(self):
        """Test check-customer endpoint"""
        print("\n" + "="*50)
        print("TESTING CHECK-CUSTOMER API")
        print("="*50)
        
        # Test 1: Check existing customer
        success, response = self.run_test(
            "Check Existing Customer",
            "POST",
            "/api/auth/check-customer",
            200,
            data={
                "phone": self.test_existing_phone,
                "restaurant_id": self.restaurant_id,
                "pos_id": "0001"
            }
        )
        
        if success:
            expected_exists = response.get('exists') == True
            has_customer_data = 'customer' in response and response['customer'] is not None
            self.log_result(
                "Check Existing Customer", 
                expected_exists and has_customer_data,
                f"exists={response.get('exists')}, customer_name={response.get('customer', {}).get('name', 'N/A')}"
            )
        else:
            self.log_result("Check Existing Customer", False, "API call failed")
        
        # Test 2: Check non-existing customer
        success, response = self.run_test(
            "Check Non-Existing Customer",
            "POST",
            "/api/auth/check-customer",
            200,
            data={
                "phone": self.test_new_phone,
                "restaurant_id": self.restaurant_id,
                "pos_id": "0001"
            }
        )
        
        if success:
            expected_not_exists = response.get('exists') == False
            no_customer_data = response.get('customer') is None
            self.log_result(
                "Check Non-Existing Customer", 
                expected_not_exists and no_customer_data,
                f"exists={response.get('exists')}, customer={response.get('customer')}"
            )
        else:
            self.log_result("Check Non-Existing Customer", False, "API call failed")

        # Test 3: Invalid phone format
        success, response = self.run_test(
            "Check Customer Invalid Phone",
            "POST",
            "/api/auth/check-customer",
            200,  # API should handle gracefully
            data={
                "phone": "invalid-phone",
                "restaurant_id": self.restaurant_id,
                "pos_id": "0001"
            }
        )
        
        if success:
            # Should return exists: false for invalid phone
            self.log_result(
                "Check Customer Invalid Phone", 
                response.get('exists') == False,
                f"Handled invalid phone gracefully: exists={response.get('exists')}"
            )
        else:
            self.log_result("Check Customer Invalid Phone", False, "API call failed")

    def test_config_api(self):
        """Test config API for showLandingCustomerCapture"""
        print("\n" + "="*50)
        print("TESTING CONFIG API")
        print("="*50)
        
        # Test 1: Get current config
        success, response = self.run_test(
            "Get Restaurant Config",
            "GET",
            f"/api/config/{self.restaurant_id}",
            200
        )
        
        if success:
            has_landing_capture_config = 'showLandingCustomerCapture' in response
            self.log_result(
                "Get Restaurant Config", 
                has_landing_capture_config,
                f"showLandingCustomerCapture={response.get('showLandingCustomerCapture')}"
            )
            
            current_config = response
        else:
            self.log_result("Get Restaurant Config", False, "Failed to fetch config")
            current_config = {}

        if not self.admin_token:
            print("❌ Skipping config update tests - no admin token")
            return

        # Test 2: Update config to enable customer capture
        success, response = self.run_test(
            "Enable Landing Customer Capture",
            "PUT",
            "/api/config/",
            200,
            data={"showLandingCustomerCapture": True},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if success:
            self.log_result(
                "Enable Landing Customer Capture", 
                True,
                "Config update successful"
            )
        else:
            self.log_result("Enable Landing Customer Capture", False, "Config update failed")

        # Test 3: Verify config was updated
        success, response = self.run_test(
            "Verify Config Update",
            "GET",
            f"/api/config/{self.restaurant_id}",
            200
        )
        
        if success:
            is_enabled = response.get('showLandingCustomerCapture') == True
            self.log_result(
                "Verify Config Update", 
                is_enabled,
                f"showLandingCustomerCapture={response.get('showLandingCustomerCapture')}"
            )
        else:
            self.log_result("Verify Config Update", False, "Failed to verify config")

    def test_otp_flow(self):
        """Test OTP flow for existing customer"""
        print("\n" + "="*50)
        print("TESTING OTP FLOW")
        print("="*50)
        
        # Test 1: Send OTP for existing customer
        success, response = self.run_test(
            "Send OTP to Existing Customer",
            "POST",
            "/api/auth/send-otp",
            200,
            data={
                "phone": self.test_existing_phone,
                "restaurant_id": self.restaurant_id,
                "pos_id": "0001"
            }
        )
        
        if success:
            otp_sent = response.get('success') == True
            self.log_result(
                "Send OTP to Existing Customer", 
                otp_sent,
                f"OTP sent successfully: {response.get('message', 'No message')}"
            )
        else:
            self.log_result("Send OTP to Existing Customer", False, "Failed to send OTP")

        # Test 2: Login with OTP
        success, response = self.run_test(
            "Login with OTP",
            "POST",
            "/api/auth/login",
            200,
            data={
                "phone_or_email": self.test_existing_phone,
                "otp": self.test_otp,
                "restaurant_id": self.restaurant_id,
                "pos_id": "0001"
            }
        )
        
        if success:
            login_success = response.get('success') == True and response.get('user_type') == 'customer'
            self.log_result(
                "Login with OTP", 
                login_success,
                f"Customer logged in: {response.get('user', {}).get('name', 'N/A')}"
            )
        else:
            self.log_result("Login with OTP", False, "OTP login failed")

def main():
    print("🚀 Starting Customer Capture Feature API Tests")
    print(f"⏰ Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tester = CustomerCaptureAPITester()
    
    # Run all tests
    admin_login_success = tester.test_admin_login()
    tester.test_check_customer_api()
    tester.test_config_api()
    tester.test_otp_flow()
    
    # Print summary
    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests PASSED!")
        return 0
    else:
        print("⚠️  Some tests FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(main())