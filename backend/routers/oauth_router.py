from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.user import User
import requests
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
from jose import jwt

load_dotenv()

router = APIRouter(prefix="/api/auth", tags=["OAuth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5173/auth/google/callback")

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))


def create_access_token(data: dict):

    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


class GoogleTokenRequest(BaseModel):
    code: str


class GoogleAuthResponse(BaseModel):
    access_token: str
    user: dict


@router.get("/google/login")
def google_login():
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={GOOGLE_REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=openid%20email%20profile&"
        f"access_type=offline"
    )
    return {"url": google_auth_url}


@router.post("/google/callback", response_model=GoogleAuthResponse)
def google_callback(token_request: GoogleTokenRequest, db: Session = Depends(get_db)):

    try:
        print(f"📝 Received authorization code: {token_request.code[:20]}...")
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "code": token_request.code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }

        print(f"🔄 Exchanging code for tokens...")
        token_response = requests.post(token_url, data=token_data)

        if token_response.status_code != 200:
            error_detail = token_response.json()
            print(f"❌ Token exchange failed: {error_detail}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Google token exchange failed: {error_detail.get('error_description', 'Unknown error')}"
            )

        tokens = token_response.json()
        print(f"✅ Got tokens from Google")
        user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        user_info_response = requests.get(user_info_url, headers=headers)
        user_info_response.raise_for_status()
        user_info = user_info_response.json()

        print(f"✅ Google user info: {user_info}")

        email = user_info.get("email")
        user = db.query(User).filter(User.email == email).first()

        if not user:
            user = User(
                name=user_info.get("name"),
                email=email,
                password="google_oauth",
                google_id=user_info.get("id"),
                profile_picture=user_info.get("picture")
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"✅ Created new user: {user.email}")
        else:
            if not user.google_id:
                user.google_id = user_info.get("id")
            if not user.profile_picture:
                user.profile_picture = user_info.get("picture")
            db.commit()
            print(f"✅ Updated existing user: {user.email}")

        access_token = create_access_token(data={"sub": user.email})

        return {
            "access_token": access_token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "profile_picture": user.profile_picture
            }
        }

    except requests.exceptions.RequestException as e:
        print(f"❌ Google API error: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = e.response.json()
                print(f"❌ Error details: {error_detail}")
            except:
                print(f"❌ Response text: {e.response.text}")

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to authenticate with Google. Please try again."
        )
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed. Please try again."
        )