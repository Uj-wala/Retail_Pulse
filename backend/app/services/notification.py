from fastapi import HTTPException
from sqlalchemy import desc, func, select, update
from sqlalchemy.orm import Session, joinedload

from ..models import Notification


def list_notifications(db: Session, company_id: str, limit: int = 50, unread_only: bool = False) -> list[Notification]:
    stmt = (
        select(Notification)
        .options(joinedload(Notification.product), joinedload(Notification.customer))
        .where(Notification.company_id == company_id)
    )
    if unread_only:
        stmt = stmt.where(Notification.is_read.is_(False))
    stmt = stmt.order_by(desc(Notification.created_at)).limit(limit)
    return db.scalars(stmt).all()


def count_unread(db: Session, company_id: str) -> int:
    stmt = select(func.count()).select_from(Notification).where(
        Notification.company_id == company_id, Notification.is_read.is_(False)
    )
    return db.scalar(stmt) or 0


def set_notification_read(db: Session, company_id: str, notification_id: str, is_read: bool) -> Notification:
    notification = db.scalar(
        select(Notification)
        .options(joinedload(Notification.product), joinedload(Notification.customer))
        .where(Notification.id == notification_id, Notification.company_id == company_id)
    )
    if not notification:
        raise HTTPException(404, "Notification not found")
    notification.is_read = is_read
    return notification


def mark_all_read(db: Session, company_id: str) -> int:
    result = db.execute(
        update(Notification)
        .where(Notification.company_id == company_id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    return result.rowcount or 0
