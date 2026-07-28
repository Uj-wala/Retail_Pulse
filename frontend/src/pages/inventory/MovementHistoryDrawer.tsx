import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { History } from "lucide-react";
import { inventoryApi } from "../../api/inventoryApi";
import { Drawer } from "../../components/common/Drawer";
import { Spinner } from "../../components/common/Spinner";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { Badge } from "../../components/common/Badge";
import { Pagination } from "../../components/common/Pagination";
import { formatDateTime } from "../../services/formatters";
import type { InventoryMovementType } from "../../types";

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;
  if (!error.response) {
    return "Inventory API is not reachable. Start the backend server and try again.";
  }
  const data = error.response.data as { detail?: unknown } | undefined;
  if (typeof data?.detail === "string") return data.detail;
  return fallback;
}

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    if (open) setPage(1);
  }, [open, productId]);

  const movementsQuery = useQuery({
    queryKey: ["inventory-movements", productId, page, pageSize],
    queryFn: () => inventoryApi.listMovements({ productId: productId ?? undefined, page, pageSize }),
    enabled: open && !!productId,
  });

  const movements = movementsQuery.data?.items ?? [];

  return (
    <Drawer open={open} onClose={onClose} title={productName ? `Movement History — ${productName}` : "Movement History"}>
      {movementsQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={24} />
        </div>
      ) : movementsQuery.isError ? (
        <ErrorState
          title="Unable to load movement history."
          description={getApiErrorMessage(movementsQuery.error, "Please try again.")}
          onRetry={() => movementsQuery.refetch()}
        />
      ) : movements.length === 0 ? (
        <EmptyState icon={<History className="h-8 w-8" />} title="No movements recorded" />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-end gap-2 text-xs text-content-muted">
            <label htmlFor="movement-page-size">Rows per page</label>
            <select
              id="movement-page-size"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-border/25 bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
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
          <Pagination
            page={page}
            pageSize={movementsQuery.data?.pageSize ?? pageSize}
            total={movementsQuery.data?.total ?? 0}
            onPageChange={setPage}
          />
        </>
      )}
    </Drawer>
  );
}
