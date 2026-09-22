"""
Demo OTP Service
This is a prototype-only OTP system. In production, connect to a real SMS gateway.
OTPs are stored in memory for demo purposes and returned in the response.
"""
import random
import time
from typing import Dict, Tuple

# In-memory OTP store: key = mobile/email, value = (otp, timestamp)
_otp_store: Dict[str, Tuple[str, float]] = {}
OTP_EXPIRY_SECONDS = 300  # 5 minutes


def generate_otp(identifier: str) -> str:
    """Generate a 6-digit demo OTP and store it."""
    otp = str(random.randint(100000, 999999))
    _otp_store[identifier] = (otp, time.time())
    return otp


def verify_otp(identifier: str, otp: str) -> bool:
    """Verify the OTP for the given identifier."""
    if identifier not in _otp_store:
        return False
    stored_otp, timestamp = _otp_store[identifier]
    if time.time() - timestamp > OTP_EXPIRY_SECONDS:
        del _otp_store[identifier]
        return False
    if stored_otp != otp:
        return False
    del _otp_store[identifier]
    return True


def get_demo_otp(identifier: str) -> str:
    """Get the current demo OTP (for display in demo mode)."""
    if identifier in _otp_store:
        otp, _ = _otp_store[identifier]
        return otp
    return ""
