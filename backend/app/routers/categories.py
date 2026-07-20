from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserRole
from ..schemas import CategoryRequest, UpdateCategoryRequest
from ..security import get_current_user, require_roles
from ..serializers import serialize_category
from ..services import category as category_service

router = APIRouter(prefix="/categories", tags=["Categories"])

can_manage = require_roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)


@router.get(
    "",
    summary="List categories",
    description=(
        "Returns categories for the authenticated user's company, each annotated with its live product count. "
        "Supports name search, active/inactive filtering, and pagination."
    ),
)
def list_categories(
    search: str | None = Query(default=None, description="Case-insensitive substring match on category name"),
    isActive: bool | None = Query(default=None, description="Filter by Active (true) or Inactive (false) status"),
    page: int = Query(default=1, ge=1, description="1-indexed page number"),
    pageSize: int = Query(default=20, ge=1, le=200, description="Number of categories per page (max 200)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows, total = category_service.list_categories(db, current_user.company_id, search, isActive, page, pageSize)
    categories = [serialize_category(category, product_count) for category, product_count in rows]
    return {"categories": categories, "total": total, "page": page, "pageSize": pageSize}


@router.get("/{category_id}", summary="Get a category by id")
def get_category(category_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    category = category_service.get_category(db, current_user.company_id, category_id)
    return {"category": serialize_category(category)}


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create a category",
    description="Admin-only. Fails with 409 if a category with the same name (case-insensitive) already exists for the company.",
)
def create_category(payload: CategoryRequest, current_user: User = Depends(can_manage), db: Session = Depends(get_db)):
    category = category_service.create_category(db, current_user.company_id, current_user.id, payload)
    return {"category": serialize_category(category)}


@router.patch(
    "/{category_id}",
    summary="Update a category",
    description="Admin-only. Partial update — only supplied fields are changed.",
)
def update_category(
    category_id: str,
    payload: UpdateCategoryRequest,
    current_user: User = Depends(can_manage),
    db: Session = Depends(get_db),
):
    category = category_service.update_category(db, current_user.company_id, current_user.id, category_id, payload)
    return {"category": serialize_category(category)}


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a category",
    description="Admin-only. Fails with 409 if any products are still assigned to this category.",
)
def delete_category(category_id: str, current_user: User = Depends(can_manage), db: Session = Depends(get_db)):
    category_service.delete_category(db, current_user.company_id, current_user.id, category_id)
