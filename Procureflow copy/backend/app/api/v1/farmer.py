from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta
import math

from app.core.database import get_db
from app.models.user import User, FarmerProfile, FarmerCrop, UserRole
from app.models.centre import ProcurementCentre, ProcurementCounter
from app.models.slot import Slot, Booking, QueueEntry, SlotStatus, BookingStatus, QueueStatus
from app.models.procurement import Procurement, Payment, ProcurementStage, PaymentStatus
from app.schemas.farmer import FarmerProfileUpdate, FarmerProfileOut, CropCreate, CropUpdate, CropOut
from app.schemas.booking import SlotOut, CentreOut, BookingCreate, BookingOut, BookingCancelRequest, BookingRescheduleRequest, QueueEntryOut
from app.schemas.procurement import ProcurementOut, PaymentOut
from app.schemas.notification import NotificationOut, NotificationMarkRead
from app.api.deps import require_farmer
from app.services.queue_service import get_crowd_level, get_active_counters_count, calculate_wait_time, get_waiting_info
from app.services.notification_service import get_user_notifications, mark_notifications_read, create_notification
from app.services.ai_service import get_recommended_slot
import random
import string

router = APIRouter(prefix="/farmer", tags=["Farmer"])


def generate_token(db: Session) -> str:
    while True:
        token = "PF" + "".join(random.choices(string.digits, k=6))
        existing = db.query(Booking).filter(Booking.token_number == token).first()
        if not existing:
            return token


def get_farmer_profile_or_404(user: User, db: Session) -> FarmerProfile:
    profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Farmer profile not found")
    return profile


# ─── PROFILE ────────────────────────────────────────────────────────────────

@router.get("/profile", response_model=FarmerProfileOut)
def get_profile(current_user: User = Depends(require_farmer), db: Session = Depends(get_db)):
    return get_farmer_profile_or_404(current_user, db)


@router.put("/profile", response_model=FarmerProfileOut)
def update_profile(
    data: FarmerProfileUpdate,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db)
):
    profile = get_farmer_profile_or_404(current_user, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


# ─── CROPS ──────────────────────────────────────────────────────────────────

@router.get("/crops", response_model=List[CropOut])
def get_crops(current_user: User = Depends(require_farmer), db: Session = Depends(get_db)):
    profile = get_farmer_profile_or_404(current_user, db)
    return db.query(FarmerCrop).filter(
        FarmerCrop.farmer_id == profile.id,
        FarmerCrop.is_active == True
    ).all()


@router.post("/crops", response_model=CropOut)
def add_crop(
    data: CropCreate,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db)
):
    profile = get_farmer_profile_or_404(current_user, db)
    crop = FarmerCrop(farmer_id=profile.id, **data.model_dump())
    db.add(crop)
    db.commit()
    db.refresh(crop)
    return crop


@router.put("/crops/{crop_id}", response_model=CropOut)
def update_crop(
    crop_id: int,
    data: CropUpdate,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db)
):
    profile = get_farmer_profile_or_404(current_user, db)
    crop = db.query(FarmerCrop).filter(
        FarmerCrop.id == crop_id,
        FarmerCrop.farmer_id == profile.id
    ).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(crop, field, value)
    db.commit()
    db.refresh(crop)
    return crop


@router.delete("/crops/{crop_id}")
def delete_crop(
    crop_id: int,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db)
):
    profile = get_farmer_profile_or_404(current_user, db)
    crop = db.query(FarmerCrop).filter(
        FarmerCrop.id == crop_id,
        FarmerCrop.farmer_id == profile.id
    ).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")
    crop.is_active = False
    db.commit()
    return {"success": True, "message": "Crop removed"}


# ─── CENTRES ────────────────────────────────────────────────────────────────

