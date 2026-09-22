from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from app.models.user import UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    role: str
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: Optional[str] = None
    mobile: Optional[str] = None
    password: str


class StaffLoginRequest(BaseModel):
    email: str
    password: str


class FarmerLoginRequest(BaseModel):
    identifier: str  # mobile or email
    password: str


class RegisterRequest(BaseModel):
    full_name: str
    email: Optional[str] = None
    mobile: Optional[str] = None
    password: str
    confirm_password: str
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    kyc_method: Optional[str] = "normal"
    aadhaar_masked: Optional[str] = None
    consent: bool = False

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v, info):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class OTPRequest(BaseModel):
    mobile: Optional[str] = None
    email: Optional[str] = None


class OTPVerify(BaseModel):
    mobile: Optional[str] = None
    email: Optional[str] = None
    otp: str


class PasswordResetRequest(BaseModel):
    mobile: Optional[str] = None
    email: Optional[str] = None
    otp: str
    new_password: str
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v, info):
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v


class CurrentUser(BaseModel):
    id: int
    email: Optional[str] = None
    mobile: Optional[str] = None
    role: str
    is_active: bool
    full_name: Optional[str] = None

    class Config:
        from_attributes = True
