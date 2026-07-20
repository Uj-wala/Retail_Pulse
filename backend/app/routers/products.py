from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserRole
from ..schemas import ProductRequest, ProductStatusRequest, UpdateProductRequest
from ..security import get_current_user, require_roles
from ..serializers import serialize_product
from ..services import product as product_service

router = APIRouter(prefix="/products", tags=["Products"])

can_manage = require_roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)


@router.get(
    "",
    summary="List products",
    description=(
        "Returns products for the authenticated user's company. Supports search (name/SKU/brand), "
        "filtering (category, brand, status), sorting, and pagination."
    ),
)
def list_products(
    search: str | None = Query(default=None, description="Case-insensitive substring match on name, SKU, or brand"),
    categoryId: str | None = Query(default=None, description="Filter by category id"),
    isActive: bool | None = Query(default=None, description="Filter by Active (true) or Inactive (false) status"),
    brand: str | None = Query(default=None, description="Case-insensitive substring match on brand"),
    sort: str | None = Query(
        default=None,
        description="One of: name, -name, price, -price, recent (default: recent)",
    ),
    page: int = Query(default=1, ge=1, description="1-indexed page number"),
    pageSize: int = Query(default=20, ge=1, le=200, description="Number of products per page (max 200)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    products, total = product_service.list_products(
        db, current_user.company_id, search, categoryId, isActive, brand, sort, page, pageSize
    )
    return {"products": [serialize_product(p) for p in products], "total": total, "page": page, "pageSize": pageSize}


@router.get(
    "/low-stock",
    summary="List active products at or below their reorder level",
)
def list_low_stock(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    products = product_service.low_stock_products(db, current_user.company_id)
    return {"products": [serialize_product(p) for p in products]}


@router.get("/{product_id}", summary="Get a product by id")
def get_product(product_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = product_service.get_product(db, current_user.company_id, product_id)
    return {"product": serialize_product(product)}


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create a product",
    description=(
        "Admin-only. Category is required and must belong to the company. SKU must be unique within the company. "
        "Cost Price cannot exceed Unit Price. Product name must be unique within its category."
    ),
)
def create_product(payload: ProductRequest, current_user: User = Depends(can_manage), db: Session = Depends(get_db)):
    product = product_service.create_product(db, current_user.company_id, current_user.id, payload)
    return {"product": serialize_product(product)}


@router.patch(
    "/{product_id}",
    summary="Update a product",
    description="Admin-only. Partial update — only supplied fields are changed. Toggling isActive here is also logged as Activated/Deactivated.",
)
def update_product(
    product_id: str,
    payload: UpdateProductRequest,
    current_user: User = Depends(can_manage),
    db: Session = Depends(get_db),
):
    product = product_service.update_product(db, current_user.company_id, current_user.id, product_id, payload)
    return {"product": serialize_product(product)}


@router.patch(
    "/{product_id}/status",
    summary="Activate or deactivate a product",
    description=(
        "Admin-only. Inactive products are excluded from sales/transaction selection but remain visible in "
        "historical reports."
    ),
)
def set_product_status(
    product_id: str,
    payload: ProductStatusRequest,
    current_user: User = Depends(can_manage),
    db: Session = Depends(get_db),
):
    product = product_service.set_product_status(db, current_user.company_id, current_user.id, product_id, payload)
    return {"product": serialize_product(product)}


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a product",
)
def delete_product(product_id: str, current_user: User = Depends(can_manage), db: Session = Depends(get_db)):
    product_service.delete_product(db, current_user.company_id, current_user.id, product_id)
