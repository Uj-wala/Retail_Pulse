from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import AuditAction, AuditLog


def list_user_activity(db: Session, company_id: str, user_id: str, limit: int = 10) -> list[AuditLog]:
    stmt = (
        select(AuditLog)
        .where(AuditLog.company_id == company_id, AuditLog.user_id == user_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    return db.scalars(stmt).all()


def write_audit_log(
    db: Session,
    action: AuditAction,
    company_id: str | None = None,
    user_id: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    details: str | None = None,
    entity_type: str | None = None,
) -> None:
    db.add(
        AuditLog(
            action=action,
            company_id=company_id,
            user_id=user_id,
            entity_type=entity_type,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )
