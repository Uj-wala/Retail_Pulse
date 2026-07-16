from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserRole
from ..schemas import CategoryRequest, UpdateCategoryRequest
from ..security import get_current_user, require_roles
from ..serializers import serialize_category
from ..services import category as category_service

router = APIRouter(prefix="/categories", tags=["Categories"])

can_manage = require_roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.ANALYST)


@router.get("")
def list_categories(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    categories = category_service.list_categories(db, current_user.company_id)
    return {"categories": [serialize_category(c) for c in categories], "total": len(categories)}


@router.get("/{category_id}")
def get_category(category_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    category = category_service.get_category(db, current_user.company_id, category_id)
    return {"category": serialize_category(category)}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryRequest, current_user: User = Depends(can_manage), db: Session = Depends(get_db)):
    category = category_service.create_category(db, current_user.company_id, current_user.id, payload)
    return {"category": serialize_category(category)}


@router.patch("/{category_id}")
def update_category(
    category_id: str,
    payload: UpdateCategoryRequest,
    current_user: User = Depends(can_manage),
    db: Session = Depends(get_db),
):
    category = category_service.update_category(db, current_user.company_id, current_user.id, category_id, payload)
    return {"category": serialize_category(category)}


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: str, current_user: User = Depends(can_manage), db: Session = Depends(get_db)):
    category_service.delete_category(db, current_user.company_id, current_user.id, category_id)
