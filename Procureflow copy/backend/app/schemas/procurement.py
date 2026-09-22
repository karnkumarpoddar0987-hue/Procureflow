from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ProcurementOut(BaseModel):
    id: int
    booking_id: int
    centre_id: int
    farmer_id: int
    crop_name: Optional[str] = None
    gross_weight: Optional[float] = None
    net_weight: Optional[float] = None
    moisture_percent: Optional[float] = None
    quality_grade: Optional[str] = None
    msp_per_quintal: Optional[float] = None
    total_amount: Optional[float] = None
    stage: str
    arrived_at: Optional[datetime] = None
    weighing_started_at: Optional[datetime] = None
    weighing_completed_at: Optional[datetime] = None
    quality_started_at: Optional[datetime] = None
    quality_completed_at: Optional[datetime] = None
    procurement_completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaymentOut(BaseModel):
    id: int
    procurement_id: int
    farmer_id: int
    amount: Optional[float] = None
    payment_mode: Optional[str] = None
    bank_account_masked: Optional[str] = None
    transaction_reference: Optional[str] = None
    status: str
    initiated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# Operator schemas
class StartWeighingRequest(BaseModel):
    booking_id: int


class CompleteWeighingRequest(BaseModel):
    booking_id: int
    gross_weight: float
    net_weight: float
    moisture_percent: Optional[float] = None


class StartQualityRequest(BaseModel):
    booking_id: int


class CompleteQualityRequest(BaseModel):
    booking_id: int
    quality_grade: str
    moisture_percent: Optional[float] = None
    notes: Optional[str] = None


class CompleteProcurementRequest(BaseModel):
    booking_id: int
    msp_per_quintal: Optional[float] = None
    notes: Optional[str] = None


class UpdatePaymentRequest(BaseModel):
    booking_id: int
    status: str
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None
