from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class ProcurementCentre(Base):
    __tablename__ = "procurement_centres"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    address = Column(Text, nullable=True)
    village = Column(String(255), nullable=True)
    district = Column(String(255), nullable=True)
    state = Column(String(255), nullable=True)
    pincode = Column(String(10), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    contact_phone = Column(String(20), nullable=True)
    contact_email = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    total_capacity = Column(Integer, default=100)
    avg_service_time_minutes = Column(Integer, default=15)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    counters = relationship("ProcurementCounter", back_populates="centre")
    slots = relationship("Slot", back_populates="centre")
    procurements = relationship("Procurement", back_populates="centre")

    def __repr__(self):
        return f"<ProcurementCentre id={self.id} name={self.name}>"


class ProcurementCounter(Base):
    __tablename__ = "procurement_counters"

    id = Column(Integer, primary_key=True, index=True)
    centre_id = Column(Integer, ForeignKey("procurement_centres.id"), nullable=False)
    counter_number = Column(Integer, nullable=False)
    counter_name = Column(String(100), nullable=True)
    operator_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    is_open = Column(Boolean, default=False)
    current_queue_entry_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    centre = relationship("ProcurementCentre", back_populates="counters")

    def __repr__(self):
        return f"<ProcurementCounter id={self.id} counter={self.counter_number}>"
