from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import StockStatus, User, UserRole
from ..schemas import StockAdjustmentRequest, UpdateReorderLevelRequest
from ..security import get_current_user, require_roles
from ..serializers import serialize_inventory, serialize_inventory_movement
from ..services import inventory as inventory_service

router = APIRouter(prefix="/inventory", tags=["Inventory"])

can_view = require_roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.ANALYST)
can_manage = require_roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)


@router.get("")
def list_inventory(
    search: str | None = None,
    categoryId: str | None = None,
    brand: str | None = None,
    stockStatus: StockStatus | None = None,
    sort: str | None = None,
    page: int = 1,
    pageSize: int = 20,
    current_user: User = Depends(can_view),
    db: Session = Depends(get_db),
):
    items, total = inventory_service.list_inventory(
        db, current_user.company_id, search, categoryId, brand, stockStatus, sort, page, pageSize
    )
    return {
        "items": [serialize_inventory(item) for item in items],
        "total": total,
        "page": page,
        "pageSize": pageSize,
    }


@router.get("/summary")
def get_summary(current_user: User = Depends(can_view), db: Session = Depends(get_db)):
    return inventory_service.get_inventory_summary(db, current_user.company_id)


@router.get("/charts")
def get_charts(current_user: User = Depends(can_view), db: Session = Depends(get_db)):
    return inventory_service.get_inventory_charts(db, current_user.company_id)


@router.get("/movements")
def list_movements(
    productId: str | None = None,
    page: int = 1,
    pageSize: int = 20,
    current_user: User = Depends(can_view),
    db: Session = Depends(get_db),
):
    movements, total = inventory_service.list_movements(db, current_user.company_id, productId, page, pageSize)
    return {
        "items": [serialize_inventory_movement(movement) for movement in movements],
        "total": total,
        "page": page,
        "pageSize": pageSize,
    }


@router.post("/{inventory_id}/adjust")
def adjust_stock(
    inventory_id: str,
    payload: StockAdjustmentRequest,
    current_user: User = Depends(can_manage),
    db: Session = Depends(get_db),
):
    movement = inventory_service.adjust_stock(db, current_user.company_id, current_user.id, inventory_id, payload)
    return {"movement": serialize_inventory_movement(movement)}


@router.patch("/{inventory_id}/reorder-level")
def update_reorder_level(
    inventory_id: str,
    payload: UpdateReorderLevelRequest,
    current_user: User = Depends(can_manage),
    db: Session = Depends(get_db),
):
    record = inventory_service.update_reorder_level(db, current_user.company_id, current_user.id, inventory_id, payload.reorderLevel)
    return {"inventory": serialize_inventory(record)}