def build_centre_out(centre: ProcurementCentre, db: Session) -> CentreOut:
    active_counters = get_active_counters_count(db, centre.id)
    queue_length = db.query(QueueEntry).filter(
        QueueEntry.centre_id == centre.id,
        QueueEntry.status == QueueStatus.WAITING
    ).count()
    wait = calculate_wait_time(queue_length, active_counters, centre.avg_service_time_minutes)

    # Get today's bookings for crowd
    today = date.today()
    today_slots = db.query(Slot).filter(
        Slot.centre_id == centre.id,
        Slot.slot_date == today
    ).all()
    total_booked = sum(s.booked_count for s in today_slots)
    total_capacity = sum(s.max_capacity for s in today_slots) or 1
    crowd = get_crowd_level(total_booked, total_capacity)

    return CentreOut(
        id=centre.id,
        name=centre.name,
        code=centre.code,
        address=centre.address,
        village=centre.village,
        district=centre.district,
        state=centre.state,
        contact_phone=centre.contact_phone,
        is_active=centre.is_active,
        avg_service_time_minutes=centre.avg_service_time_minutes,
        active_counters=active_counters,
        queue_length=queue_length,
        crowd_level=crowd,
        estimated_wait_minutes=wait
    )


@router.get("/centres", response_model=List[CentreOut])
def get_centres(db: Session = Depends(get_db)):
    centres = db.query(ProcurementCentre).filter(ProcurementCentre.is_active == True).all()
    return [build_centre_out(c, db) for c in centres]


@router.get("/centres/{centre_id}", response_model=CentreOut)
def get_centre(centre_id: int, db: Session = Depends(get_db)):
    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")
    return build_centre_out(centre, db)


