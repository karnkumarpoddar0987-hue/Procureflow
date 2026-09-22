"""
AI Recommendation Service (Rule-Based)
This is a rule-based recommendation engine. Not machine learning.
It selects the best slot based on crowd ratio, queue length, and estimated wait time.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.slot import Slot, SlotStatus, QueueEntry, QueueStatus
from app.models.centre import ProcurementCentre
from app.services.queue_service import get_active_counters_count, calculate_wait_time, get_crowd_level
import math


def score_slot(slot: Slot, db: Session) -> float:
    """
    Lower score = better slot.
    Factors:
      - crowd ratio (0-1): weight 0.4
      - queue length normalized: weight 0.4
      - slot availability: weight 0.2
    """
    if slot.max_capacity == 0:
        return 999.0

    crowd_ratio = slot.booked_count / slot.max_capacity
    available = slot.max_capacity - slot.booked_count

    # get active queue for this slot's centre
    queue_length = db.query(QueueEntry).filter(
        QueueEntry.centre_id == slot.centre_id,
        QueueEntry.status == QueueStatus.WAITING
    ).count()

    active_counters = get_active_counters_count(db, slot.centre_id)
    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == slot.centre_id).first()
    avg_time = centre.avg_service_time_minutes if centre else 15
    wait_minutes = calculate_wait_time(queue_length, active_counters, avg_time)

    # Normalize wait time (0-60 min range)
    wait_normalized = min(wait_minutes / 60.0, 1.0)

    score = (0.4 * crowd_ratio) + (0.4 * wait_normalized) + (0.2 * (1 - available / slot.max_capacity))
    return score


def get_recommended_slot(slots: List[Slot], db: Session) -> Optional[dict]:
    """
    Given a list of available slots, return the best recommendation.
    Returns slot with reasoning.
    """
    if not slots:
        return None

    scored = []
    for slot in slots:
        if slot.status != SlotStatus.AVAILABLE:
            continue
        available = slot.max_capacity - slot.booked_count
        if available <= 0:
            continue

        score = score_slot(slot, db)
        active_counters = get_active_counters_count(db, slot.centre_id)
        centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == slot.centre_id).first()
        avg_time = centre.avg_service_time_minutes if centre else 15

        # queue for this centre
        queue_length = db.query(QueueEntry).filter(
            QueueEntry.centre_id == slot.centre_id,
            QueueEntry.status == QueueStatus.WAITING
        ).count()

        wait_minutes = calculate_wait_time(queue_length, active_counters, avg_time)
        crowd_level = get_crowd_level(slot.booked_count, slot.max_capacity)

        scored.append({
            "slot": slot,
            "score": score,
            "crowd_level": crowd_level,
            "estimated_wait_minutes": wait_minutes,
            "available": available,
            "queue_length": queue_length,
            "active_counters": active_counters
        })

    if not scored:
        return None

    # Sort by score ascending (lower is better)
    scored.sort(key=lambda x: x["score"])
    best = scored[0]

    reasons = []
    if best["crowd_level"] == "LOW":
        reasons.append("Low crowd expected")
    elif best["crowd_level"] == "MEDIUM":
        reasons.append("Moderate crowd expected")

    if best["estimated_wait_minutes"] <= 15:
        reasons.append(f"Short estimated wait of {best['estimated_wait_minutes']} minutes")
    elif best["estimated_wait_minutes"] <= 30:
        reasons.append(f"Expected waiting time of {best['estimated_wait_minutes']} minutes")
    else:
        reasons.append(f"Estimated wait of {best['estimated_wait_minutes']} minutes")

    if best["available"] > best["slot"].max_capacity * 0.5:
        reasons.append("Good availability")

    reason_text = ". ".join(reasons) + "."

    return {
        "slot_id": best["slot"].id,
        "slot": best["slot"],
        "crowd_level": best["crowd_level"],
        "estimated_wait_minutes": best["estimated_wait_minutes"],
        "reason": reason_text,
        "score": round(best["score"], 3)
    }
