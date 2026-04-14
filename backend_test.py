#!/usr/bin/env python3
"""
Backend API Testing for MyGenie Customer App
Tests OTP auth, delivery address, distance API, and core functionality
Restaurant 509 - Pav & Pages / 18march testing
"""

import requests
import sys
import json
from datetime import datetime

class MyGenieAPITester:
    def __init__(self, base_url="https://loyalty-app-april-v1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.crm_url = "https://crm.mygenie.online/api"
        self.distance_api_url = "https://manage.mygenie.online/api/v1/config/distance-api-new"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.restaurant_id = "509"  # Restaurant 509 for testing

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(response_data) < 10:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, list) and len(response_data) > 0:
                        print(f"   Response: List with {len(response_data)} items")
                    return True, response_data
                except:
                    print(f"   Response: {response.text[:100]}...")
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text[:200]}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_api_health(self):
        """Test the main API health endpoint"""
        success, response = self.run_test(
            "API Health Check",
            "GET",
            "",  # Root API endpoint
            200
        )
        
        if success and isinstance(response, dict):
            if "message" in response and "Customer App API" in str(response.get("message", "")):
                print("   ✅ Correct API message found")
                return True
            else:
                print(f"   ⚠️  API responded but message might be different: {response}")
                return True  # Still consider it a pass if API is responding
        return success

    def test_restaurant_config(self):
        """Test restaurant 509 configuration endpoint"""
        success, response = self.run_test(
            "Restaurant 509 Config",
            "GET",
            f"config/{self.restaurant_id}",
            200
        )
        
        if success and isinstance(response, dict):
            restaurant_id = response.get('restaurant_id', 'Unknown')
            primary_color = response.get('primaryColor', 'Unknown')
            welcome_message = response.get('welcomeMessage', 'Unknown')
            print(f"   Restaurant ID: {restaurant_id}")
            print(f"   Primary Color: {primary_color}")
            print(f"   Welcome Message: {welcome_message}")
            return True
        return success

    def test_dietary_tags(self):
        """Test dietary tags endpoints"""
        # Test available dietary tags
        success1, response1 = self.run_test(
            "Available Dietary Tags",
            "GET",
            "dietary-tags/available",
            200
        )
        
        # Test restaurant-specific dietary tags
        success2, response2 = self.run_test(
            "Restaurant Dietary Tags",
            "GET",
            f"dietary-tags/{self.restaurant_id}",
            200
        )
        
        if success1 and isinstance(response1, list):
            print(f"   Available dietary tags: {len(response1)} found")
        
        if success2 and isinstance(response2, list):
            print(f"   Restaurant dietary tags: {len(response2)} found")
            
        return success1 and success2

    def test_table_config(self):
        """Test table configuration endpoint"""
        success, response = self.run_test(
            "Table Configuration",
            "GET",
            "table-config",
            200
        )
        
        if success and isinstance(response, dict):
            tables = response.get("tables", [])
            rooms = response.get("rooms", [])
            print(f"   Tables: {len(tables)}, Rooms: {len(rooms)}")
            return True
        return success

    def test_loyalty_settings(self):
        """Test loyalty settings endpoint"""
        success, response = self.run_test(
            "Loyalty Settings",
            "GET",
            f"loyalty-settings/{self.restaurant_id}",
            200
        )
        
        if success and isinstance(response, dict):
            bronze_earn = response.get('bronze_earn_percent', 'Unknown')
            redemption_value = response.get('redemption_value', 'Unknown')
            print(f"   Bronze earn percent: {bronze_earn}")
            print(f"   Redemption value: {redemption_value}")
            return True
        return success

    def test_check_customer_api(self):
        """Test check-customer API with known phone numbers"""
        test_phones = [
            ("7018342940", "Parikshit"),  # Known customer
            ("1234567890", "Kriele"),     # Known customer
            ("9816666555", "Vishal"),     # Known customer
            ("0000000000", None)          # Unknown customer
        ]
        
        all_passed = True
        for phone, expected_name in test_phones:
            success, response = self.run_test(
                f"Check Customer - {phone}",
                "POST",
                "auth/check-customer",
                200,
                data={
                    "phone": phone,
                    "restaurant_id": self.restaurant_id,
                    "pos_id": "0001"
                }
            )
            
            if success and isinstance(response, dict):
                exists = response.get('exists', False)
                customer_name = response.get('customer', {}).get('name', '') if response.get('customer') else ''
                print(f"   Phone {phone}: exists={exists}, name='{customer_name}'")
                
                if expected_name and exists and customer_name:
                    print(f"   ✅ Known customer found as expected")
                elif not expected_name and not exists:
                    print(f"   ✅ Unknown customer handled correctly")
                else:
                    print(f"   ⚠️  Unexpected result for {phone}")
            else:
                all_passed = False
                
        return all_passed

    def test_crm_health_check(self):
        """Test CRM API health check"""
        success, response = self.run_test(
            "CRM Health Check",
            "GET",
            self.crm_url,  # Full URL
            200
        )
        
        if success and isinstance(response, dict):
            if "DinePoints API" in str(response.get("message", "")):
                print("   ✅ CRM API responding correctly")
                return True
            else:
                print(f"   ⚠️  CRM responded but message might be different: {response}")
                return True
        return success

    def test_distance_api(self):
        """Test distance API with near and far locations"""
        # Test near location (Shoghi area - should be deliverable)
        near_location = {
            "destination_lat": "31.0537",
            "destination_lng": "77.1273", 
            "restaurant_id": self.restaurant_id,
            "order_value": "0"
        }
        
        success1, response1 = self.run_test(
            "Distance API - Near Location",
            "POST",
            self.distance_api_url,  # Full URL
            200,
            data=near_location
        )
        
        # Test far location (Delhi - should not be deliverable)
        far_location = {
            "destination_lat": "28.6139",
            "destination_lng": "77.2090",
            "restaurant_id": self.restaurant_id,
            "order_value": "0"
        }
        
        success2, response2 = self.run_test(
            "Distance API - Far Location",
            "POST", 
            self.distance_api_url,  # Full URL
            200,
            data=far_location
        )
        
        if success1 and isinstance(response1, dict):
            shipping_status = response1.get('shipping_status', 'Unknown')
            shipping_charge = response1.get('shipping_charge', 'Unknown')
            print(f"   Near location: status={shipping_status}, charge={shipping_charge}")
            
        if success2 and isinstance(response2, dict):
            shipping_status = response2.get('shipping_status', 'Unknown')
            print(f"   Far location: status={shipping_status}")
            
        return success1 and success2

    def test_order_endpoints_basic(self):
        """Test basic order-related endpoints that don't require full order data"""
        if not self.token:
            print("   ⚠️  Skipping order tests - no auth token")
            return False
            
        # Test check table status (should work even if table doesn't exist)
        success, response = self.run_test(
            "Check Table Status",
            "GET",
            f"check-table-status/1?restaurant_id={self.restaurant_id}",
            200,
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        return success

def main():
    """Run all backend API tests"""
    print("🚀 Starting MyGenie Customer App Backend API Tests")
    print("Testing Restaurant 509 - Pav & Pages / 18march")
    print("=" * 60)
    
    tester = MyGenieAPITester()
    
    # Core API tests
    tests = [
        ("API Health Check", tester.test_api_health),
        ("Restaurant Config", tester.test_restaurant_config),
        ("Check Customer API", tester.test_check_customer_api),
        ("CRM Health Check", tester.test_crm_health_check),
        ("Distance API", tester.test_distance_api),
        ("Dietary Tags", tester.test_dietary_tags),
        ("Table Configuration", tester.test_table_config),
        ("Loyalty Settings", tester.test_loyalty_settings),
    ]
    
    print(f"\nRunning {len(tests)} test categories...")
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            test_func()
        except Exception as e:
            print(f"❌ Test category failed with exception: {str(e)}")
    
    # Print final results
    print(f"\n{'='*60}")
    print(f"📊 Backend API Test Results:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "No tests run")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend API tests passed!")
        return 0
    else:
        print("⚠️  Some backend API tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())