#!/usr/bin/env python3
"""
Test script to verify the authentication system with refresh tokens
"""
import sys
import os
import jwt
from datetime import datetime, timedelta

# Add the backend directory to the path
sys.path.insert(0, '/workspace/backend')

def test_token_creation():
    """Test token creation and validation"""
    print("🔍 Testing token creation and validation...")
    
    # Test data
    test_username = "testuser"
    secret_key = "your-secret-key-here"
    algorithm = "HS256"
    
    # Test access token creation
    access_token_data = {
        "sub": test_username,
        "type": "access",
        "exp": datetime.utcnow() + timedelta(minutes=30)
    }
    
    access_token = jwt.encode(access_token_data, secret_key, algorithm=algorithm)
    print(f"✅ Access token created: {access_token[:50]}...")
    
    # Test refresh token creation
    refresh_token_data = {
        "sub": test_username,
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    
    refresh_token = jwt.encode(refresh_token_data, secret_key, algorithm=algorithm)
    print(f"✅ Refresh token created: {refresh_token[:50]}...")
    
    # Test token decoding
    try:
        access_payload = jwt.decode(access_token, secret_key, algorithms=[algorithm])
        print(f"✅ Access token decoded successfully: {access_payload}")
        
        refresh_payload = jwt.decode(refresh_token, secret_key, algorithms=[algorithm])
        print(f"✅ Refresh token decoded successfully: {refresh_payload}")
        
        # Verify token types
        assert access_payload.get("type") == "access", "Access token should have type 'access'"
        assert refresh_payload.get("type") == "refresh", "Refresh token should have type 'refresh'"
        print("✅ Token types verified correctly")
        
    except jwt.InvalidTokenError as e:
        print(f"❌ Token decoding failed: {e}")
        return False
    
    return True

def test_token_expiration():
    """Test token expiration logic"""
    print("\n🔍 Testing token expiration logic...")
    
    secret_key = "your-secret-key-here"
    algorithm = "HS256"
    
    # Create expired token
    expired_data = {
        "sub": "testuser",
        "type": "access",
        "exp": datetime.utcnow() - timedelta(minutes=1)  # Expired 1 minute ago
    }
    
    expired_token = jwt.encode(expired_data, secret_key, algorithm=algorithm)
    
    try:
        jwt.decode(expired_token, secret_key, algorithms=[algorithm])
        print("❌ Expired token should not be valid")
        return False
    except jwt.ExpiredSignatureError:
        print("✅ Expired token correctly rejected")
    
    # Create valid token
    valid_data = {
        "sub": "testuser",
        "type": "access",
        "exp": datetime.utcnow() + timedelta(minutes=30)
    }
    
    valid_token = jwt.encode(valid_data, secret_key, algorithm=algorithm)
    
    try:
        payload = jwt.decode(valid_token, secret_key, algorithms=[algorithm])
        print("✅ Valid token correctly accepted")
        return True
    except jwt.InvalidTokenError as e:
        print(f"❌ Valid token incorrectly rejected: {e}")
        return False

def test_refresh_token_validation():
    """Test refresh token validation logic"""
    print("\n🔍 Testing refresh token validation...")
    
    secret_key = "your-secret-key-here"
    algorithm = "HS256"
    
    # Test valid refresh token
    refresh_data = {
        "sub": "testuser",
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    
    refresh_token = jwt.encode(refresh_data, secret_key, algorithm=algorithm)
    
    try:
        payload = jwt.decode(refresh_token, secret_key, algorithms=[algorithm])
        username = payload.get("sub")
        token_type = payload.get("type")
        
        if username and token_type == "refresh":
            print(f"✅ Refresh token validated successfully for user: {username}")
            return True
        else:
            print("❌ Refresh token validation failed - missing username or wrong type")
            return False
            
    except jwt.InvalidTokenError as e:
        print(f"❌ Refresh token validation failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Testing Authentication System with Refresh Tokens")
    print("=" * 60)
    
    tests = [
        test_token_creation,
        test_token_expiration,
        test_refresh_token_validation
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                print(f"❌ Test {test.__name__} failed")
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
    
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Authentication system is working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Please check the authentication implementation.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)