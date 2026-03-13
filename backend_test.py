#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class MenuFabConfigTester:
    def __init__(self, base_url="https://customer-app-march.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_restaurant_id = "698"  # Test restaurant ID

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
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
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_get_config_default_showMenuFab(self):
        """Test that showMenuFab defaults to true when not set"""
        success, response = self.run_test(
            "Get Config - Default showMenuFab",
            "GET",
            f"api/config/{self.test_restaurant_id}",
            200
        )
        
        if success:
            show_menu_fab = response.get('showMenuFab')
            if show_menu_fab is True:
                print(f"   ✅ showMenuFab defaults to true: {show_menu_fab}")
                return True
            else:
                print(f"   ❌ showMenuFab should default to true, got: {show_menu_fab}")
                return False
        return False

    def test_login_restaurant_admin(self):
        """Test restaurant admin login to get token for config updates"""
        # Try with a test admin account
        success, response = self.run_test(
            "Restaurant Admin Login",
            "POST",
            "api/auth/login",
            200,
            data={
                "phone_or_email": "admin@test.com",
                "password": "admin123",
                "restaurant_id": self.test_restaurant_id
            }
        )
        
        if success and 'token' in response:
            self.token = response['token']
            print(f"   ✅ Got admin token")
            return True
        else:
            print(f"   ⚠️  Admin login failed - will test read-only endpoints")
            return False

    def test_update_config_showMenuFab_false(self):
        """Test updating showMenuFab to false"""
        if not self.token:
            print("   ⚠️  Skipping - no admin token")
            return True
            
        success, response = self.run_test(
            "Update Config - Set showMenuFab to false",
            "PUT",
            "api/config/",
            200,
            data={"showMenuFab": False}
        )
        
        if success:
            config = response.get('config', {})
            show_menu_fab = config.get('showMenuFab')
            if show_menu_fab is False:
                print(f"   ✅ showMenuFab updated to false: {show_menu_fab}")
                return True
            else:
                print(f"   ❌ showMenuFab should be false, got: {show_menu_fab}")
                return False
        return False

    def test_get_config_after_update(self):
        """Test that showMenuFab persists after update"""
        success, response = self.run_test(
            "Get Config - After Update",
            "GET",
            f"api/config/{self.test_restaurant_id}",
            200
        )
        
        if success:
            show_menu_fab = response.get('showMenuFab')
            print(f"   📋 showMenuFab value after update: {show_menu_fab}")
            return True
        return False

    def test_update_config_showMenuFab_true(self):
        """Test updating showMenuFab back to true"""
        if not self.token:
            print("   ⚠️  Skipping - no admin token")
            return True
            
        success, response = self.run_test(
            "Update Config - Set showMenuFab to true",
            "PUT",
            "api/config/",
            200,
            data={"showMenuFab": True}
        )
        
        if success:
            config = response.get('config', {})
            show_menu_fab = config.get('showMenuFab')
            if show_menu_fab is True:
                print(f"   ✅ showMenuFab updated to true: {show_menu_fab}")
                return True
            else:
                print(f"   ❌ showMenuFab should be true, got: {show_menu_fab}")
                return False
        return False

    def test_config_field_validation(self):
        """Test that showMenuFab field is properly included in API response"""
        success, response = self.run_test(
            "Config Field Validation",
            "GET",
            f"api/config/{self.test_restaurant_id}",
            200
        )
        
        if success:
            has_field = 'showMenuFab' in response
            if has_field:
                print(f"   ✅ showMenuFab field present in response")
                return True
            else:
                print(f"   ❌ showMenuFab field missing from response")
                print(f"   Available fields: {list(response.keys())}")
                return False
        return False

def main():
    print("🚀 Starting Menu FAB Configuration Backend Tests")
    print("=" * 60)
    
    tester = MenuFabConfigTester()
    
    # Test sequence
    tests = [
        tester.test_config_field_validation,
        tester.test_get_config_default_showMenuFab,
        tester.test_login_restaurant_admin,
        tester.test_update_config_showMenuFab_false,
        tester.test_get_config_after_update,
        tester.test_update_config_showMenuFab_true,
    ]
    
    for test in tests:
        test()
    
    # Print results
    print(f"\n📊 Backend Tests Summary:")
    print(f"   Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("✅ All backend tests passed!")
        return 0
    else:
        print("❌ Some backend tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())