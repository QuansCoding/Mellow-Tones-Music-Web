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
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    # TODO 1: return the bcrypt hash. Hint: pwd_context.hash(plain)
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    # TODO 2: compare safely. Hint: pwd_context.verify(plain, hashed)
    #   Note: you never "unhash" — you hash the attempt and compare.
    return pwd_context.verify(plain, hashed)

def create_access_token(user_id: uuid.UUID) -> str:
    # TODO 3: build payload {"sub": str(user_id), "exp": now + expiry}
    #   then jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    #   "sub" (subject) is the standard claim for "who this token is about"
    expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)

    payload = {"sub": str(user_id), "exp":expire}

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> uuid.UUID | None:
    # TODO 4: jwt.decode(...) inside try/except JWTError, return None on failure
    #   Return uuid.UUID(payload["sub"]) on success.
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
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
    return user
