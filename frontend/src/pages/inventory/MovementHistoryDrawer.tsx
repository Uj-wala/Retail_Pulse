import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { inventoryApi } from "../../api/inventoryApi";
import { Drawer } from "../../components/common/Drawer";
import { Spinner } from "../../components/common/Spinner";
import { EmptyState } from "../../components/common/EmptyState";
import { Badge } from "../../components/common/Badge";
import { formatDateTime } from "../../services/formatters";
import type { InventoryMovementType } from "../../types";

const MOVEMENT_TONE: Record<InventoryMovementType, "success" | "warning" | "neutral" | "danger"> = {
  SALE: "neutral",
  STOCK_ADDITION: "success",
  STOCK_REMOVAL: "danger",
  MANUAL_ADJUSTMENT: "warning",
};

const MOVEMENT_LABEL: Record<InventoryMovementType, string> = {
  SALE: "Sale",
  STOCK_ADDITION: "Stock Addition",
  STOCK_REMOVAL: "Stock Removal",
  MANUAL_ADJUSTMENT: "Manual Adjustment",
};

interface MovementHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  productId: string | null;
  productName?: string | null;
}

export function MovementHistoryDrawer({ open, onClose, productId, productName }: MovementHistoryDrawerProps) {
  const movementsQuery = useQuery({
    queryKey: ["inventory-movements", productId],
    queryFn: () => inventoryApi.listMovements({ productId: productId ?? undefined, pageSize: 50 }),
    enabled: open && !!productId,
  });

  const movements = movementsQuery.data?.items ?? [];

  return (
    <Drawer open={open} onClose={onClose} title={productName ? `Movement History — ${productName}` : "Movement History"}>
      {movementsQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={24} />
        </div>
      ) : movements.length === 0 ? (
        <EmptyState icon={<History className="h-8 w-8" />} title="No movements recorded" />
      ) : (
        <ul className="space-y-3">
          {movements.map((movement) => (
            <li key={movement.id} className="rounded-lg border border-border/20 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <Badge tone={MOVEMENT_TONE[movement.movement_type]}>{MOVEMENT_LABEL[movement.movement_type]}</Badge>
                <span className={`text-sm font-bold ${movement.quantity_changed >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {movement.quantity_changed >= 0 ? "+" : ""}
                  {movement.quantity_changed}
                </span>
              </div>
              <p className="text-xs text-content-muted">
                {movement.previous_quantity} → {movement.updated_quantity} units
              </p>
              <p className="mt-1 text-sm">{movement.reason}</p>
              {movement.remarks && <p className="text-xs text-content-muted">{movement.remarks}</p>}
              <p className="mt-1 text-xs text-content-muted">
                {movement.performed_by_name ?? "System"} · {formatDateTime(movement.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