@router.get("/centres/{centre_id}/slots", response_model=List[SlotOut])
def get_centre_slots(
    centre_id: int,
    booking_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")

    query = db.query(Slot).filter(
        Slot.centre_id == centre_id,
        Slot.is_active == True,
        Slot.status != SlotStatus.CLOSED
    )

    if booking_date:
        try:
            target_date = date.fromisoformat(booking_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
        query = query.filter(Slot.slot_date == target_date)
    else:
        today = date.today()
        query = query.filter(Slot.slot_date >= today)

    slots = query.order_by(Slot.slot_date, Slot.slot_start_time).all()
    active_counters = get_active_counters_count(db, centre_id)

    result = []
    for slot in slots:
        available = slot.max_capacity - slot.booked_count
        queue_length = db.query(QueueEntry).filter(
            QueueEntry.centre_id == centre_id,
            QueueEntry.status == QueueStatus.WAITING
        ).count()
        wait = calculate_wait_time(queue_length, active_counters, centre.avg_service_time_minutes)
        crowd = get_crowd_level(slot.booked_count, slot.max_capacity)

        result.append(SlotOut(
            id=slot.id,
            centre_id=slot.centre_id,
            slot_date=slot.slot_date,
            slot_start_time=slot.slot_start_time,
            slot_end_time=slot.slot_end_time,
            slot_label=slot.slot_label,
            max_capacity=slot.max_capacity,
            booked_count=slot.booked_count,
            available=available,
            status=slot.status,
            crowd_level=crowd,
            estimated_wait_minutes=wait
        ))
    return result


# ─── AI RECOMMENDATION ───────────────────────────────────────────────────────

@router.get("/ai/recommend")
def get_ai_recommendation(
    centre_id: Optional[int] = None,
    booking_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Rule-based slot recommendation (not ML)."""
    query = db.query(Slot).filter(
        Slot.is_active == True,
        Slot.status == SlotStatus.AVAILABLE
    )
    if centre_id:
        query = query.filter(Slot.centre_id == centre_id)
    if booking_date:
        try:
            target_date = date.fromisoformat(booking_date)
            query = query.filter(Slot.slot_date == target_date)
        except ValueError:
            pass
    else:
        today = date.today()
        query = query.filter(Slot.slot_date >= today)

    slots = query.all()
    recommendation = get_recommended_slot(slots, db)

    if not recommendation:
        return {"recommendation": None, "message": "No available slots found"}

    slot = recommendation["slot"]
    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == slot.centre_id).first()

    return {
        "recommendation": {
            "slot_id": slot.id,
            "centre_id": slot.centre_id,
            "centre_name": centre.name if centre else None,
            "slot_date": str(slot.slot_date),
            "slot_start_time": slot.slot_start_time,
            "slot_end_time": slot.slot_end_time,
            "slot_label": slot.slot_label,
            "crowd_level": recommendation["crowd_level"],
            "estimated_wait_minutes": recommendation["estimated_wait_minutes"],
            "reason": recommendation["reason"],
            "available": slot.max_capacity - slot.booked_count
        }
    }


# ─── BOOKINGS ────────────────────────────────────────────────────────────────

@router.post("/bookings", response_model=BookingOut)
def create_booking(
    data: BookingCreate,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db)
):
    profile = get_farmer_profile_or_404(current_user, db)

    # Validate slot
    slot = db.query(Slot).filter(Slot.id == data.slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.status == SlotStatus.FULL or slot.booked_count >= slot.max_capacity:
        raise HTTPException(status_code=400, detail="Slot is full")
    if slot.status == SlotStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Slot is closed")

    # Check for duplicate active booking — explicit onclause to avoid FK ambiguity
    existing = db.query(Booking).join(Slot, Booking.slot_id == Slot.id).filter(
        Booking.farmer_id == profile.id,
        Booking.status == BookingStatus.CONFIRMED,
        Slot.slot_date == slot.slot_date
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="You already have a booking for this date"
        )

    token = generate_token(db)

    # QR data (simple JSON string for demo)
    qr_data = f"PROCUREFLOW|TOKEN:{token}|CENTRE:{slot.centre_id}|DATE:{slot.slot_date}|FARMER:{profile.full_name}"

    booking = Booking(
        farmer_id=profile.id,
        slot_id=data.slot_id,
        crop_id=data.crop_id,
        token_number=token,
        quantity_quintals=data.quantity_quintals,
        status=BookingStatus.CONFIRMED,
        qr_data=qr_data,
        notes=data.notes
    )
    db.add(booking)

    # Update slot count
    slot.booked_count += 1
    if slot.booked_count >= slot.max_capacity:
        slot.status = SlotStatus.FULL

    db.flush()

    # Create queue entry
    last_position = db.query(QueueEntry).filter(
        QueueEntry.centre_id == slot.centre_id
    ).order_by(QueueEntry.position.desc()).first()
    next_position = (last_position.position + 1) if last_position else 1

    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == slot.centre_id).first()
    active_counters = get_active_counters_count(db, slot.centre_id)
    wait = calculate_wait_time(next_position - 1, active_counters, centre.avg_service_time_minutes if centre else 15)

    queue_entry = QueueEntry(
        booking_id=booking.id,
        centre_id=slot.centre_id,
        position=next_position,
        status=QueueStatus.WAITING,
        estimated_wait_minutes=wait
    )
    db.add(queue_entry)
    db.commit()
    db.refresh(booking)

    # Notification
    create_notification(
        db, current_user.id,
        "Booking Confirmed",
        f"Your slot is confirmed. Token: {token}. Date: {slot.slot_date}",
        "BOOKING_CONFIRMED",
        booking.id
    )

    return BookingOut(
        id=booking.id,
        farmer_id=booking.farmer_id,
        slot_id=booking.slot_id,
        crop_id=booking.crop_id,
        token_number=booking.token_number,
        quantity_quintals=booking.quantity_quintals,
        status=booking.status,
        qr_data=booking.qr_data,
        created_at=booking.created_at,
        slot=SlotOut(
            id=slot.id,
            centre_id=slot.centre_id,
            slot_date=slot.slot_date,
            slot_start_time=slot.slot_start_time,
            slot_end_time=slot.slot_end_time,
            slot_label=slot.slot_label,
            max_capacity=slot.max_capacity,
            booked_count=slot.booked_count,
            available=slot.max_capacity - slot.booked_count,
            status=slot.status
        ),
        centre_name=centre.name if centre else None,
        queue_position=next_position,
        estimated_wait_minutes=wait
    )


@router.get("/bookings", response_model=List[BookingOut])
def get_bookings(
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db)
):
    profile = get_farmer_profile_or_404(current_user, db)
    bookings = db.query(Booking).filter(Booking.farmer_id == profile.id).order_by(
        Booking.created_at.desc()
    ).all()

    result = []
    for b in bookings:
        slot = b.slot
        centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == slot.centre_id).first() if slot else None
        queue_entry = b.queue_entry

        result.append(BookingOut(
            id=b.id,
            farmer_id=b.farmer_id,
            slot_id=b.slot_id,
            crop_id=b.crop_id,
            token_number=b.token_number,
            quantity_quintals=b.quantity_quintals,
            status=b.status,
            qr_data=b.qr_data,
            created_at=b.created_at,
            slot=SlotOut(
                id=slot.id,
                centre_id=slot.centre_id,
                slot_date=slot.slot_date,
                slot_start_time=slot.slot_start_time,
                slot_end_time=slot.slot_end_time,
                slot_label=slot.slot_label,
                max_capacity=slot.max_capacity,
                booked_count=slot.booked_count,
                available=slot.max_capacity - slot.booked_count,
                status=slot.status
            ) if slot else None,
            centre_name=centre.name if centre else None,
            queue_position=queue_entry.position if queue_entry else None,
            estimated_wait_minutes=queue_entry.estimated_wait_minutes if queue_entry else None
        ))
    return result


@router.get("/bookings/active")
def get_active_booking(
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db)
):
    """Get farmer's current active booking with full status."""
    profile = get_farmer_profile_or_404(current_user, db)

    # Find the most recent booking — include COMPLETED so post-procurement state is visible
    booking = db.query(Booking).filter(
        Booking.farmer_id == profile.id,
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
    ).order_by(Booking.created_at.desc()).first()

    if not booking:
        return {"booking": None, "action_required": "BOOK_SLOT"}

    slot = booking.slot
    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == slot.centre_id).first() if slot else None
    queue_entry = booking.queue_entry
    procurement = booking.procurement

    # Determine "Aaj Kya Karna Hai?" action
    action = "WAIT"
    action_message = "Wait for your turn"

    if procurement:
        if procurement.stage == ProcurementStage.ARRIVED:
            action = "ARRIVED"
            action_message = "You have arrived. Please wait to be called."
        elif procurement.stage == ProcurementStage.WEIGHING:
            action = "WEIGHING"
            action_message = "Weighing is in progress."
        elif procurement.stage == ProcurementStage.WEIGHING_COMPLETED:
            action = "QUALITY_PENDING"
            action_message = "Weighing done. Waiting for quality check."
        elif procurement.stage == ProcurementStage.QUALITY_CHECK:
            action = "QUALITY_CHECK"
            action_message = "Quality check is in progress."
        elif procurement.stage == ProcurementStage.QUALITY_COMPLETED:
            action = "QUALITY_DONE"
            action_message = "Quality check done. Procurement being completed."
        elif procurement.stage == ProcurementStage.PROCUREMENT_COMPLETED:
            action = "PROCUREMENT_COMPLETED"
            action_message = "Procurement completed! Awaiting payment."
        elif procurement.stage in [ProcurementStage.PAYMENT_PROCESSING]:
            action = "PAYMENT_PROCESSING"
            action_message = "Payment is being processed."
        elif procurement.stage == ProcurementStage.PAYMENT_COMPLETED:
            action = "PAYMENT_COMPLETED"
            action_message = "Payment completed!"
    elif queue_entry:
        if queue_entry.status == QueueStatus.CALLED:
            action = "CALLED"
            action_message = "Your turn has come! Please go to the counter."
        elif queue_entry.status == QueueStatus.WAITING:
            waiting_info = get_waiting_info(db, booking.id)
            if waiting_info and waiting_info["people_ahead"] <= 2:
                action = "TURN_APPROACHING"
                action_message = f"Your turn is approaching! {waiting_info['people_ahead']} farmer(s) ahead."
            else:
                action = "WAITING"
                action_message = f"You are in the queue. Position: {queue_entry.position}"
    else:
        booking_date = slot.slot_date if slot else None
        today = date.today()
        if booking_date and booking_date > today:
            action = "UPCOMING"
            action_message = f"Your booking is on {booking_date}."
        else:
            action = "TODAY"
            action_message = "Your booking is today. Please arrive on time."

    waiting_info = get_waiting_info(db, booking.id) if queue_entry else None
    payment = None
    if procurement and procurement.payment:
        payment = {
            "status": procurement.payment.status,
            "amount": procurement.payment.amount,
            "completed_at": str(procurement.payment.completed_at) if procurement.payment.completed_at else None
        }

    return {
        "booking": {
            "id": booking.id,
            "token_number": booking.token_number,
            "status": booking.status,
            "qr_data": booking.qr_data,
            "created_at": str(booking.created_at),
            "slot": {
                "date": str(slot.slot_date) if slot else None,
                "start_time": slot.slot_start_time if slot else None,
                "end_time": slot.slot_end_time if slot else None,
                "label": slot.slot_label if slot else None
            },
            "centre": {
                "id": centre.id if centre else None,
                "name": centre.name if centre else None,
                "address": centre.address if centre else None
            }
        },
        "queue": {
            "position": waiting_info["queue_position"] if waiting_info else (queue_entry.position if queue_entry else None),
            "status": queue_entry.status if queue_entry else None,
            "people_ahead": waiting_info["people_ahead"] if waiting_info else None,
            "estimated_wait_minutes": waiting_info["estimated_wait_minutes"] if waiting_info else None,
            "active_counters": waiting_info["active_counters"] if waiting_info else None
        } if queue_entry else None,
        "procurement": {
            "stage": procurement.stage if procurement else None,
            "arrived_at": str(procurement.arrived_at) if procurement and procurement.arrived_at else None,
            "weighing_completed_at": str(procurement.weighing_completed_at) if procurement and procurement.weighing_completed_at else None,
            "quality_completed_at": str(procurement.quality_completed_at) if procurement and procurement.quality_completed_at else None,
            "procurement_completed_at": str(procurement.procurement_completed_at) if procurement and procurement.procurement_completed_at else None,
            "net_weight": procurement.net_weight if procurement else None,
            "quality_grade": procurement.quality_grade if procurement else None,
            "total_amount": procurement.total_amount if procurement else None
        } if procurement else None,
        "payment": payment,
        "action": action,
        "action_message": action_message
    }


@router.post("/bookings/{booking_id}/cancel")
def cancel_booking(
    booking_id: int,
    request: BookingCancelRequest,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db)
):
    profile = get_farmer_profile_or_404(current_user, db)
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.farmer_id == profile.id
    ).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != BookingStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="Booking cannot be cancelled")

    booking.status = BookingStatus.CANCELLED
    booking.cancelled_at = datetime.utcnow()
    booking.cancellation_reason = request.reason

    # Update slot count
    slot = booking.slot
    if slot and slot.booked_count > 0:
        slot.booked_count -= 1
        if slot.status == SlotStatus.FULL:
            slot.status = SlotStatus.AVAILABLE

    # Update queue
    if booking.queue_entry:
        booking.queue_entry.status = QueueStatus.SKIPPED

    db.commit()

    create_notification(
        db, current_user.id,
        "Booking Cancelled",
        f"Your booking with token {booking.token_number} has been cancelled.",
        "BOOKING_CANCELLED",
        booking_id
    )

    return {"success": True, "message": "Booking cancelled successfully"}


