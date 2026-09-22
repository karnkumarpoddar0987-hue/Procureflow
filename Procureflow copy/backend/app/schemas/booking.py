from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date


class SlotOut(BaseModel):
    id: int
    centre_id: int
    slot_date: date
    slot_start_time: str
    slot_end_time: str
    slot_label: Optional[str] = None
    max_capacity: int
    booked_count: int
    available: int = 0
    status: str
    crowd_level: Optional[str] = None  # LOW, MEDIUM, HIGH
    estimated_wait_minutes: Optional[int] = None

    class Config:
        from_attributes = True


class CentreOut(BaseModel):
    id: int
    name: str
    code: str
    address: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: bool
    avg_service_time_minutes: int
    active_counters: Optional[int] = 0
    queue_length: Optional[int] = 0
    crowd_level: Optional[str] = None
    estimated_wait_minutes: Optional[int] = None

    class Config:
        from_attributes = True


class BookingCreate(BaseModel):
    slot_id: int
    crop_id: Optional[int] = None
    quantity_quintals: Optional[float] = None
    notes: Optional[str] = None


class BookingOut(BaseModel):
    id: int
    farmer_id: int
    slot_id: int
    crop_id: Optional[int] = None
    token_number: str
    quantity_quintals: Optional[float] = None
    status: str
    qr_data: Optional[str] = None
    created_at: Optional[datetime] = None
    # Nested info
    slot: Optional[SlotOut] = None
    centre_name: Optional[str] = None
    queue_position: Optional[int] = None
    estimated_wait_minutes: Optional[int] = None

    class Config:
        from_attributes = True


class BookingCancelRequest(BaseModel):
    reason: Optional[str] = None


class BookingRescheduleRequest(BaseModel):
    new_slot_id: int


class QueueEntryOut(BaseModel):
    id: int
    booking_id: int
    centre_id: int
    position: int
    status: str
    estimated_wait_minutes: Optional[int] = None
    called_at: Optional[datetime] = None
    service_started_at: Optional[datetime] = None
    token_number: Optional[str] = None
    current_token: Optional[str] = None
    people_ahead: Optional[int] = None
    active_counters: Optional[int] = None

    class Config:
        from_attributes = True
