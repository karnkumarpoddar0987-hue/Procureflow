from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date


class FarmerProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    photo_url: Optional[str] = None
    preferred_language: Optional[str] = None
    preferred_theme: Optional[str] = None
    assisted_mode: Optional[bool] = None


class FarmerProfileOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    mobile: Optional[str] = None
    email: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    aadhaar_masked: Optional[str] = None
    photo_url: Optional[str] = None
    kyc_verified: bool
    kyc_method: Optional[str] = None
    preferred_language: str
    preferred_theme: str
    assisted_mode: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CropCreate(BaseModel):
    crop_name: str
    crop_type: Optional[str] = None
    quantity_quintals: Optional[float] = None
    season: Optional[str] = None
    year: Optional[int] = None
    notes: Optional[str] = None


class CropUpdate(BaseModel):
    crop_name: Optional[str] = None
    crop_type: Optional[str] = None
    quantity_quintals: Optional[float] = None
    season: Optional[str] = None
    year: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class CropOut(BaseModel):
    id: int
    farmer_id: int
    crop_name: str
    crop_type: Optional[str] = None
    quantity_quintals: Optional[float] = None
    season: Optional[str] = None
    year: Optional[int] = None
    is_active: bool
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
