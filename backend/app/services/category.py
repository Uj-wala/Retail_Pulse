from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import AuditAction, Category, Product
from ..schemas import CategoryRequest, UpdateCategoryRequest
from .audit import write_audit_log

ENTITY_TYPE = "CATEGORY"


def list_categories(
    db: Session,
    company_id: str,
    search: str | None = None,
    is_active: bool | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[tuple[Category, int]], int]:
    stmt = (
        select(Category, func.count(Product.id))
        .outerjoin(Product, Product.category_id == Category.id)
        .where(Category.company_id == company_id)
        .group_by(Category.id)
        .order_by(Category.name)
    )
    if is_active is not None:
        stmt = stmt.where(Category.is_active == is_active)
    if search:
        stmt = stmt.where(Category.name.ilike(f"%{search}%"))

    total = db.scalar(select(func.count()).select_from(stmt.with_only_columns(Category.id).subquery()))
    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).all()
    return rows, total or 0


def get_category(db: Session, company_id: str, category_id: str) -> Category:
    category = db.scalar(select(Category).where(Category.id == category_id, Category.company_id == company_id))
    if not category:
        raise HTTPException(404, "Category not found")
    return category


def _find_by_name(db: Session, company_id: str, name: str) -> Category | None:
    return db.scalar(
        select(Category).where(Category.company_id == company_id, func.lower(Category.name) == name.lower())
    )


def create_category(db: Session, company_id: str, user_id: str, payload: CategoryRequest) -> Category:
    if _find_by_name(db, company_id, payload.name):
        raise HTTPException(409, "A category with this name already exists")

    category = Category(
        company_id=company_id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        is_active=payload.isActive,
    )
    db.add(category)
    db.flush()
    write_audit_log(db, AuditAction.CATEGORY_CREATED, company_id, user_id, details=category.name, entity_type=ENTITY_TYPE)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, company_id: str, user_id: str, category_id: str, payload: UpdateCategoryRequest) -> Category:
    category = get_category(db, company_id, category_id)
    if payload.name is not None:
        existing = _find_by_name(db, company_id, payload.name)
        if existing and existing.id != category.id:
            raise HTTPException(409, "A category with this name already exists")
        category.name = payload.name.strip()
    if payload.description is not None:
        category.description = payload.description.strip()
    if payload.isActive is not None:
        category.is_active = payload.isActive
    write_audit_log(db, AuditAction.CATEGORY_UPDATED, company_id, user_id, details=category.name, entity_type=ENTITY_TYPE)
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, company_id: str, user_id: str, category_id: str) -> None:
    category = get_category(db, company_id, category_id)
    product_count = db.scalar(select(func.count(Product.id)).where(Product.category_id == category_id))
    if product_count:
        raise HTTPException(409, "Cannot delete a category that still has products assigned to it")
    name = category.name
    db.delete(category)
    write_audit_log(db, AuditAction.CATEGORY_DELETED, company_id, user_id, details=name, entity_type=ENTITY_TYPE)
    db.commit()
