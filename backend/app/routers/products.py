from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserRole
from ..schemas import ProductRequest, UpdateProductRequest
from ..security import get_current_user, require_roles
from ..serializers import serialize_product
from ..services import product as product_service

router = APIRouter(prefix="/products", tags=["Products"])

can_manage = require_roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.ANALYST)


@router.get("")
def list_products(
    search: str | None = None,
    categoryId: str | None = None,
    isActive: bool | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    products = product_service.list_products(db, current_user.company_id, search, categoryId, isActive)
    return {"products": [serialize_product(p) for p in products], "total": len(products)}


@router.get("/low-stock")
def list_low_stock(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    products = product_service.low_stock_products(db, current_user.company_id)
    return {"products": [serialize_product(p) for p in products]}


@router.get("/{product_id}")
def get_product(product_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = product_service.get_product(db, current_user.company_id, product_id)
    return {"product": serialize_product(product)}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductRequest, current_user: User = Depends(can_manage), db: Session = Depends(get_db)):
    product = product_service.create_product(db, current_user.company_id, current_user.id, payload)
    return {"product": serialize_product(product)}


@router.patch("/{product_id}")
def update_product(
    product_id: str,
    payload: UpdateProductRequest,
    current_user: User = Depends(can_manage),
    db: Session = Depends(get_db),
):
    product = product_service.update_product(db, current_user.company_id, current_user.id, product_id, payload)
    return {"product": serialize_product(product)}


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: str, current_user: User = Depends(can_manage), db: Session = Depends(get_db)):
    product_service.delete_product(db, current_user.company_id, current_user.id, product_id)
