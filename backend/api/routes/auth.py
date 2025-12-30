"""Authentication API routes."""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from core.database import get_db
from core.config import settings
from core.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user
)
from models.user import User
from models.wedding import Wedding

router = APIRouter()


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


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: UserRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user account.

    Returns a JWT token for immediate authentication.
    """
    # Check if email already exists
    result = await db.execute(
        select(User).where(User.email == request.email.lower())
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Validate password
    if len(request.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )

    # Create user
    user = User(
        email=request.email.lower(),
        hashed_password=get_password_hash(request.password),
        name=request.name
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
async def login(
    request: UserLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Login with email and password.

    Returns a JWT token for authentication.
    """
    # Find user
    result = await db.execute(
        select(User).where(User.email == request.email.lower())
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.hashed_password):
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
