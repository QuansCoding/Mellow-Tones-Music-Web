"""Checks that run before an account is created.

1. Did a human submit the form? (Cloudflare Turnstile)
2. Can the address receive mail at all, and is it a real inbox rather than a
   throwaway one?

Neither proves the person owns the address; the emailed code does that. These
just stop the cheap, obvious junk before any row is written.
"""
import logging
import os

import httpx
from disposable_email_domains import blocklist
from dotenv import load_dotenv
from email_validator import EmailNotValidError, validate_email
from fastapi import HTTPException

load_dotenv()
TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY")
SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

log = logging.getLogger(__name__)
if not TURNSTILE_SECRET_KEY:
    log.warning("TURNSTILE_SECRET_KEY is not set: sign-ups skip the human "
                "check. Fine locally, never in production.")


def verify_human(token: str | None) -> None:
    """Confirm a Turnstile token with Cloudflare, or raise.

    Skipped when TURNSTILE_SECRET_KEY isn't set (local development, where
    the frontend doesn't show the widget either).
    """
    if not TURNSTILE_SECRET_KEY:
        return
    if not token:
        raise HTTPException(400, "Please complete the human check.")
    try:
        response = httpx.post(
            SITEVERIFY_URL,
            data={"secret": TURNSTILE_SECRET_KEY, "response": token},
            timeout=10,
        )
        response.raise_for_status()
        ok = response.json().get("success") is True
    except (httpx.HTTPError, ValueError):
        # Fail closed. If Cloudflare can't be reached, a bot shouldn't get
        # through just because the check couldn't run.
        raise HTTPException(
            503, "We couldn't run the human check. Please try again.")
    if not ok:
        raise HTTPException(
            400, "The human check failed or expired. Please try again.")


def _is_disposable(domain: str) -> bool:
    # Check the domain and every parent, so "x.mailinator.com" is caught too.
    parts = domain.lower().split(".")
    return any(".".join(parts[i:]) in blocklist for i in range(len(parts) - 1))


def check_email(address: str) -> str:
    """Return the normalised address, or raise 422 with a message a person
    can act on.

    check_deliverability asks DNS whether the domain accepts mail, which is
    what catches typos like "gmial.con". Asking the mail server whether one
    particular inbox exists isn't possible: most servers refuse to say, so
    spammers can't use them to check lists. The emailed code covers that.
    """
    try:
        result = validate_email(address, check_deliverability=True, timeout=5)
    except EmailNotValidError as exc:
        raise HTTPException(422, f"Please enter a valid email. {exc}")

    if _is_disposable(result.domain):
        raise HTTPException(
            422, "Please use a permanent email address. Temporary inboxes "
                 "can't be used to sign up.")
    return result.normalized
