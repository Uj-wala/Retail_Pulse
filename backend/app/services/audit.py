from sqlalchemy.orm import Session

from ..models import AuditAction, AuditLog


def write_audit_log(
    db: Session,
    action: AuditAction,
    company_id: str | None = None,
    user_id: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    db.add(
        AuditLog(
            action=action,
            company_id=company_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )
