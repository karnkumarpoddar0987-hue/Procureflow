from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ProcurementStage(str, enum.Enum):
    ARRIVED = "ARRIVED"
    WEIGHING = "WEIGHING"
    WEIGHING_COMPLETED = "WEIGHING_COMPLETED"
    QUALITY_CHECK = "QUALITY_CHECK"
    QUALITY_COMPLETED = "QUALITY_COMPLETED"
    PROCUREMENT_COMPLETED = "PROCUREMENT_COMPLETED"
    PAYMENT_PROCESSING = "PAYMENT_PROCESSING"
    PAYMENT_COMPLETED = "PAYMENT_COMPLETED"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Procurement(Base):
    __tablename__ = "procurements"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, unique=True)
    centre_id = Column(Integer, ForeignKey("procurement_centres.id"), nullable=False)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id"), nullable=False)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    crop_name = Column(String(255), nullable=True)
    gross_weight = Column(Float, nullable=True)
    net_weight = Column(Float, nullable=True)
    moisture_percent = Column(Float, nullable=True)
    quality_grade = Column(String(10), nullable=True)  # A, B, C
    msp_per_quintal = Column(Float, nullable=True)
    total_amount = Column(Float, nullable=True)
    stage = Column(String(50), default=ProcurementStage.ARRIVED)
    arrived_at = Column(DateTime(timezone=True), nullable=True)
    weighing_started_at = Column(DateTime(timezone=True), nullable=True)
    weighing_completed_at = Column(DateTime(timezone=True), nullable=True)
    quality_started_at = Column(DateTime(timezone=True), nullable=True)
    quality_completed_at = Column(DateTime(timezone=True), nullable=True)
    procurement_completed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    booking = relationship("Booking", back_populates="procurement")
    centre = relationship("ProcurementCentre", back_populates="procurements")
    payment = relationship("Payment", back_populates="procurement", uselist=False)

    def __repr__(self):
        return f"<Procurement id={self.id} stage={self.stage}>"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    procurement_id = Column(Integer, ForeignKey("procurements.id"), nullable=False, unique=True)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id"), nullable=False)
    amount = Column(Float, nullable=True)
    payment_mode = Column(String(50), nullable=True)  # NEFT, RTGS, UPI, etc.
    bank_account_masked = Column(String(30), nullable=True)
    transaction_reference = Column(String(100), nullable=True)
    status = Column(String(30), default=PaymentStatus.PENDING)
    initiated_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    procurement = relationship("Procurement", back_populates="payment")

    def __repr__(self):
        return f"<Payment id={self.id} amount={self.amount} status={self.status}>"