@router.post("/bookings/{booking_id}/reschedule")
def reschedule_booking(
    booking_id: int,
    request: BookingRescheduleRequest,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db)
):
    profile = get_farmer_profile_or_404(current_user, db)
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.farmer_id == profile.id
    ).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != BookingStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="Booking cannot be rescheduled")

    new_slot = db.query(Slot).filter(Slot.id == request.new_slot_id).first()
    if not new_slot:
        raise HTTPException(status_code=404, detail="New slot not found")
    if new_slot.booked_count >= new_slot.max_capacity:
        raise HTTPException(status_code=400, detail="New slot is full")

    old_slot = booking.slot
    if old_slot and old_slot.booked_count > 0:
        old_slot.booked_count -= 1
        if old_slot.status == SlotStatus.FULL:
            old_slot.status = SlotStatus.AVAILABLE

    booking.original_slot_id = booking.slot_id
    booking.slot_id = request.new_slot_id
    booking.status = BookingStatus.CONFIRMED

    new_slot.booked_count += 1
    if new_slot.booked_count >= new_slot.max_capacity:
        new_slot.status = SlotStatus.FULL

    # Update queue entry centre and recalculate position
    if booking.queue_entry:
        new_centre_id = new_slot.centre_id
        booking.queue_entry.centre_id = new_centre_id
        # Count waiting entries in new centre to assign correct position
        last = db.query(QueueEntry).filter(
            QueueEntry.centre_id == new_centre_id,
            QueueEntry.status == QueueStatus.WAITING,
            QueueEntry.booking_id != booking.id
        ).count()
        booking.queue_entry.position = last + 1

    db.commit()

    create_notification(
        db, current_user.id,
        "Booking Rescheduled",
        f"Your booking has been rescheduled to {new_slot.slot_date} ({new_slot.slot_label or new_slot.slot_start_time}).",
        "BOOKING_RESCHEDULED",
        booking_id
    )

    return {"success": True, "message": "Booking rescheduled successfully", "new_date": str(new_slot.slot_date)}


