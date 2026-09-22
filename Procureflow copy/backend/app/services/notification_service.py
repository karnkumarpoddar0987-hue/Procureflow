from sqlalchemy.orm import Session
from app.models.notification import Notification


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "INFO",
    related_booking_id: int = None
):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        related_booking_id=related_booking_id
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def get_user_notifications(db: Session, user_id: int, unread_only: bool = False):
    query = db.query(Notification).filter(Notification.user_id == user_id)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    return query.order_by(Notification.created_at.desc()).limit(50).all()


def mark_notifications_read(db: Session, user_id: int, notification_ids: list):
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.id.in_(notification_ids)
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
