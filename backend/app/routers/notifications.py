from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserRole
from ..security import require_roles
from ..serializers import serialize_notification
from ..services import notification as notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])

can_view = require_roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)


@router.get("")
def list_notifications(current_user: User = Depends(can_view), db: Session = Depends(get_db)):
    notifications = notification_service.list_notifications(db, current_user.company_id)
    return {"notifications": [serialize_notification(n) for n in notifications], "total": len(notifications)}
