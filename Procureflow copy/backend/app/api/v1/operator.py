from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from app.core.database import get_db
from app.models.user import User, FarmerProfile
from app.models.centre import ProcurementCentre, ProcurementCounter
from app.models.slot import Slot, Booking, QueueEntry, BookingStatus, QueueStatus
from app.models.procurement import Procurement, Payment, ProcurementStage, PaymentStatus
from app.schemas.procurement import (
    StartWeighingRequest, CompleteWeighingRequest,
    StartQualityRequest, CompleteQualityRequest,
    CompleteProcurementRequest, UpdatePaymentRequest,
    ProcurementOut, PaymentOut
)
from app.api.deps import require_operator
from app.services.notification_service import create_notification
from app.services.queue_service import get_active_counters_count

router = APIRouter(prefix="/operator", tags=["Operator"])


def get_operator_centre(current_user: User, db: Session) -> ProcurementCentre:
    """Get the centre associated with this operator."""
    counter = db.query(ProcurementCounter).filter(
        ProcurementCounter.operator_user_id == current_user.id
    ).first()
    if counter:
        return db.query(ProcurementCentre).filter(
            ProcurementCentre.id == counter.centre_id
        ).first()
    # Fallback: return first active centre
    return db.query(ProcurementCentre).filter(ProcurementCentre.is_active == True).first()


