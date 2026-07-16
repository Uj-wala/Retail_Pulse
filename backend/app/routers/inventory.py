from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserRole
from ..schemas import InventoryTransactionRequest
from ..security import get_current_user, require_roles
from ..serializers import serialize_inventory_transaction
from ..services import inventory as inventory_service

router = APIRouter(prefix="/inventory", tags=["Inventory"])

can_manage = require_roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.ANALYST)


@router.get("")
def list_transactions(
    productId: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transactions = inventory_service.list_inventory_transactions(db, current_user.company_id, productId)
    return {"transactions": [serialize_inventory_transaction(t) for t in transactions], "total": len(transactions)}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: InventoryTransactionRequest,
    current_user: User = Depends(can_manage),
    db: Session = Depends(get_db),
):
    transaction = inventory_service.record_inventory_transaction(db, current_user.company_id, current_user.id, payload)
    return {"transaction": serialize_inventory_transaction(transaction)}
