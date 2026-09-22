"""
Admin-only endpoints for staff management.
Only ADMIN role can create/manage Centre Operators and Government Officers.
"""
import os, base64, uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole, StaffProfile
from app.api.deps import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])

UPLOAD_DIR = "uploads/staff_photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


@router.post("/staff/register")
async def register_staff(
    full_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    dob: str = Form(...),
    department: str = Form(...),
    employee_id: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Admin creates a new Centre Operator or Government Officer with photo."""

    # Validate role
    if role not in [UserRole.CENTRE_OPERATOR, UserRole.GOVERNMENT_OFFICER]:
        raise HTTPException(status_code=400, detail="Role must be CENTRE_OPERATOR or GOVERNMENT_OFFICER")

    # Check duplicate email
    if db.query(User).filter(User.email == email.lower()).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Save photo
    ext = photo.filename.split(".")[-1] if photo.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    photo_path = os.path.join(UPLOAD_DIR, filename)
    contents = await photo.read()
    with open(photo_path, "wb") as f:
        f.write(contents)

    # Create user
    user = User(
        email=email.lower(),
        hashed_password=get_password_hash(password),
        role=role,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.flush()

    # Generate employee ID if not provided
    emp_id = employee_id or f"PF-{role[:2].upper()}-{user.id:04d}"

    # Create staff profile
    profile = StaffProfile(
        user_id=user.id,
        full_name=full_name,
        email=email.lower(),
        phone=phone,
        role=role,
        dob=dob,
        department=department,
        employee_id=emp_id,
        photo_path=photo_path,
    )
    db.add(profile)
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "user_id": user.id,
        "employee_id": emp_id,
        "email": email.lower(),
        "role": role,
        "full_name": full_name,
        "message": f"Staff account created. Login with email: {email} and your chosen password."
    }


@router.get("/staff")
def list_staff(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """List all staff members."""
    profiles = db.query(StaffProfile).all()
    result = []
    for p in profiles:
        photo_b64 = None
        if p.photo_path and os.path.exists(p.photo_path):
            with open(p.photo_path, "rb") as f:
                photo_b64 = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()
        result.append({
            "user_id": p.user_id,
            "employee_id": p.employee_id,
            "full_name": p.full_name,
            "email": p.email,
            "phone": p.phone,
            "role": p.role,
            "dob": p.dob,
            "department": p.department,
            "photo": photo_b64,
            "is_active": p.user.is_active if p.user else True,
        })
    return result


@router.put("/staff/me/profile")
async def update_my_profile(
    full_name: Optional[str] = Form(None),
    dob: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Staff updates their own profile details and/or photo."""
    if current_user.role not in [UserRole.CENTRE_OPERATOR, UserRole.GOVERNMENT_OFFICER]:
        raise HTTPException(status_code=403, detail="Staff only")

    profile = db.query(StaffProfile).filter(StaffProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Contact admin.")

    if full_name:   profile.full_name  = full_name
    if dob:         profile.dob        = dob
    if department:  profile.department = department
    if phone is not None: profile.phone = phone

    if photo and photo.filename:
        ext = photo.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{ext}"
        photo_path = os.path.join(UPLOAD_DIR, filename)
        contents = await photo.read()
        with open(photo_path, "wb") as f:
            f.write(contents)
        # delete old photo
        if profile.photo_path and os.path.exists(profile.photo_path):
            os.remove(profile.photo_path)
        profile.photo_path = photo_path

    db.commit()
    db.refresh(profile)

    photo_b64 = None
    if profile.photo_path and os.path.exists(profile.photo_path):
        with open(profile.photo_path, "rb") as f:
            photo_b64 = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()

    return {
        "success": True,
        "has_profile": True,
        "user_id": profile.user_id,
        "employee_id": profile.employee_id,
        "full_name": profile.full_name,
        "email": profile.email,
        "phone": profile.phone,
        "role": profile.role,
        "dob": profile.dob,
        "department": profile.department,
        "photo": photo_b64,
    }


@router.get("/staff/me/profile")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the digital ID card profile for the logged-in staff member."""
    if current_user.role not in [UserRole.CENTRE_OPERATOR, UserRole.GOVERNMENT_OFFICER]:
        raise HTTPException(status_code=403, detail="Staff only")

    profile = db.query(StaffProfile).filter(StaffProfile.user_id == current_user.id).first()
    if not profile:
        return {"has_profile": False}

    photo_b64 = None
    if profile.photo_path and os.path.exists(profile.photo_path):
        with open(profile.photo_path, "rb") as f:
            photo_b64 = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()

    return {
        "has_profile": True,
        "user_id": profile.user_id,
        "employee_id": profile.employee_id,
        "full_name": profile.full_name,
        "email": profile.email,
        "phone": profile.phone,
        "role": profile.role,
        "dob": profile.dob,
        "department": profile.department,
        "photo": photo_b64,
    }
