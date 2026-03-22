from typing import Union
from fastapi import APIRouter, Depends, HTTPException, Header, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
import os
import uuid

from google.oauth2 import id_token
from google.auth.transport import requests

from models.database import get_db
from models.models import User
from utils.auth_helpers import get_password_hash, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

# Configuration
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")

class GoogleVerifyRequest(BaseModel):
    credential: str

class CompleteSignupRequest(BaseModel):
    google_id: str
    password: str
    confirm_password: str

class LoginRequest(BaseModel):
    email: str
    password: str

async def get_current_user(request: Request, authorization: Union[str, None] = Header(None), db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token and authorization and authorization.startswith("Bearer "):
        token = str(authorization).split(" ")[1]
        
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

@router.post("/google-verify")
async def google_verify(req: GoogleVerifyRequest, db: Session = Depends(get_db)):
    try:
        # Verify Google JWT
        idinfo = id_token.verify_oauth2_token(req.credential, requests.Request(), GOOGLE_CLIENT_ID)
        
        google_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name', '')
        avatar_url = idinfo.get('picture', '')

        # Check if user exists
        user = db.query(User).filter(User.google_id == google_id).first()
        status = "existing_user"
        requires_password = False

        if not user:
            # Create partial user record (password = None)
            user = User(
                email=email,
                full_name=name,
                avatar_url=avatar_url,
                google_id=google_id,
                is_active=True,
                plan='free'
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            status = "new_user"
            requires_password = True
        elif not user.hashed_password:
            requires_password = True
            status = "incomplete" # Google account exists but password not set yet

        return {
            "status": status,
            "google_id": google_id,
            "email": email,
            "name": name,
            "avatar_url": avatar_url,
            "requires_password": requires_password
        }

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Google token")

@router.post("/complete-signup")
async def complete_signup(req: CompleteSignupRequest, response: Response, db: Session = Depends(get_db)):
    if req.password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    user = db.query(User).filter(User.google_id == req.google_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.hashed_password:
        raise HTTPException(status_code=400, detail="User already has a password set")
    
    user.hashed_password = get_password_hash(req.password)
    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    token = create_access_token({"sub": str(user.id), "email": user.email})
    
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=7 * 24 * 3600
    )
    
    return {
        "token": token,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "plan": user.plan
        }
    }

@router.post("/login")
async def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    token = create_access_token({"sub": str(user.id), "email": user.email})
    
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=7 * 24 * 3600
    )
    
    return {
        "token": token,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "plan": user.plan
        }
    }

@router.post("/google-login")
async def google_login(req: GoogleVerifyRequest, response: Response, db: Session = Depends(get_db)):
    try:
        idinfo = id_token.verify_oauth2_token(req.credential, requests.Request(), GOOGLE_CLIENT_ID)
        google_id = idinfo['sub']
        
        user = db.query(User).filter(User.google_id == google_id).first()
        if not user:
            return {"status": "not_registered"}
        
        if not user.hashed_password:
            return {"status": "incomplete"}
            
        user.last_login = datetime.utcnow()
        db.commit()
        db.refresh(user)
        
        token = create_access_token({"sub": str(user.id), "email": user.email})
        
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            samesite="lax",
            max_age=7 * 24 * 3600
        )
        
        return {
            "token": token,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "avatar_url": user.avatar_url,
                "plan": user.plan
            }
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Google token")

@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "avatar_url": user.avatar_url,
        "plan": user.plan,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    return {"message": "Logged out successfully"}
