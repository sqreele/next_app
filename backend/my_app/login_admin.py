# ==============================================================================
# File: backend/my_app/login_admin.py
# Description: Custom admin authentication for SQLAdmin interface
# ==============================================================================

import os
from typing import Optional
from fastapi import Request, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import sessionmaker
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from starlette.responses import Response, RedirectResponse

from .database import sync_engine, SessionLocal
from .models import User, UserProfile
from .security import verify_password, create_access_token, SECRET_KEY, ALGORITHM
from .dependencies import get_db
from jose import jwt, JWTError

class AdminAuthBackend(AuthenticationBackend):
    """
    Custom authentication backend for SQLAdmin that integrates with 
    your existing user system and enforces admin role requirements.
    """
    
    async def login(self, request: Request) -> bool:
        """Handle admin login form submission"""
        form = await request.form()
        username = form.get("username")
        password = form.get("password")
        
        if not username or not password:
            return False
        
        # Use sync session for SQLAdmin compatibility
        from sqlalchemy.orm import Session
        
        with Session(sync_engine) as db:
            try:
                # Get user by username
                user = db.query(User).filter(User.username == username).first()
                
                if not user:
                    return False
                
                # Verify password
                if not verify_password(password, user.hashed_password):
                    return False
                
                # Check if user is active
                if not user.is_active:
                    return False
                
                # Load user profile to check role
                profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
                
                # Only allow Admin and Manager roles to access admin panel
                if not profile or profile.role not in ['Admin', 'Manager']:
                    return False
                
                # Create JWT token
                access_token = create_access_token(data={"sub": user.username})
                
                # Store token in session
                request.session.update({
                    "token": access_token,
                    "user_id": user.id,
                    "username": user.username,
                    "role": profile.role
                })
                
                return True
                
            except Exception as e:
                print(f"Admin login error: {e}")
                return False
    
    async def logout(self, request: Request) -> bool:
        """Handle admin logout"""
        request.session.clear()
        return True
    
    async def authenticate(self, request: Request) -> bool:
        """Check if user is authenticated for admin access"""
        token = request.session.get("token")
        
        if not token:
            return False
        
        try:
            # Verify JWT token
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            
            if username is None:
                return False
            
            # Use sync session for SQLAdmin compatibility
            from sqlalchemy.orm import Session
            
            with Session(sync_engine) as db:
                user = db.query(User).filter(User.username == username).first()
                
                if not user or not user.is_active:
                    return False
                
                # Check role again
                profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
                
                if not profile or profile.role not in ['Admin', 'Manager']:
                    return False
                
                # Update session with fresh user data
                request.session.update({
                    "user_id": user.id,
                    "username": user.username,
                    "role": profile.role
                })
                
                return True
                
        except JWTError:
            return False
        except Exception as e:
            print(f"Admin authentication error: {e}")
            return False

# Create the authentication backend instance
authentication_backend = AdminAuthBackend(secret_key=SECRET_KEY)

# Alternative: Simple admin login decorator for custom admin routes
def admin_required(func):
    """Decorator to require admin authentication for custom routes"""
    async def wrapper(request: Request, *args, **kwargs):
        # Check if user is authenticated and has admin role
        token = request.session.get("token")
        
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Admin authentication required"
            )
        
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            
            if not username:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token"
                )
            
            # Use sync session
            from sqlalchemy.orm import Session
            
            with Session(sync_engine) as db:
                user = db.query(User).filter(User.username == username).first()
                
                if not user or not user.is_active:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="User not found or inactive"
                    )
                
                profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
                
                if not profile or profile.role not in ['Admin', 'Manager']:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Admin privileges required"
                    )
            
            return await func(request, *args, **kwargs)
            
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Authentication error: {str(e)}"
            )
    
    return wrapper

