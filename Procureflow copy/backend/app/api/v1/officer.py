from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, timedelta

from app.core.database import get_db
from app.models.centre import ProcurementCentre, ProcurementCounter
from app.models.slot import Slot, Booking, QueueEntry, BookingStatus, QueueStatus
from app.models.procurement import Procurement, Payment, ProcurementStage, PaymentStatus
from app.models.user import FarmerProfile, User
from app.api.deps import require_officer
from app.services.queue_service import get_crowd_level, get_active_counters_count, calculate_wait_time

router = APIRouter(prefix="/officer", tags=["Government Officer"])

# Helper: explicit onclause to avoid Booking→Slot FK ambiguity (slot_id vs original_slot_id)
BOOKING_SLOT_JOIN = Booking.slot_id == Slot.id


@router.get("/dashboard")
def get_officer_dashboard(
    current_user: User = Depends(require_officer),
    db: Session = Depends(get_db),
):
    today = date.today()

    total_farmers = db.query(FarmerProfile).count()

    # Today's procurements — use explicit onclause
    today_procurements = (
        db.query(Procurement)
        .join(Booking, Procurement.booking_id == Booking.id)
        .join(Slot, BOOKING_SLOT_JOIN)
        .filter(Slot.slot_date == today)
        .all()
    )

    waiting           = db.query(QueueEntry).filter(QueueEntry.status == QueueStatus.WAITING).count()
    in_progress       = db.query(QueueEntry).filter(QueueEntry.status == QueueStatus.IN_PROGRESS).count()
    completed         = db.query(Procurement).filter(Procurement.stage == ProcurementStage.PAYMENT_COMPLETED).count()
    payment_processing= db.query(Payment).filter(Payment.status == PaymentStatus.PROCESSING).count()
    payment_completed = db.query(Payment).filter(Payment.status == PaymentStatus.COMPLETED).count()

    total_amount_paid = (
        db.query(func.sum(Payment.amount)).filter(Payment.status == PaymentStatus.COMPLETED).scalar() or 0
    )
    active_centres = db.query(ProcurementCentre).filter(ProcurementCentre.is_active == True).count()

    entries_with_wait = db.query(QueueEntry).filter(QueueEntry.estimated_wait_minutes.isnot(None)).all()
    avg_wait = 0
    if entries_with_wait:
        avg_wait = round(
            sum(e.estimated_wait_minutes for e in entries_with_wait) / len(entries_with_wait), 1
        )

    stages: dict = {}
    for p in today_procurements:
        stages[p.stage] = stages.get(p.stage, 0) + 1

    return {
        "total_farmers": total_farmers,
        "today_total": len(today_procurements),
        "waiting": waiting,
        "in_progress": in_progress,
        "completed_total": completed,
        "payment_processing": payment_processing,
        "payment_completed": payment_completed,
        "total_amount_paid": round(total_amount_paid, 2),
        "active_centres": active_centres,
        "avg_wait_minutes": avg_wait,
        "today_stages": stages,
    }


@router.get("/centres")
def get_centres_overview(
    current_user: User = Depends(require_officer),
    db: Session = Depends(get_db),
):
    centres = db.query(ProcurementCentre).filter(ProcurementCentre.is_active == True).all()
    result = []
    today = date.today()

    for centre in centres:
        active_counters = get_active_counters_count(db, centre.id)
        queue_length = db.query(QueueEntry).filter(
            QueueEntry.centre_id == centre.id, QueueEntry.status == QueueStatus.WAITING
        ).count()
        wait = calculate_wait_time(queue_length, active_counters, centre.avg_service_time_minutes)

        today_slots = db.query(Slot).filter(Slot.centre_id == centre.id, Slot.slot_date == today).all()
        total_booked   = sum(s.booked_count for s in today_slots)
        total_capacity = sum(s.max_capacity for s in today_slots) or 1
        crowd = get_crowd_level(total_booked, total_capacity)

        completed = db.query(Procurement).filter(
            Procurement.centre_id == centre.id,
            Procurement.stage == ProcurementStage.PAYMENT_COMPLETED,
        ).count()

        today_procurements = (
            db.query(Procurement)
            .join(Booking, Procurement.booking_id == Booking.id)
            .join(Slot, BOOKING_SLOT_JOIN)
            .filter(Slot.centre_id == centre.id, Slot.slot_date == today)
            .count()
        )

        total_amount = (
            db.query(func.sum(Payment.amount))
            .join(Procurement, Payment.procurement_id == Procurement.id)
            .filter(Procurement.centre_id == centre.id, Payment.status == PaymentStatus.COMPLETED)
            .scalar()
            or 0
        )

        result.append({
            "id": centre.id,
            "name": centre.name,
            "code": centre.code,
            "district": centre.district,
            "state": centre.state,
            "active_counters": active_counters,
            "queue_length": queue_length,
            "crowd_level": crowd,
            "estimated_wait_minutes": wait,
            "today_bookings": total_booked,
            "today_procurements": today_procurements,
            "total_completed": completed,
            "total_amount_paid": round(total_amount, 2),
        })

    return {"centres": result}


