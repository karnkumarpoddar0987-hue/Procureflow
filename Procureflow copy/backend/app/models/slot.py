from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Date, Time, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class SlotStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    FULL = "FULL"
    CLOSED = "CLOSED"


class BookingStatus(str, enum.Enum):
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    RESCHEDULED = "RESCHEDULED"
    NO_SHOW = "NO_SHOW"


class QueueStatus(str, enum.Enum):
    WAITING = "WAITING"
    CALLED = "CALLED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"


class Slot(Base):
    __tablename__ = "slots"

    id = Column(Integer, primary_key=True, index=True)
    centre_id = Column(Integer, ForeignKey("procurement_centres.id"), nullable=False)
    slot_date = Column(Date, nullable=False)
    slot_start_time = Column(String(10), nullable=False)  # e.g. "08:00"
    slot_end_time = Column(String(10), nullable=False)    # e.g. "10:00"
    slot_label = Column(String(50), nullable=True)         # e.g. "Morning"
    max_capacity = Column(Integer, default=20)
    booked_count = Column(Integer, default=0)
    status = Column(String(30), default=SlotStatus.AVAILABLE)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    centre = relationship("ProcurementCentre", back_populates="slots")
    bookings = relationship("Booking", back_populates="slot", foreign_keys="[Booking.slot_id]")

    def __repr__(self):
        return f"<Slot id={self.id} date={self.slot_date} time={self.slot_start_time}>"


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("slots.id"), nullable=False)
    crop_id = Column(Integer, ForeignKey("farmer_crops.id"), nullable=True)
    token_number = Column(String(20), nullable=False, unique=True)
    quantity_quintals = Column(Float, nullable=True)
    status = Column(String(30), default=BookingStatus.CONFIRMED)
    notes = Column(Text, nullable=True)
    qr_data = Column(Text, nullable=True)
    original_slot_id = Column(Integer, ForeignKey("slots.id"), nullable=True)  # for rescheduled
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    farmer = relationship("FarmerProfile", back_populates="bookings")
    slot = relationship("Slot", back_populates="bookings", foreign_keys=[slot_id])
    crop = relationship("FarmerCrop", foreign_keys=[crop_id])
    queue_entry = relationship("QueueEntry", back_populates="booking", uselist=False)
    procurement = relationship("Procurement", back_populates="booking", uselist=False)

    def __repr__(self):
        return f"<Booking id={self.id} token={self.token_number} status={self.status}>"


class QueueEntry(Base):
    __tablename__ = "queue_entries"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, unique=True)
    centre_id = Column(Integer, ForeignKey("procurement_centres.id"), nullable=False)
    counter_id = Column(Integer, ForeignKey("procurement_counters.id"), nullable=True)
    position = Column(Integer, nullable=False)
    status = Column(String(30), default=QueueStatus.WAITING)
    called_at = Column(DateTime(timezone=True), nullable=True)
    service_started_at = Column(DateTime(timezone=True), nullable=True)
    service_completed_at = Column(DateTime(timezone=True), nullable=True)
    estimated_wait_minutes = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    booking = relationship("Booking", back_populates="queue_entry")

    def __repr__(self):
        return f"<QueueEntry id={self.id} position={self.position} status={self.status}>"
