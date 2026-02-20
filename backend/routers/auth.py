from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from middleware.auth_middleware import get_current_user
from schemas.user import UserCreate, UserLogin, UserResponse, Token
from utils.security import hash_password, verify_password, create_access_token
from datetime import datetime, timedelta
from services.audit_service import create_audit_log, AuditActions
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
import secrets
from services.email_service import send_password_reset_email
import os


router = APIRouter(prefix="/api/auth", tags=["Authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
        user_data: UserCreate,
        request: Request,
        db: Session = Depends(get_db)
):

    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    hashed_password = hash_password(user_data.password)
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    create_audit_log(
        db=db,
        action=AuditActions.USER_REGISTERED,
        description=f"New user registered: {user_data.email}",
        user_id=new_user.id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )

    access_token = create_access_token(data={"sub": new_user.email})
    return {
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "created_at": new_user.created_at,
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/login", response_model=UserResponse)
def login(
        credentials: UserLogin,
        request: Request,
        db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not verify_password(credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    create_audit_log(
        db=db,
        action=AuditActions.USER_LOGIN,
        description=f"User logged in: {user.email}",
        user_id=user.id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )

    access_token = create_access_token(data={"sub": user.email})

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "created_at": user.created_at,
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/forgot-password")
async def forgot_password(
        request: ForgotPasswordRequest,
        db: Session = Depends(get_db)
):

    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        return {"message": "If that email exists, a reset link has been sent"}

    reset_token = secrets.token_urlsafe(32)
    reset_expires = datetime.utcnow() + timedelta(hours=1)

    user.reset_token = reset_token
    user.reset_token_expires = reset_expires
    db.commit()

    try:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"

        await send_password_reset_email(
            user_email=user.email,
            user_name=user.name,
            reset_link=reset_link
        )
    except Exception as e:
        print(f"Failed to send email: {e}")

    return {"message": "If that email exists, a reset link has been sent"}


@router.post("/reset-password")
def reset_password(
        request: ResetPasswordRequest,
        db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.reset_token == request.token
    ).first()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token"
        )

    if user.reset_token_expires < datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="Reset token has expired. Please request a new one."
        )

    hashed_password = pwd_context.hash(request.new_password)

    user.password = hashed_password
    user.reset_token = None
    user.reset_token_expires = None

    db.commit()

    return {"message": "Password reset successfully"}


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):

    return current_user