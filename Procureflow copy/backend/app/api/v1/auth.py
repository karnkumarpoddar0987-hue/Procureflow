from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.models.user import User, UserRole, FarmerProfile
from app.schemas.auth import (
    Token, LoginRequest, StaffLoginRequest, FarmerLoginRequest,
    RegisterRequest, OTPRequest, OTPVerify, PasswordResetRequest, CurrentUser
)
from app.services.otp_service import generate_otp, verify_otp, get_demo_otp
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/farmer/login", response_model=Token)
def farmer_login(request: FarmerLoginRequest, db: Session = Depends(get_db)):
    """Farmer login with mobile or email + password."""
    identifier = request.identifier.strip().lower()
    user = None

    # Try email first
    if "@" in identifier:
        user = db.query(User).filter(User.email == identifier).first()
    else:
        # Try mobile
        user = db.query(User).filter(User.mobile == identifier).first()
        if not user:
            user = db.query(User).filter(User.email == identifier).first()

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    if user.role != UserRole.FARMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This portal is for farmers only"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    full_name = None
    if user.farmer_profile:
        full_name = user.farmer_profile.full_name

    return Token(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        role=user.role,
        full_name=full_name
    )


@router.post("/staff/login", response_model=Token)
def staff_login(request: StaffLoginRequest, db: Session = Depends(get_db)):
    """Staff login (operator / officer) with email + password."""
    email = request.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    if user.role not in [UserRole.CENTRE_OPERATOR, UserRole.GOVERNMENT_OFFICER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This portal is for staff only"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    full_name = email.split("@")[0].capitalize()

    return Token(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        role=user.role,
        full_name=full_name
    )


@router.post("/register", response_model=Token)
def register_farmer(request: RegisterRequest, db: Session = Depends(get_db)):
    """Farmer self-registration."""
    if not request.email and not request.mobile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or mobile is required"
        )

    # Check duplicates
    if request.email:
        existing = db.query(User).filter(User.email == request.email.lower()).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    if request.mobile:
        existing = db.query(User).filter(User.mobile == request.mobile).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mobile number already registered"
            )

    hashed_pw = get_password_hash(request.password)
    user = User(
        email=request.email.lower() if request.email else None,
        mobile=request.mobile,
        hashed_password=hashed_pw,
        role=UserRole.FARMER,
        is_active=True,
        is_verified=False
    )
    db.add(user)
    db.flush()

    profile = FarmerProfile(
        user_id=user.id,
        full_name=request.full_name,
        mobile=request.mobile,
        email=request.email.lower() if request.email else None,
        village=request.village,
        district=request.district,
        state=request.state,
        kyc_method=request.kyc_method or "normal",
        aadhaar_masked=request.aadhaar_masked,
        kyc_verified=True if request.aadhaar_masked else False
    )
    db.add(profile)
    db.commit()
    db.refresh(user)

    token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return Token(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        role=user.role,
        full_name=request.full_name
    )


@router.post("/otp/send")
def send_otp(request: OTPRequest):
    """Send demo OTP to mobile or email."""
    identifier = request.mobile or request.email
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile or email required"
        )
    otp = generate_otp(identifier)
    # In a real app: send via SMS/email. For demo, return in response.
    return {
        "success": True,
        "message": "OTP sent successfully (demo mode)",
        "demo_otp": otp,  # Exposed only for prototype demonstration
        "note": "This is a demo OTP system. No real SMS/email is sent."
    }


@router.post("/otp/verify")
def verify_otp_endpoint(request: OTPVerify):
    """Verify OTP."""
    identifier = request.mobile or request.email
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile or email required"
        )
    if verify_otp(identifier, request.otp):
        return {"success": True, "message": "OTP verified successfully"}
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired OTP"
    )


@router.post("/forgot-password")
def forgot_password(request: OTPRequest, db: Session = Depends(get_db)):
    """Initiate password reset via OTP."""
    identifier = request.mobile or request.email
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile or email required"
        )
    # Check user exists
    if request.mobile:
        user = db.query(User).filter(User.mobile == request.mobile).first()
    else:
        user = db.query(User).filter(User.email == request.email.lower()).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this mobile/email"
        )

    otp = generate_otp(identifier)
    return {
        "success": True,
        "message": "OTP sent for password reset (demo mode)",
        "demo_otp": otp,
        "note": "Demo OTP system. No real SMS/email is sent."
    }


@router.post("/reset-password")
def reset_password(request: PasswordResetRequest, db: Session = Depends(get_db)):
    """Reset password after OTP verification."""
    identifier = request.mobile or request.email
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile or email required"
        )

    if not verify_otp(identifier, request.otp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )

    if request.mobile:
        user = db.query(User).filter(User.mobile == request.mobile).first()
    else:
        user = db.query(User).filter(User.email == request.email.lower()).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user.hashed_password = get_password_hash(request.new_password)
    db.commit()
    return {"success": True, "message": "Password reset successfully"}


@router.get("/me", response_model=CurrentUser)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user info."""
    full_name = None
    if current_user.farmer_profile:
        full_name = current_user.farmer_profile.full_name
    return CurrentUser(
        id=current_user.id,
        email=current_user.email,
        mobile=current_user.mobile,
        role=current_user.role,
        is_active=current_user.is_active,
        full_name=full_name
    )
