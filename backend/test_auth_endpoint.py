import asyncio
import httpx
import json

async def test_auth_endpoint():
    """Test the auth/me endpoint to see what it returns"""
    
    try:
        async with httpx.AsyncClient() as client:
            print("🔍 Testing /api/v1/auth/me endpoint...")
            
            # First, let's try to login to get a token
            login_data = {
                "username": "testuser",
                "password": "testpass"
            }
            
            print("🔍 Attempting login...")
            login_response = await client.post(
                "http://localhost:8000/api/v1/users/token",
                data=login_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if login_response.status_code == 200:
                token_data = login_response.json()
                access_token = token_data.get("access_token")
                print(f"✅ Login successful, token: {access_token[:20]}...")
                
                # Now test the auth/me endpoint
                headers = {"Authorization": f"Bearer {access_token}"}
                me_response = await client.get(
                    "http://localhost:8000/api/v1/auth/me",
                    headers=headers
                )
                
                print(f"🔍 Auth/me status: {me_response.status_code}")
                if me_response.status_code == 200:
                    user_data = me_response.json()
                    print(f"✅ User data: {json.dumps(user_data, indent=2)}")
                else:
                    print(f"❌ Auth/me failed: {me_response.text}")
            else:
                print(f"❌ Login failed: {login_response.text}")
                
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_auth_endpoint()) 