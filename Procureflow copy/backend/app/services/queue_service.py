"""
Queue and waiting time calculation service.
Uses a simple formula:
  estimated_wait = ceil(people_ahead / active_counters) * avg_service_time
"""
import math
from sqlalchemy.orm import Session
from app.models.slot import QueueEntry, QueueStatus
from app.models.centre import ProcurementCentre, ProcurementCounter


def get_active_counters_count(db: Session, centre_id: int) -> int:
    count = db.query(ProcurementCounter).filter(
        ProcurementCounter.centre_id == centre_id,
        ProcurementCounter.is_active == True,
        ProcurementCounter.is_open == True
    ).count()
    return max(count, 1)  # at least 1 to avoid division by zero


def calculate_wait_time(people_ahead: int, active_counters: int, avg_service_time: int) -> int:
    """Returns estimated wait in minutes."""
    if people_ahead <= 0:
        return 0
    return math.ceil(people_ahead / active_counters) * avg_service_time


def get_queue_position(db: Session, booking_id: int) -> int:
    """Get how many people are ahead in the queue."""
    entry = db.query(QueueEntry).filter(QueueEntry.booking_id == booking_id).first()
    if not entry:
        return 0
    ahead = db.query(QueueEntry).filter(
        QueueEntry.centre_id == entry.centre_id,
        QueueEntry.status == QueueStatus.WAITING,
        QueueEntry.position < entry.position
    ).count()
    return ahead


def get_waiting_info(db: Session, booking_id: int):
    """Full waiting info for a booking."""
    entry = db.query(QueueEntry).filter(QueueEntry.booking_id == booking_id).first()
    if not entry:
        return None

    centre = db.query(ProcurementCentre).filter(
        ProcurementCentre.id == entry.centre_id
    ).first()

    # Count only WAITING entries ahead — not SKIPPED/COMPLETED
    people_ahead = db.query(QueueEntry).filter(
        QueueEntry.centre_id == entry.centre_id,
        QueueEntry.status == QueueStatus.WAITING,
        QueueEntry.position < entry.position
    ).count()

    # Also get this entry's actual rank among WAITING entries
    actual_rank = db.query(QueueEntry).filter(
        QueueEntry.centre_id == entry.centre_id,
        QueueEntry.status == QueueStatus.WAITING,
        QueueEntry.position <= entry.position
    ).count()

    active_counters = get_active_counters_count(db, entry.centre_id)
    avg_time = centre.avg_service_time_minutes if centre else 15
    wait_minutes = calculate_wait_time(people_ahead, active_counters, avg_time)

    return {
        "people_ahead": people_ahead,
        "active_counters": active_counters,
        "avg_service_time": avg_time,
        "estimated_wait_minutes": wait_minutes,
        "queue_position": actual_rank,
        "status": entry.status
    }


def get_next_queue_entry(db: Session, centre_id: int):
    """Get the next waiting entry for the operator to call."""
    entry = db.query(QueueEntry).filter(
        QueueEntry.centre_id == centre_id,
        QueueEntry.status == QueueStatus.WAITING
    ).order_by(QueueEntry.position.asc()).first()
    return entry


def get_crowd_level(booked: int, capacity: int) -> str:
    if capacity == 0:
        return "HIGH"
    ratio = booked / capacity
    if ratio < 0.4:
        return "LOW"
    elif ratio < 0.75:
        return "MEDIUM"
    return "HIGH"
