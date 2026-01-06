"""Authentication API routes."""
import re
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from slowapi import Limiter
from slowapi.util import get_remote_address

from core.database import get_db
from core.config import settings
from core.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user
)
from models.user import User, PasswordResetToken
from models.wedding import Wedding
from services.email import email_service

router = APIRouter()

# Rate limiter for auth endpoints
limiter = Limiter(key_func=get_remote_address)


def validate_password(password: str) -> tuple[bool, str]:
    """
    Validate password meets requirements:
    - At least 8 characters
    - At least 1 uppercase letter
    - At least 1 special character

    Returns (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters"

    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least 1 uppercase letter"

    if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]', password):
        return False, "Password must contain at least 1 special character (!@#$%^&* etc.)"

    return True, ""


# Request/Response Models
class UserRegisterRequest(BaseModel):
    """Request to register a new user."""
    email: EmailStr
    password: str
    name: Optional[str] = None


class UserLoginRequest(BaseModel):
    """Request to login."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """User data response."""
    id: str
    email: str
    name: Optional[str]
    wedding_id: Optional[str]
    is_verified: bool
    created_at: datetime


class UserWithWeddingResponse(BaseModel):
    """User data with wedding info."""
    id: str
    email: str
    name: Optional[str]
    wedding_id: Optional[str]
    wedding_access_code: Optional[str]
    wedding_partner1: Optional[str]
    wedding_partner2: Optional[str]
    is_verified: bool
    created_at: datetime


class ForgotPasswordRequest(BaseModel):
    """Request to initiate password reset."""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Request to reset password with token."""
    token: str
    new_password: str


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")  # 5 registration attempts per minute per IP
async def register(
    request: Request,  # Required for rate limiter - must be named 'request'
    body: UserRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user account.

    Returns a JWT token for immediate authentication.
    """
    # Check if email already exists
    result = await db.execute(
        select(User).where(User.email == body.email.lower())
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Validate password
    is_valid, error_msg = validate_password(body.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    # Create user
    user = User(
        email=body.email.lower(),
        hashed_password=get_password_hash(body.password),
        name=body.name
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Create access token
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")  # 10 login attempts per minute per IP (allows for typos)
async def login(
    request: Request,  # Required for rate limiter - must be named 'request'
    body: UserLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Login with email and password.

    Returns a JWT token for authentication.
    """
    # Find user
    result = await db.execute(
        select(User).where(User.email == body.email.lower())
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    # Update last login
    user.last_login_at = datetime.utcnow()
    await db.commit()

    # Create access token
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserWithWeddingResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the current authenticated user's profile.

    Includes wedding info if they have one.
    """
    wedding_access_code = None
    wedding_partner1 = None
    wedding_partner2 = None

    if current_user.wedding_id:
        result = await db.execute(
            select(Wedding).where(Wedding.id == current_user.wedding_id)
        )
        wedding = result.scalar_one_or_none()
        if wedding:
            wedding_access_code = wedding.access_code
            wedding_partner1 = wedding.partner1_name
            wedding_partner2 = wedding.partner2_name

    return UserWithWeddingResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        wedding_id=current_user.wedding_id,
        wedding_access_code=wedding_access_code,
        wedding_partner1=wedding_partner1,
        wedding_partner2=wedding_partner2,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at
    )


@router.post("/logout")
async def logout():
    """
    Logout the current user.

    Note: JWT tokens are stateless, so we just return success.
    The client should discard the token.
    """
    return {"message": "Successfully logged out"}


@router.post("/forgot-password")
@limiter.limit("3/minute")  # 3 password reset requests per minute per IP
async def forgot_password(
    request: Request,  # Required for rate limiter - must be named 'request'
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Request a password reset email.

    Always returns success to prevent email enumeration attacks.
    """
    # Find user by email
    result = await db.execute(
        select(User).where(User.email == body.email.lower())
    )
    user = result.scalar_one_or_none()

    if user:
        # Invalidate any existing reset tokens for this user
        result = await db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used_at == None
            )
        )
        existing_tokens = result.scalars().all()
        for token in existing_tokens:
            token.used_at = datetime.utcnow()

        # Create new reset token (expires in 1 hour)
        reset_token = PasswordResetToken(
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        db.add(reset_token)
        await db.commit()
        await db.refresh(reset_token)

        # Send email
        await email_service.send_password_reset_email(
            to_email=user.email,
            reset_token=reset_token.token,
            user_name=user.name
        )

    # Always return success to prevent email enumeration
    return {"message": "If an account exists with that email, you will receive a password reset link."}


@router.post("/reset-password")
@limiter.limit("5/minute")  # 5 password reset attempts per minute per IP
async def reset_password(
    request: Request,  # Required for rate limiter - must be named 'request'
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Reset password using a valid reset token.
    """
    # Find token
    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token == body.token)
    )
    reset_token = result.scalar_one_or_none()

    if not reset_token or not reset_token.is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    # Validate new password
    is_valid, error_msg = validate_password(body.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    # Get user
    result = await db.execute(
        select(User).where(User.id == reset_token.user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found"
        )

    # Update password
    user.hashed_password = get_password_hash(body.new_password)

    # Mark token as used
    reset_token.used_at = datetime.utcnow()

    await db.commit()

    return {"message": "Password has been reset successfully"}
