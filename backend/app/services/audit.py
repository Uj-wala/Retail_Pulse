import json
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from ..models import AuditAction, AuditEntityType, AuditLog


def list_user_activity(db: Session, company_id: str, user_id: str, limit: int = 10) -> list[AuditLog]:
    stmt = (
        select(AuditLog)
        .where(AuditLog.company_id == company_id, AuditLog.user_id == user_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    return db.scalars(stmt).all()


def list_entity_activity(
    db: Session,
    company_id: str,
    entity_type: AuditEntityType,
    entity_id: str | None = None,
    page: int = 1,
    page_size: int = 100,
    actions: list[AuditAction] | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = None,
) -> tuple[list[AuditLog], int]:
    stmt = select(AuditLog).where(AuditLog.company_id == company_id, AuditLog.entity_type == entity_type)
    if entity_id:
        stmt = stmt.where(AuditLog.entity_id == entity_id)
    if actions:
        stmt = stmt.where(AuditLog.action.in_(actions))
    if date_from:
        stmt = stmt.where(AuditLog.created_at >= date_from)
    if date_to:
        stmt = stmt.where(AuditLog.created_at <= date_to)
    if search:
        stmt = stmt.where(AuditLog.details.ilike(f"%{search}%"))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = (
        stmt.options(joinedload(AuditLog.user))
        .order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return db.scalars(stmt).unique().all(), total


def write_audit_log(
    db: Session,
    action: AuditAction,
    company_id: str | None = None,
    user_id: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    details: str | None = None,
    entity_type: AuditEntityType | None = None,
    entity_id: str | None = None,
    previous_values: dict | None = None,
    new_values: dict | None = None,
) -> None:
    db.add(
        AuditLog(
            action=action,
            company_id=company_id,
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            previous_values=json.dumps(previous_values, default=str) if previous_values is not None else None,
            new_values=json.dumps(new_values, default=str) if new_values is not None else None,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )
