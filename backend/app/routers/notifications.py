from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserRole
from ..schemas import NotificationReadRequest
from ..security import require_roles
from ..serializers import serialize_notification
from ..services import notification as notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])

can_view = require_roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)


@router.get("")
def list_notifications(
    unreadOnly: bool = Query(default=False),
    current_user: User = Depends(can_view),
    db: Session = Depends(get_db),
):
    notifications = notification_service.list_notifications(db, current_user.company_id, unread_only=unreadOnly)
    unread_count = notification_service.count_unread(db, current_user.company_id)
    return {
        "notifications": [serialize_notification(n) for n in notifications],
        "total": len(notifications),
        "unreadCount": unread_count,
    }


@router.patch("/{notification_id}/read", summary="Mark a notification as read or unread")
def set_notification_read(
    notification_id: str,
    payload: NotificationReadRequest,
    current_user: User = Depends(can_view),
    db: Session = Depends(get_db),
):
    notification = notification_service.set_notification_read(db, current_user.company_id, notification_id, payload.isRead)
    db.commit()
    return {"notification": serialize_notification(notification)}


@router.patch("/read-all", summary="Mark all notifications as read")
def mark_all_read(current_user: User = Depends(can_view), db: Session = Depends(get_db)):
    updated = notification_service.mark_all_read(db, current_user.company_id)
    db.commit()
    return {"updated": updated}
