#!/usr/bin/env python3
"""
Test script to verify token refresh functionality
"""
import requests
import time
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/v1/auth/token"
REFRESH_URL = f"{BASE_URL}/api/v1/auth/refresh-token"
ME_URL = f"{BASE_URL}/api/v1/auth/me"

def test_token_refresh():
    """Test the token refresh functionality"""
    print("Testing token refresh functionality...")
    
    # Step 1: Login to get initial token
    print("\n1. Logging in...")
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    try:
        response = requests.post(LOGIN_URL, data=login_data)
        response.raise_for_status()
        token_data = response.json()
        access_token = token_data["access_token"]
        print(f"✅ Login successful, got token: {access_token[:20]}...")
    except requests.exceptions.RequestException as e:
        print(f"❌ Login failed: {e}")
        return False
    
    # Step 2: Test that we can access protected endpoint
    print("\n2. Testing protected endpoint...")
    headers = {"Authorization": f"Bearer {access_token}"}
    
    try:
        response = requests.get(ME_URL, headers=headers)
        response.raise_for_status()
        user_data = response.json()
        print(f"✅ Protected endpoint accessible, user: {user_data.get('username')}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Protected endpoint failed: {e}")
        return False
    
    # Step 3: Test token refresh
    print("\n3. Testing token refresh...")
    
    try:
        response = requests.post(REFRESH_URL, headers=headers)
        response.raise_for_status()
        refresh_data = response.json()
        new_token = refresh_data["access_token"]
        print(f"✅ Token refresh successful, new token: {new_token[:20]}...")
        
        # Verify tokens are different
        if access_token != new_token:
            print("✅ New token is different from original token")
        else:
            print("⚠️  New token is same as original token (this might be expected)")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Token refresh failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response status: {e.response.status_code}")
            print(f"Response body: {e.response.text}")
        return False
    
    # Step 4: Test that new token works
    print("\n4. Testing new token...")
    new_headers = {"Authorization": f"Bearer {new_token}"}
    
    try:
        response = requests.get(ME_URL, headers=new_headers)
        response.raise_for_status()
        user_data = response.json()
        print(f"✅ New token works, user: {user_data.get('username')}")
    except requests.exceptions.RequestException as e:
        print(f"❌ New token failed: {e}")
        return False
    
    print("\n🎉 All tests passed! Token refresh is working correctly.")
    return True

if __name__ == "__main__":
    success = test_token_refresh()
    if not success:
        print("\n❌ Some tests failed. Check the backend logs for more details.")
        exit(1)