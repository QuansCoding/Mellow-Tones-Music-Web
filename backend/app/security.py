import os
import uuid
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from .database import get_db
from .models import User

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60
# Long enough to find the email and type the code; short enough that a lost
# one is useless soon after.
VERIFY_TOKEN_EXPIRE_MINUTES = 30
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
# auto_error=False so an anonymous request is None rather than a 401 —
# used by endpoints that serve everyone but return more when signed in.
oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl="/auth/login", auto_error=False)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    #bcrypt hash return
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    # TODO 2: compare safely. Hint: pwd_context.verify(plain, hashed)
    #   Note: you never "unhash" — you hash the attempt and compare.
    return pwd_context.verify(plain, hashed)


def _create_token(user_id: uuid.UUID, purpose: str, minutes: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    # "purpose" keeps the two kinds of token apart: a verification token
    # proves who is verifying, but must never work as a sign-in.
    payload = {"sub": str(user_id), "exp": expire, "purpose": purpose}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(user_id: uuid.UUID) -> str:
    # TODO 3: build payload {"sub": str(user_id), "exp": now + expiry}
    #   then jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    #   "sub" (subject) is the standard claim for "who this token is about"
    return _create_token(user_id, "access", TOKEN_EXPIRE_MINUTES)


def create_verification_token(user_id: uuid.UUID) -> str:
    """Lets an unverified user call /auth/verify and /auth/resend-code, and
    nothing else."""
    return _create_token(user_id, "verify", VERIFY_TOKEN_EXPIRE_MINUTES)


def decode_token(token: str, purpose: str = "access") -> uuid.UUID | None:
    # TODO 4: jwt.decode(...) inside try/except JWTError, return None on failure
    #   Return uuid.UUID(payload["sub"]) on success.
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Tokens issued before "purpose" existed were all sign-in tokens.
        if payload.get("purpose", "access") != purpose:
            return None
        return uuid.UUID(payload["sub"])
    except (JWTError, KeyError, ValueError):
        return None


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    user_id = decode_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Sign-in tokens are only issued after verification, so this is a second
    # lock on the same door rather than the main one.
    if user.email_verified_at is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email first",
        )
    return user


def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db),
) -> User | None:
    """The caller, if they are signed in — otherwise None.

    Deliberately never raises: search works signed out, it just cannot include
    private results like the caller's own playlists.
    """
    if not token:
        return None
    user_id = decode_token(token)
    if user_id is None:
        return None
    user = db.get(User, user_id)
    if user is None or user.email_verified_at is None:
        return None
    return user


def get_pending_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """The unverified account a verification token belongs to."""
    user_id = decode_token(token, purpose="verify")
    user = db.get(User, user_id) if user_id else None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your verification session expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.email_verified_at is not None:
        raise HTTPException(409, "This email is already verified. Please sign in.")
    return user
