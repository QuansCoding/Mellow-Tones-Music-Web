"""Sends the sign-up verification email through Brevo.

Local development needs no email account: with BREVO_API_KEY unset, the code
is printed to the API's console instead, the same way storage.py falls back to
the local disk when Supabase isn't configured.

Production needs:
  BREVO_API_KEY    Brevo → SMTP & API → API keys
  EMAIL_FROM       a sender address you have verified in Brevo
  EMAIL_FROM_NAME  optional display name (defaults to "MellowTones")
"""
import logging
import os

import httpx
from dotenv import load_dotenv

load_dotenv()
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "MellowTones")
BREVO_URL = "https://api.brevo.com/v3/smtp/email"

if BREVO_API_KEY and not EMAIL_FROM:
    # Fail at startup, not on the first sign-up.
    raise RuntimeError("EMAIL_FROM must be set when BREVO_API_KEY is")

log = logging.getLogger(__name__)


class EmailSendError(Exception):
    """The email provider refused the message or couldn't be reached."""


def send_verification_code(to: str, code: str, minutes: int) -> None:
    if not BREVO_API_KEY:
        print(f"[dev email] verification code for {to}: {code}", flush=True)
        return

    text = (
        f"Your MellowTones verification code is {code}.\n\n"
        f"It expires in {minutes} minutes. If you didn't sign up, ignore "
        "this email and no account will be activated."
    )
    html = (
        "<p>Your MellowTones verification code is:</p>"
        f'<p style="font-size:28px;font-weight:700;letter-spacing:6px">{code}</p>'
        f"<p>It expires in {minutes} minutes. If you didn't sign up, ignore "
        "this email and no account will be activated.</p>"
    )
    try:
        response = httpx.post(
            BREVO_URL,
            headers={"api-key": BREVO_API_KEY, "accept": "application/json"},
            json={
                "sender": {"email": EMAIL_FROM, "name": EMAIL_FROM_NAME},
                "to": [{"email": to}],
                # The code in the subject lets people read it from the
                # notification without opening the email.
                "subject": f"{code} is your MellowTones code",
                "textContent": text,
                "htmlContent": html,
            },
            timeout=10,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        log.error("Brevo send failed: %s", exc)
        raise EmailSendError from exc
