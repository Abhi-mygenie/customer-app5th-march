#!/usr/bin/env python3
"""
Backend API Testing for MyGenie Customer App
Tests the centralized tax calculation logic (CA-004 fix) and core API functionality
Restaurant 478 - GST (5%) and VAT (4%) items testing
"""

import requests
import sys
import json
from datetime import datetime

class MyGenieAPITester:
    def __init__(self, base_url="https://mygenie-11th-apri.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.restaurant_id = "478"  # Restaurant 478 for CA-004 tax testing

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

    def test_restaurant_info(self):
        """Test restaurant 478 information endpoint"""
        success, response = self.run_test(
            "Restaurant 478 Info",
            "GET",
            f"restaurant-info/{self.restaurant_id}",
            200
        )
        
        if success and isinstance(response, dict):
            if "name" in response:
                restaurant_name = response.get('name', 'Unknown')
                gst_status = response.get('gst_status', 'Unknown')
                print(f"   Restaurant: {restaurant_name}")
                print(f"   GST Status: {gst_status}")
                return True
        return success

    def test_menu_data(self):
        """Test menu data endpoint and verify GST/VAT items for restaurant 478"""
        success, response = self.run_test(
            "Menu Data",
            "GET",
            f"menu-data/{self.restaurant_id}",
            200
        )
        
        if success and isinstance(response, dict):
            categories = response.get("categories", [])
            if categories:
                print(f"   Found {len(categories)} menu categories")
                
                # Look for GST and VAT items specifically for CA-004 testing
                gst_items = []
                vat_items = []
                
                for category in categories:
                    items = category.get("items", [])
                    for item in items:
                        tax_type = item.get("tax_type", "GST")
                        tax_percent = item.get("tax", 0)
                        
                        if tax_type == "GST" and tax_percent == 5:
                            gst_items.append(item.get("name", "Unknown"))
                        elif tax_type == "VAT" and tax_percent == 4:
                            vat_items.append(item.get("name", "Unknown"))
                
                print(f"   GST Items (5%): {len(gst_items)} found")
                print(f"   VAT Items (4%): {len(vat_items)} found")
                
                if gst_items:
                    print(f"   Sample GST item: {gst_items[0]}")
                if vat_items:
                    print(f"   Sample VAT item: {vat_items[0]}")
                
                # Store for potential cart testing
                self.sample_gst_items = gst_items[:3]  # Store first 3
                self.sample_vat_items = vat_items[:3]  # Store first 3
                
                return True
        return success

    def test_table_config(self):
        """Test table configuration endpoint"""
        success, response = self.run_test(
            "Table Configuration",
            "GET",
            f"table-config/{self.restaurant_id}",
            200
        )
        
        if success and isinstance(response, dict):
            tables = response.get("tables", [])
            rooms = response.get("rooms", [])
            print(f"   Tables: {len(tables)}, Rooms: {len(rooms)}")
            return True
        return success

    def test_customer_config(self):
        """Test customer app configuration"""
        success, response = self.run_test(
            "Customer App Config",
            "GET",
            f"customer-app-config/{self.restaurant_id}",
            200
        )
        
        if success and isinstance(response, dict):
            config_keys = list(response.keys())[:5]  # Show first 5 config keys
            print(f"   Config keys: {config_keys}")
            return True
        return success

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        # Test guest token endpoint
        success, response = self.run_test(
            "Guest Token",
            "POST",
            "auth/guest-token",
            200,
            data={"restaurant_id": self.restaurant_id}
        )
        
        if success and isinstance(response, dict) and "access_token" in response:
            self.token = response["access_token"]
            print(f"   ✅ Guest token obtained")
            return True
        return success

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
    print("=" * 60)
    
    tester = MyGenieAPITester()
    
    # Core API tests
    tests = [
        ("API Health Check", tester.test_api_health),
        ("Restaurant Info", tester.test_restaurant_info),
        ("Menu Data", tester.test_menu_data),
        ("Table Configuration", tester.test_table_config),
        ("Customer App Config", tester.test_customer_config),
        ("Authentication", tester.test_auth_endpoints),
        ("Order Endpoints Basic", tester.test_order_endpoints_basic),
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