# ─── QUEUE ───────────────────────────────────────────────────────────────────

@router.get("/queue/{booking_id}", response_model=QueueEntryOut)
def get_queue_status(
    booking_id: int,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db)
):
    profile = get_farmer_profile_or_404(current_user, db)
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.farmer_id == profile.id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    queue_entry = booking.queue_entry
    if not queue_entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")

    waiting_info = get_waiting_info(db, booking_id)

    # Get current token being served
    current_entry = db.query(QueueEntry).filter(
        QueueEntry.centre_id == queue_entry.centre_id,
        QueueEntry.status == QueueStatus.CALLED
    ).order_by(QueueEntry.position.desc()).first()

    current_token = None
    if current_entry and current_entry.booking:
        current_token = current_entry.booking.token_number

    return QueueEntryOut(
        id=queue_entry.id,
        booking_id=booking_id,
        centre_id=queue_entry.centre_id,
        position=queue_entry.position,
        status=queue_entry.status,
        estimated_wait_minutes=waiting_info["estimated_wait_minutes"] if waiting_info else None,
        called_at=queue_entry.called_at,
        service_started_at=queue_entry.service_started_at,
        token_number=booking.token_number,
        current_token=current_token,
        people_ahead=waiting_info["people_ahead"] if waiting_info else None,
        active_counters=waiting_info["active_counters"] if waiting_info else None
    )


