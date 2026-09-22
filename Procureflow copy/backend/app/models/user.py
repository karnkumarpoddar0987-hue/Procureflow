from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    FARMER = "FARMER"
    CENTRE_OPERATOR = "CENTRE_OPERATOR"
    GOVERNMENT_OFFICER = "GOVERNMENT_OFFICER"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    mobile = Column(String(20), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default=UserRole.FARMER)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    farmer_profile = relationship("FarmerProfile", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")

    def __repr__(self):
        return f"<User id={self.id} email={self.email} role={self.role}>"


class FarmerProfile(Base):
    __tablename__ = "farmer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    mobile = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    village = Column(String(255), nullable=True)
    district = Column(String(255), nullable=True)
    state = Column(String(255), nullable=True)
    pincode = Column(String(10), nullable=True)
    aadhaar_masked = Column(String(20), nullable=True)
    photo_url = Column(String(500), nullable=True)
    kyc_verified = Column(Boolean, default=False)
    kyc_method = Column(String(50), nullable=True)  # aadhaar_scan, aadhaar_number, normal
    preferred_language = Column(String(20), default="en")
    preferred_theme = Column(String(20), default="system")
    assisted_mode = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="farmer_profile")
    crops = relationship("FarmerCrop", back_populates="farmer")
    bookings = relationship("Booking", back_populates="farmer")

    def __repr__(self):
        return f"<FarmerProfile id={self.id} name={self.full_name}>"


class FarmerCrop(Base):
    __tablename__ = "farmer_crops"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id"), nullable=False)
    crop_name = Column(String(255), nullable=False)
    crop_type = Column(String(100), nullable=True)
    quantity_quintals = Column(Float, nullable=True)
    season = Column(String(100), nullable=True)
    year = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    farmer = relationship("FarmerProfile", back_populates="crops")

    def __repr__(self):
        return f"<FarmerCrop id={self.id} crop={self.crop_name}>"


class StaffProfile(Base):
    __tablename__ = "staff_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    role = Column(String(50), nullable=False)
    dob = Column(String(20), nullable=True)
    department = Column(String(255), nullable=True)
    employee_id = Column(String(50), unique=True, nullable=True)
    photo_path = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])