@router.get("/centres/{centre_id}/performance")
def get_centre_performance(
    centre_id: int,
    days: int = 7,
    current_user: User = Depends(require_officer),
    db: Session = Depends(get_db),
):
    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")

    result = []
    today = date.today()

    for i in range(days - 1, -1, -1):
        day = today - timedelta(days=i)
        day_slots = db.query(Slot).filter(Slot.centre_id == centre_id, Slot.slot_date == day).all()
        total_booked   = sum(s.booked_count for s in day_slots)
        total_capacity = sum(s.max_capacity for s in day_slots) or 1

        procurements = (
            db.query(Procurement)
            .join(Booking, Procurement.booking_id == Booking.id)
            .join(Slot, BOOKING_SLOT_JOIN)
            .filter(Slot.centre_id == centre_id, Slot.slot_date == day)
            .all()
        )

        completed = sum(1 for p in procurements if p.stage == ProcurementStage.PAYMENT_COMPLETED)
        total_amount = (
            db.query(func.sum(Payment.amount))
            .join(Procurement, Payment.procurement_id == Procurement.id)
            .join(Booking, Procurement.booking_id == Booking.id)
            .join(Slot, BOOKING_SLOT_JOIN)
            .filter(Slot.centre_id == centre_id, Slot.slot_date == day, Payment.status == PaymentStatus.COMPLETED)
            .scalar()
            or 0
        )

        result.append({
            "date": str(day),
            "bookings": total_booked,
            "capacity": total_capacity,
            "procurements": len(procurements),
            "completed": completed,
            "amount_paid": round(total_amount, 2),
            "utilization": round(total_booked / total_capacity * 100, 1),
        })

    return {"centre_id": centre_id, "centre_name": centre.name, "performance": result}


@router.get("/procurements")
def get_procurements_overview(
    centre_id: Optional[int] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    stage: Optional[str] = None,
    current_user: User = Depends(require_officer),
    db: Session = Depends(get_db),
):
    query = db.query(Procurement)

    if centre_id:
        query = query.filter(Procurement.centre_id == centre_id)
    if stage:
        query = query.filter(Procurement.stage == stage)

    # Date filters require joining — use explicit onclause
    if from_date or to_date:
        query = (
            query
            .join(Booking, Procurement.booking_id == Booking.id)
            .join(Slot, BOOKING_SLOT_JOIN)
        )
        if from_date:
            try:
                query = query.filter(Slot.slot_date >= date.fromisoformat(from_date))
            except ValueError:
                pass
        if to_date:
            try:
                query = query.filter(Slot.slot_date <= date.fromisoformat(to_date))
            except ValueError:
                pass

    procurements = query.order_by(Procurement.created_at.desc()).limit(100).all()

    result = []
    for p in procurements:
        farmer = p.booking.farmer if p.booking else None
        slot   = p.booking.slot   if p.booking else None
        centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == p.centre_id).first()

        result.append({
            "id": p.id,
            "token": p.booking.token_number if p.booking else None,
            "farmer_name": farmer.full_name if farmer else None,
            "centre_name": centre.name if centre else None,
            "crop_name": p.crop_name,
            "net_weight": p.net_weight,
            "quality_grade": p.quality_grade,
            "total_amount": p.total_amount,
            "stage": p.stage,
            "date": str(slot.slot_date) if slot else None,
            "payment_status": p.payment.status if p.payment else None,
        })

    return {"procurements": result, "total": len(result)}


