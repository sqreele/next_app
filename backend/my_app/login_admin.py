# backend/my_app/login_admin.py

import os
from typing import Optional
from fastapi import Request
from sqlalchemy.orm import Session
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from starlette.responses import RedirectResponse

from database import sync_engine
from models import User, UserRole
from security import verify_password, create_access_token, SECRET_KEY, ALGORITHM
from jose import jwt, JWTError

class AdminAuthBackend(AuthenticationBackend):
    """Custom authentication backend for SQLAdmin"""
    
    async def login(self, request: Request) -> bool:
        """Handle admin login"""
        form = await request.form()
        username = form.get("username")
        password = form.get("password")
        
        if not username or not password:
            return False
        
        # Use sync session for SQLAdmin compatibility
        with Session(sync_engine) as db:
            try:
                # Get user by username
                user = db.query(User).filter(User.username == username).first()
                
                if not user or not user.is_active:
                    return False
                
                # Verify password (you'll need to add hashed_password field to User model)
                # For now, using plain text comparison - CHANGE THIS IN PRODUCTION
                if password != "admin123":  # Temporary - implement proper password hashing
                    return False
                
                # Only allow Admin and Manager roles
                if user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
                    return False
                
                # Create JWT token
                access_token = create_access_token(data={"sub": user.username})
                
                # Store token in session
                request.session.update({
                    "token": access_token,
                    "user_id": user.id,
                    "username": user.username,
                    "role": user.role.value
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
        """Check if user is authenticated"""
        token = request.session.get("token")
        
        if not token:
            return False
        
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            
            if username is None:
                return False
            
            # Verify user still exists and is active
            with Session(sync_engine) as db:
                user = db.query(User).filter(User.username == username).first()
                
                if not user or not user.is_active:
                    return False
                
                if user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
                    return False
                
                return True
                
        except JWTError:
            return False
        except Exception as e:
            print(f"Admin authentication error: {e}")
            return False

# Create the authentication backend instance
authentication_backend = AdminAuthBackend(secret_key=SECRET_KEY)
