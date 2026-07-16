from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import AuditAction, Category, Product
from ..schemas import CategoryRequest, UpdateCategoryRequest
from .audit import write_audit_log


def list_categories(db: Session, company_id: str) -> list[Category]:
    return db.scalars(select(Category).where(Category.company_id == company_id).order_by(Category.name)).all()


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
    )
    db.add(category)
    db.flush()
    write_audit_log(db, AuditAction.CATEGORY_CREATED, company_id, user_id)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, company_id: str, user_id: str, category_id: str, payload: UpdateCategoryRequest) -> Category:
    category = get_category(db, company_id, category_id)
    if payload.name is not None:
        category.name = payload.name.strip()
    if payload.description is not None:
        category.description = payload.description.strip()
    write_audit_log(db, AuditAction.CATEGORY_UPDATED, company_id, user_id)
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, company_id: str, user_id: str, category_id: str) -> None:
    category = get_category(db, company_id, category_id)
    product_count = db.scalar(select(func.count(Product.id)).where(Product.category_id == category_id))
    if product_count:
        raise HTTPException(409, "Cannot delete a category that still has products assigned to it")
    db.delete(category)
    write_audit_log(db, AuditAction.CATEGORY_DELETED, company_id, user_id)
    db.commit()