@router.get("/payments")
def get_payments_overview(
    status_filter: Optional[str] = None,
    centre_id: Optional[int] = None,
    current_user: User = Depends(require_officer),
    db: Session = Depends(get_db),
):
    query = db.query(Payment)
    if status_filter:
        query = query.filter(Payment.status == status_filter)

    payments = query.order_by(Payment.created_at.desc()).limit(100).all()

    result = []
    for pay in payments:
        p      = pay.procurement
        farmer = p.booking.farmer if p and p.booking else None
        centre = (
            db.query(ProcurementCentre).filter(ProcurementCentre.id == p.centre_id).first()
            if p else None
        )

        if centre_id and (not centre or centre.id != centre_id):
            continue

        result.append({
            "id": pay.id,
            "token": p.booking.token_number if p and p.booking else None,
            "farmer_name": farmer.full_name if farmer else None,
            "centre_name": centre.name if centre else None,
            "amount": pay.amount,
            "status": pay.status,
            "payment_mode": pay.payment_mode,
            "initiated_at": str(pay.initiated_at) if pay.initiated_at else None,
            "completed_at": str(pay.completed_at) if pay.completed_at else None,
        })

    total_amount = sum(p["amount"] or 0 for p in result)
    return {"payments": result, "total": len(result), "total_amount": round(total_amount, 2)}


@router.get("/trends")
def get_trends(
    days: int = 14,
    current_user: User = Depends(require_officer),
    db: Session = Depends(get_db),
):
    today = date.today()
    result = []

    for i in range(days - 1, -1, -1):
        day = today - timedelta(days=i)

        day_bookings = (
            db.query(Booking)
            .join(Slot, BOOKING_SLOT_JOIN)
            .filter(Slot.slot_date == day)
            .count()
        )
        day_completed = (
            db.query(Procurement)
            .join(Booking, Procurement.booking_id == Booking.id)
            .join(Slot, BOOKING_SLOT_JOIN)
            .filter(Slot.slot_date == day, Procurement.stage == ProcurementStage.PAYMENT_COMPLETED)
            .count()
        )
        day_amount = (
            db.query(func.sum(Payment.amount))
            .join(Procurement, Payment.procurement_id == Procurement.id)
            .join(Booking, Procurement.booking_id == Booking.id)
            .join(Slot, BOOKING_SLOT_JOIN)
            .filter(Slot.slot_date == day, Payment.status == PaymentStatus.COMPLETED)
            .scalar()
            or 0
        )

        result.append({
            "date": str(day),
            "bookings": day_bookings,
            "completed": day_completed,
            "amount": round(day_amount, 2),
        })

    return {"trends": result}


@router.get("/stats/summary")
def get_stats_summary(
    current_user: User = Depends(require_officer),
    db: Session = Depends(get_db),
):
    total_bookings = db.query(Booking).count()
    completed = db.query(Procurement).filter(
        Procurement.stage == ProcurementStage.PAYMENT_COMPLETED
    ).count()
    total_amount = (
        db.query(func.sum(Payment.amount)).filter(Payment.status == PaymentStatus.COMPLETED).scalar() or 0
    )
    total_weight = db.query(func.sum(Procurement.net_weight)).scalar() or 0

    crops_data = db.query(
        Procurement.crop_name,
        func.count(Procurement.id).label("count"),
        func.sum(Procurement.net_weight).label("weight"),
        func.sum(Procurement.total_amount).label("amount"),
    ).group_by(Procurement.crop_name).all()

    crops = [
        {
            "crop": c.crop_name or "Unknown",
            "count": c.count,
            "weight": round(c.weight or 0, 2),
            "amount": round(c.amount or 0, 2),
        }
        for c in crops_data
    ]

    return {
        "total_bookings": total_bookings,
        "total_completed": completed,
        "total_amount_paid": round(total_amount, 2),
        "total_weight_quintals": round(total_weight, 2),
        "by_crop": crops,
    }
