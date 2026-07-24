from sqlalchemy import desc, select
from sqlalchemy.orm import Session, joinedload

from ..models import Notification


def list_notifications(db: Session, company_id: str, limit: int = 50) -> list[Notification]:
    stmt = (
        select(Notification)
        .options(joinedload(Notification.product))
        .where(Notification.company_id == company_id)
        .order_by(desc(Notification.created_at))
        .limit(limit)
    )
    return db.scalars(stmt).all()
