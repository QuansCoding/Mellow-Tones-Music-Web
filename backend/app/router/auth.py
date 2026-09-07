from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserOut
from ..security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserOut, status_code=201)
def register(user_create: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(User).filter(User.username == user_create.username).first()
    if existing:
        raise HTTPException(400, "Username already taken")
    
    existing_email = db.query(User).filter(User.email == user_create.email).first()
    if existing_email:
        raise HTTPException(400, "Email already registered")
    
    # Create user with hashed password
    user = User(
        username=user_create.username,
        email=user_create.email,
        password_hash=hash_password(user_create.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login")
def login(username: str, password: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(401, "Incorrect username or password")
    
    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer"}