# Utility functions for admin operations
class AdminUtils:
    """Utility class for admin-specific operations"""
    
    @staticmethod
    def get_current_admin_user(request: Request) -> Optional[dict]:
        """Get current admin user from session"""
        return {
            "user_id": request.session.get("user_id"),
            "username": request.session.get("username"),
            "role": request.session.get("role")
        }
    
    @staticmethod
    def is_super_admin(request: Request) -> bool:
        """Check if current user is super admin"""
        role = request.session.get("role")
        return role == "Admin"
    
    @staticmethod
    def check_permission(request: Request, required_role: str = "Admin") -> bool:
        """Check if user has required permission level"""
        current_role = request.session.get("role")
        
        role_hierarchy = {
            "Technician": 1,
            "Supervisor": 2,
            "Manager": 3,
            "Admin": 4
        }
        
        current_level = role_hierarchy.get(current_role, 0)
        required_level = role_hierarchy.get(required_role, 4)
        
        return current_level >= required_level

# Custom admin login form HTML template
ADMIN_LOGIN_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Admin Login - MaintenancePro</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
        }
        .login-container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
        }
        .login-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .login-header h1 {
            color: #333;
            margin: 0 0 0.5rem 0;
            font-size: 1.8rem;
        }
        .login-header p {
            color: #666;
            margin: 0;
        }
        .form-group {
            margin-bottom: 1rem;
        }
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: #333;
            font-weight: 500;
        }
        .form-group input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 1rem;
            box-sizing: border-box;
        }
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
        }
        .login-button {
            width: 100%;
            padding: 0.75rem;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;
        }
        .login-button:hover {
            background: #5a6fd8;
        }
        .error-message {
            background: #fee;
            color: #c33;
            padding: 0.75rem;
            border-radius: 5px;
            margin-bottom: 1rem;
            text-align: center;
        }
        .info-box {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 5px;
            padding: 1rem;
            margin-top: 1rem;
            font-size: 0.9rem;
            color: #6c757d;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <h1>🔧 Admin Panel</h1>
            <p>MaintenancePro Administration</p>
        </div>
        
        {% if error %}
        <div class="error-message">
            {{ error }}
        </div>
        {% endif %}
        
        <form method="post">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required autofocus>
            </div>
            
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
            </div>
            
            <button type="submit" class="login-button">
                Sign In to Admin Panel
            </button>
        </form>
        
        <div class="info-box">
            <strong>Access Requirements:</strong><br>
            • Only Admin and Manager roles can access<br>
            • Use your regular application credentials<br>
            • Contact system administrator for access issues
        </div>
    </div>
</body>
</html>
"""

# Function to create admin user if none exists
async def create_default_admin():
    """Create a default admin user if no admin exists in the system"""
    from sqlalchemy.orm import Session
    from .security import get_password_hash
    
    with Session(sync_engine) as db:
        try:
            # Check if any admin user exists
            admin_profile = db.query(UserProfile).filter(UserProfile.role == 'Admin').first()
            
            if not admin_profile:
                print("No admin user found. Creating default admin...")
                
                # Create default admin user
                admin_user = User(
                    username="admin",
                    email="admin@maintenancepro.com",
                    hashed_password=get_password_hash("admin123"),
                    is_active=True
                )
                db.add(admin_user)
                db.flush()
                
                # Create admin profile
                admin_profile = UserProfile(
                    user_id=admin_user.id,
                    role="Admin",
                    position="System Administrator"
                )
                db.add(admin_profile)
                
                db.commit()
                print("✅ Default admin created - Username: admin, Password: admin123")
                print("⚠️  Please change the default password immediately!")
                
        except Exception as e:
            print(f"Error creating default admin: {e}")
            db.rollback()

# Initialize admin authentication on import
def init_admin_auth():
    """Initialize admin authentication system"""
    import asyncio
    
    # Create default admin if needed
    try:
        asyncio.create_task(create_default_admin())
    except RuntimeError:
        # If no event loop is running, create one
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(create_default_admin())
        loop.close()

# Export the authentication backend
__all__ = ['authentication_backend', 'admin_required', 'AdminUtils', 'init_admin_auth']