@router.get("/dashboard")
def get_operator_dashboard(
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    centre = get_operator_centre(current_user, db)
    if not centre:
        raise HTTPException(status_code=404, detail="No centre assigned")

    today = date.today()

    # Today's bookings — use explicit onclause to avoid Booking→Slot FK ambiguity
    today_bookings = db.query(Booking).join(Slot, Booking.slot_id == Slot.id).filter(
        Slot.centre_id == centre.id,
        Slot.slot_date == today
    ).all()

    waiting = db.query(QueueEntry).filter(
        QueueEntry.centre_id == centre.id,
        QueueEntry.status == QueueStatus.WAITING
    ).count()

    in_progress = db.query(QueueEntry).filter(
        QueueEntry.centre_id == centre.id,
        QueueEntry.status == QueueStatus.IN_PROGRESS
    ).count()

    called = db.query(QueueEntry).filter(
        QueueEntry.centre_id == centre.id,
        QueueEntry.status == QueueStatus.CALLED
    ).count()

    completed_today = db.query(Procurement).filter(
        Procurement.centre_id == centre.id,
        Procurement.stage == ProcurementStage.PAYMENT_COMPLETED
    ).count()

    active_counters = get_active_counters_count(db, centre.id)

    # Current token
    current_entry = db.query(QueueEntry).filter(
        QueueEntry.centre_id == centre.id,
        QueueEntry.status.in_([QueueStatus.CALLED, QueueStatus.IN_PROGRESS])
    ).order_by(QueueEntry.position.asc()).first()

    current_token = None
    if current_entry and current_entry.booking:
        current_token = current_entry.booking.token_number

    return {
        "centre_id": centre.id,
        "centre_name": centre.name,
        "today_total": len(today_bookings),
        "waiting": waiting,
        "in_progress": in_progress,
        "called": called,
        "completed_today": completed_today,
        "active_counters": active_counters,
        "current_token": current_token
    }


@router.get("/queue")
def get_operator_queue(
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    centre = get_operator_centre(current_user, db)
    if not centre:
        raise HTTPException(status_code=404, detail="No centre assigned")

    entries = db.query(QueueEntry).filter(
        QueueEntry.centre_id == centre.id,
        QueueEntry.status.in_([QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_PROGRESS])
    ).order_by(QueueEntry.position.asc()).all()

    result = []
    for entry in entries:
        booking = entry.booking
        farmer = booking.farmer if booking else None
        procurement = booking.procurement if booking else None
        result.append({
            "queue_id": entry.id,
            "position": entry.position,
            "status": entry.status,
            "booking_id": booking.id if booking else None,
            "token_number": booking.token_number if booking else None,
            "farmer_name": farmer.full_name if farmer else None,
            "farmer_mobile": farmer.mobile if farmer else None,
            "crop_name": procurement.crop_name if procurement else (booking.crop.crop_name if booking and booking.crop else None),
            "quantity": booking.quantity_quintals if booking else None,
            "procurement_stage": procurement.stage if procurement else None,
            "called_at": str(entry.called_at) if entry.called_at else None,
            "estimated_wait_minutes": entry.estimated_wait_minutes
        })
    return {"centre_id": centre.id, "queue": result}


@router.get("/farmers/today")
def get_todays_farmers(
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    centre = get_operator_centre(current_user, db)
    if not centre:
        raise HTTPException(status_code=404, detail="No centre assigned")

    today = date.today()
    bookings = db.query(Booking).join(Slot, Booking.slot_id == Slot.id).filter(
        Slot.centre_id == centre.id,
        Slot.slot_date == today,
        Booking.status == BookingStatus.CONFIRMED
    ).all()

    result = []
    for b in bookings:
        farmer = b.farmer
        queue_entry = b.queue_entry
        procurement = b.procurement
        result.append({
            "booking_id": b.id,
            "token_number": b.token_number,
            "farmer_name": farmer.full_name if farmer else None,
            "farmer_mobile": farmer.mobile if farmer else None,
            "crop_name": procurement.crop_name if procurement else (b.crop.crop_name if b.crop else None),
            "quantity": b.quantity_quintals,
            "queue_status": queue_entry.status if queue_entry else None,
            "queue_position": queue_entry.position if queue_entry else None,
            "procurement_stage": procurement.stage if procurement else None,
            "slot_time": f"{b.slot.slot_start_time} - {b.slot.slot_end_time}" if b.slot else None
        })
    return {"centre_id": centre.id, "farmers": result, "total": len(result)}


@router.post("/queue/call-next")
def call_next_farmer(
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    centre = get_operator_centre(current_user, db)
    if not centre:
        raise HTTPException(status_code=404, detail="No centre assigned")

    # Find next waiting entry
    next_entry = db.query(QueueEntry).filter(
        QueueEntry.centre_id == centre.id,
        QueueEntry.status == QueueStatus.WAITING
    ).order_by(QueueEntry.position.asc()).first()

    if not next_entry:
        return {"success": False, "message": "No farmers waiting in queue"}

    next_entry.status = QueueStatus.CALLED
    next_entry.called_at = datetime.utcnow()

    booking = next_entry.booking
    farmer = booking.farmer if booking else None
    farmer_user_id = farmer.user_id if farmer else None

    # Create procurement record if not exists
    if booking and not booking.procurement:
        procurement = Procurement(
            booking_id=booking.id,
            centre_id=centre.id,
            farmer_id=booking.farmer_id,
            operator_id=current_user.id,
            crop_name=booking.crop.crop_name if booking.crop else None,
            stage=ProcurementStage.ARRIVED,
            arrived_at=datetime.utcnow()
        )
        db.add(procurement)

    db.commit()

    # Notify farmer
    if farmer_user_id:
        create_notification(
            db, farmer_user_id,
            "Your Turn Has Come!",
            f"Token {booking.token_number}: Please proceed to the procurement counter at {centre.name}.",
            "FARMER_CALLED",
            booking.id if booking else None
        )

    return {
        "success": True,
        "message": "Next farmer called",
        "token_number": booking.token_number if booking else None,
        "farmer_name": farmer.full_name if farmer else None,
        "position": next_entry.position
    }


@router.post("/weighing/start")
def start_weighing(
    request: StartWeighingRequest,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == request.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    procurement = booking.procurement
    if not procurement:
        raise HTTPException(status_code=400, detail="Procurement record not found")

    procurement.stage = ProcurementStage.WEIGHING
    procurement.weighing_started_at = datetime.utcnow()
    procurement.operator_id = current_user.id

    # Update queue
    if booking.queue_entry:
        booking.queue_entry.status = QueueStatus.IN_PROGRESS
        booking.queue_entry.service_started_at = datetime.utcnow()

    db.commit()

    farmer = booking.farmer
    if farmer:
        create_notification(
            db, farmer.user_id,
            "Weighing Started",
            f"Token {booking.token_number}: Weighing of your produce has started.",
            "WEIGHING_STARTED",
            booking.id
        )

    return {"success": True, "stage": ProcurementStage.WEIGHING}


@router.post("/weighing/complete")
def complete_weighing(
    request: CompleteWeighingRequest,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == request.booking_id).first()
    if not booking or not booking.procurement:
        raise HTTPException(status_code=404, detail="Booking/procurement not found")

    p = booking.procurement
    p.stage = ProcurementStage.WEIGHING_COMPLETED
    p.gross_weight = request.gross_weight
    p.net_weight = request.net_weight
    p.moisture_percent = request.moisture_percent
    p.weighing_completed_at = datetime.utcnow()

    db.commit()

    farmer = booking.farmer
    if farmer:
        create_notification(
            db, farmer.user_id,
            "Weighing Completed",
            f"Token {booking.token_number}: Weighing completed. Net weight: {request.net_weight} quintals.",
            "WEIGHING_COMPLETED",
            booking.id
        )

    return {"success": True, "stage": ProcurementStage.WEIGHING_COMPLETED, "net_weight": request.net_weight}


@router.post("/quality/start")
def start_quality(
    request: StartQualityRequest,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == request.booking_id).first()
    if not booking or not booking.procurement:
        raise HTTPException(status_code=404, detail="Booking/procurement not found")

    p = booking.procurement
    p.stage = ProcurementStage.QUALITY_CHECK
    p.quality_started_at = datetime.utcnow()
    db.commit()

    farmer = booking.farmer
    if farmer:
        create_notification(
            db, farmer.user_id,
            "Quality Check Started",
            f"Token {booking.token_number}: Quality check has started.",
            "QUALITY_STARTED",
            booking.id
        )

    return {"success": True, "stage": ProcurementStage.QUALITY_CHECK}


@router.post("/quality/complete")
def complete_quality(
    request: CompleteQualityRequest,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == request.booking_id).first()
    if not booking or not booking.procurement:
        raise HTTPException(status_code=404, detail="Booking/procurement not found")

    p = booking.procurement
    p.stage = ProcurementStage.QUALITY_COMPLETED
    p.quality_grade = request.quality_grade
    if request.moisture_percent:
        p.moisture_percent = request.moisture_percent
    p.quality_completed_at = datetime.utcnow()
    if request.notes:
        p.notes = request.notes
    db.commit()

    farmer = booking.farmer
    if farmer:
        create_notification(
            db, farmer.user_id,
            "Quality Check Completed",
            f"Token {booking.token_number}: Quality check done. Grade: {request.quality_grade}.",
            "QUALITY_COMPLETED",
            booking.id
        )

    return {"success": True, "stage": ProcurementStage.QUALITY_COMPLETED, "grade": request.quality_grade}


@router.post("/procurement/complete")
def complete_procurement(
    request: CompleteProcurementRequest,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == request.booking_id).first()
    if not booking or not booking.procurement:
        raise HTTPException(status_code=404, detail="Booking/procurement not found")

    p = booking.procurement
    msp = request.msp_per_quintal or 2275.0  # Default wheat MSP (demo)
    total = (p.net_weight or 0) * msp

    p.stage = ProcurementStage.PROCUREMENT_COMPLETED
    p.msp_per_quintal = msp
    p.total_amount = total
    p.procurement_completed_at = datetime.utcnow()
    if request.notes:
        p.notes = request.notes

    # Update booking status
    booking.status = BookingStatus.COMPLETED

    # Update queue
    if booking.queue_entry:
        booking.queue_entry.status = QueueStatus.COMPLETED
        booking.queue_entry.service_completed_at = datetime.utcnow()

    # Create payment
    payment = Payment(
        procurement_id=p.id,
        farmer_id=booking.farmer_id,
        amount=total,
        payment_mode="NEFT",
        status=PaymentStatus.PROCESSING,
        initiated_at=datetime.utcnow()
    )
    db.add(payment)

    # Update procurement stage
    p.stage = ProcurementStage.PAYMENT_PROCESSING

    db.commit()

    farmer = booking.farmer
    if farmer:
        create_notification(
            db, farmer.user_id,
            "Procurement Completed",
            f"Token {booking.token_number}: Procurement complete! Amount: ₹{total:.0f}. Payment processing.",
            "PROCUREMENT_COMPLETED",
            booking.id
        )

    return {
        "success": True,
        "stage": ProcurementStage.PAYMENT_PROCESSING,
        "total_amount": total,
        "msp_per_quintal": msp
    }


@router.post("/payment/update")
def update_payment(
    request: UpdatePaymentRequest,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == request.booking_id).first()
    if not booking or not booking.procurement:
        raise HTTPException(status_code=404, detail="Booking/procurement not found")

    if not booking.procurement.payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    payment = booking.procurement.payment
    payment.status = request.status
    if request.transaction_reference:
        payment.transaction_reference = request.transaction_reference
    if request.notes:
        payment.notes = request.notes

    if request.status == PaymentStatus.COMPLETED:
        payment.completed_at = datetime.utcnow()
        booking.procurement.stage = ProcurementStage.PAYMENT_COMPLETED

    db.commit()

    farmer = booking.farmer
    if farmer:
        status_text = "completed" if request.status == PaymentStatus.COMPLETED else request.status.lower()
        create_notification(
            db, farmer.user_id,
            "Payment Update",
            f"Token {booking.token_number}: Payment {status_text}. Amount: ₹{payment.amount:.0f}.",
            "PAYMENT_UPDATED",
            booking.id
        )

    return {"success": True, "payment_status": request.status}


@router.get("/analytics")
def get_operator_analytics(
    days: int = 30,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    """Full analytics for operator — charts, stats, all farmers report."""
    from datetime import timedelta
    from sqlalchemy import func as sqlfunc

    centre = get_operator_centre(current_user, db)
    if not centre:
        raise HTTPException(status_code=404, detail="No centre assigned")

    today = date.today()
    start_date = today - timedelta(days=days)

    # ── Daily trend ──────────────────────────────────────────────────
    daily = []
    for i in range(days):
        d = start_date + timedelta(days=i)
        count = db.query(Booking).join(Slot, Booking.slot_id == Slot.id).filter(
            Slot.centre_id == centre.id,
            Slot.slot_date == d
        ).count()
        completed = db.query(Procurement).join(Booking, Procurement.booking_id == Booking.id)\
            .join(Slot, Booking.slot_id == Slot.id).filter(
            Slot.centre_id == centre.id,
            Slot.slot_date == d,
            Procurement.stage == ProcurementStage.PAYMENT_COMPLETED
        ).count()
        amount = db.query(sqlfunc.sum(Payment.amount)).join(Procurement, Payment.procurement_id == Procurement.id)\
            .join(Booking, Procurement.booking_id == Booking.id)\
            .join(Slot, Booking.slot_id == Slot.id).filter(
            Slot.centre_id == centre.id,
            Slot.slot_date == d,
            Payment.status == PaymentStatus.COMPLETED
        ).scalar() or 0
        daily.append({
            "date": str(d),
            "bookings": count,
            "completed": completed,
            "amount": float(amount)
        })

    # ── Crop breakdown ───────────────────────────────────────────────
    crop_rows = db.query(
        Procurement.crop_name,
        sqlfunc.count(Procurement.id).label("count"),
        sqlfunc.sum(Procurement.net_weight).label("total_weight"),
        sqlfunc.sum(Procurement.total_amount).label("total_amount")
    ).filter(Procurement.centre_id == centre.id).group_by(Procurement.crop_name).all()

    crops = [{"crop": r.crop_name or "Unknown", "count": r.count,
              "weight": float(r.total_weight or 0), "amount": float(r.total_amount or 0)}
             for r in crop_rows]

    # ── Grade breakdown ──────────────────────────────────────────────
    grade_rows = db.query(
        Procurement.quality_grade,
        sqlfunc.count(Procurement.id).label("count")
    ).filter(Procurement.centre_id == centre.id,
             Procurement.quality_grade.isnot(None)).group_by(Procurement.quality_grade).all()
    grades = [{"grade": r.quality_grade, "count": r.count} for r in grade_rows]

    # ── Stage funnel ─────────────────────────────────────────────────
    stage_counts = {}
    for stage in ProcurementStage:
        c = db.query(Procurement).filter(
            Procurement.centre_id == centre.id,
            Procurement.stage == stage
        ).count()
        stage_counts[stage.value] = c

    # ── Summary stats ────────────────────────────────────────────────
    total_bookings  = db.query(Booking).join(Slot, Booking.slot_id == Slot.id)\
        .filter(Slot.centre_id == centre.id).count()
    total_completed = db.query(Procurement).filter(
        Procurement.centre_id == centre.id,
        Procurement.stage == ProcurementStage.PAYMENT_COMPLETED
    ).count()
    total_weight = db.query(sqlfunc.sum(Procurement.net_weight))\
        .filter(Procurement.centre_id == centre.id).scalar() or 0
    total_amount = db.query(sqlfunc.sum(Payment.amount))\
        .join(Procurement, Payment.procurement_id == Procurement.id)\
        .filter(Procurement.centre_id == centre.id,
                Payment.status == PaymentStatus.COMPLETED).scalar() or 0
    avg_weight = (float(total_weight) / total_completed) if total_completed else 0

    # ── All farmers report ───────────────────────────────────────────
    all_procurements = db.query(Procurement).filter(
        Procurement.centre_id == centre.id
    ).order_by(Procurement.id.desc()).all()

    farmers_report = []
    for p in all_procurements:
        booking = p.booking
        farmer = db.query(__import__('app.models.user', fromlist=['FarmerProfile']).FarmerProfile).filter_by(id=p.farmer_id).first() if p.farmer_id else None
        payment = p.payment
        farmers_report.append({
            "token": booking.token_number if booking else "—",
            "farmer_name": farmer.full_name if farmer else "—",
            "farmer_mobile": farmer.mobile if farmer else "—",
            "crop": p.crop_name or "—",
            "gross_weight": float(p.gross_weight or 0),
            "net_weight": float(p.net_weight or 0),
            "moisture": float(p.moisture_percent or 0),
            "grade": p.quality_grade or "—",
            "msp": float(p.msp_per_quintal or 0),
            "amount": float(p.total_amount or 0),
            "stage": p.stage,
            "payment_status": payment.status if payment else "—",
            "date": str(p.arrived_at.date()) if p.arrived_at else "—",
        })

    return {
        "centre_name": centre.name,
        "centre_id": centre.id,
        "period_days": days,
        "summary": {
            "total_bookings": total_bookings,
            "total_completed": total_completed,
            "total_weight_quintals": float(total_weight),
            "total_amount_paid": float(total_amount),
            "avg_weight_per_farmer": round(avg_weight, 2),
            "completion_rate": round((total_completed / total_bookings * 100), 1) if total_bookings else 0,
        },
        "daily_trend": daily,
        "crop_breakdown": crops,
        "grade_breakdown": grades,
        "stage_funnel": stage_counts,
        "farmers_report": farmers_report,
    }
