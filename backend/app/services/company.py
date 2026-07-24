from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models import AuditAction, AuditEntityType, Company
from ..schemas import UpdateCompanyRequest
from .audit import write_audit_log


def get_company(db: Session, company_id: str) -> Company:
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(404, "Company not found")
    return company


def update_company(db: Session, company_id: str, user_id: str, payload: UpdateCompanyRequest) -> Company:
    company = get_company(db, company_id)
    for attr in ("name", "industry", "address", "phone"):
        value = getattr(payload, attr)
        if value is not None:
            setattr(company, attr, value.strip())
    write_audit_log(db, AuditAction.COMPANY_UPDATED, company_id, user_id, entity_type=AuditEntityType.COMPANY)
    db.commit()
    db.refresh(company)
    return company