# ─── PROCUREMENT ─────────────────────────────────────────────────────────────

@router.get("/procurement/{booking_id}", response_model=ProcurementOut)
def get_procurement(
    booking_id: int,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db)
):
    profile = get_farmer_profile_or_404(current_user, db)
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.farmer_id == profile.id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not booking.procurement:
        raise HTTPException(status_code=404, detail="Procurement not started yet")
    return booking.procurement


# ─── PAYMENT ─────────────────────────────────────────────────────────────────

@router.get("/payment/{booking_id}", response_model=PaymentOut)
def get_payment(
    booking_id: int,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db)
):
    profile = get_farmer_profile_or_404(current_user, db)
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.farmer_id == profile.id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not booking.procurement or not booking.procurement.payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return booking.procurement.payment


# ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

@router.get("/notifications", response_model=List[NotificationOut])
def get_notifications(
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db)
):
    return get_user_notifications(db, current_user.id)


@router.post("/notifications/mark-read")
def mark_read(
    data: NotificationMarkRead,
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db)
):
    mark_notifications_read(db, current_user.id, data.notification_ids)
    return {"success": True}


# ─── DASHBOARD ───────────────────────────────────────────────────────────────

@router.get("/dashboard")
def get_dashboard(
    current_user: User = Depends(require_farmer),
    db: Session = Depends(get_db)
):
    profile = get_farmer_profile_or_404(current_user, db)
    crops = db.query(FarmerCrop).filter(
        FarmerCrop.farmer_id == profile.id,
        FarmerCrop.is_active == True
    ).count()

    bookings = db.query(Booking).filter(Booking.farmer_id == profile.id).all()
    total_bookings = len(bookings)
    completed = sum(1 for b in bookings if b.status == BookingStatus.COMPLETED)
    active = [b for b in bookings if b.status == BookingStatus.CONFIRMED]

    unread_notifications = db.query(
        __import__("app.models.notification", fromlist=["Notification"]).Notification
    ).filter_by(user_id=current_user.id, is_read=False).count()

    return {
        "farmer_name": profile.full_name,
        "total_crops": crops,
        "total_bookings": total_bookings,
        "completed_procurements": completed,
        "active_bookings": len(active),
        "unread_notifications": unread_notifications,
        "kyc_verified": profile.kyc_verified
    }
