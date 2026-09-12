from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..antibot import check_email, verify_human
from ..cleanup import is_abandoned, maybe_sweep
from ..database import get_db
from ..models import EmailVerification, User
from ..schemas import UserCreate, UserOut, VerificationPending, VerifyCode
from ..security import (
    hash_password, verify_password, create_access_token,
    create_verification_token, get_current_user, get_pending_user,
)
from ..verification import check_code, ensure_code, seconds_until_resend, send_code

router = APIRouter(prefix="/auth", tags=["auth"])


def _release_if_abandoned(db: Session, user: User) -> bool:
    """Delete a sign-up that was never finished. True if it was deleted.

    Stops anyone squatting a username (or someone else's email) by starting a
    sign-up they never complete. Same "abandoned" rule the sweep uses
    (cleanup.py), applied the instant another person wants that name instead
    of waiting for the next sweep.
    """
    if not is_abandoned(user, db.get(EmailVerification, user.id)):
        return False
    db.delete(user)
    db.flush()
    return True


def _pending(db: Session, user: User, sent: bool) -> VerificationPending:
    return VerificationPending(
        verification_token=create_verification_token(user.id),
        email=user.email,
        email_sent=sent,
        resend_in=seconds_until_resend(db.get(EmailVerification, user.id)),
    )


@router.post("/register", response_model=VerificationPending, status_code=201)
def register(user_create: UserCreate, db: Session = Depends(get_db)):
    # Before this request has changes of its own pending: the sweep commits.
    maybe_sweep(db)

    # Cheapest check that stops scripts goes first, before any DNS or
    # database work is spent on them.
    verify_human(user_create.captcha_token)
    email = check_email(user_create.email)

    # Check if user already exists
    existing = db.query(User).filter(User.username == user_create.username).first()
    if existing and not _release_if_abandoned(db, existing):
        raise HTTPException(400, "Username already taken")

    # Case-insensitive: "Sam@Gmail.com" and "sam@gmail.com" are one inbox.
    existing_email = db.query(User).filter(
        func.lower(User.email) == email.lower()).first()
    if existing_email and not _release_if_abandoned(db, existing_email):
        if existing_email.email_verified_at is None:
            raise HTTPException(
                400, "This email is already waiting to be verified. Log in "
                     "to get a new code.")
        raise HTTPException(400, "Email already registered")

    # Create user with hashed password. Unverified until the code comes back.
    user = User(
        username=user_create.username,
        email=email,
        password_hash=hash_password(user_create.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    try:
        send_code(db, user)
        sent = True
    except HTTPException:
        # The account exists either way; the verify screen offers Resend.
        sent = False
    return _pending(db, user, sent)


@router.post("/login")
def login(
    #Takes in same flow sent by OAuth2
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    maybe_sweep(db)

    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.email_verified_at is None:
        # Right password, unverified email: no sign-in token. Send them to
        # the code screen instead, with a live code on its way. Checked only
        # after the password, so this can't reveal which accounts exist.
        sent = ensure_code(db, user)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "email_not_verified",
                "message": "Please verify your email to sign in.",
                **_pending(db, user, sent).model_dump(),
            },
        )

    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/verify")
def verify_email(body: VerifyCode, db: Session = Depends(get_db),
                 user: User = Depends(get_pending_user)):
    """Check the emailed code. On success the user is signed in straight away."""
    check_code(db, user, body.code)
    return {"access_token": create_access_token(user.id), "token_type": "bearer"}


@router.post("/resend-code", status_code=204)
def resend_code(db: Session = Depends(get_db),
                user: User = Depends(get_pending_user)):
    send_code(db, user)


@router.get("/me", response_model=UserOut)
def read_me(user: User = Depends(get_current_user)):
    """Who the bearer token belongs to.

    The frontend previously had no way to answer this, which is why the
    library could not be attributed to anyone.
    """
    return user
