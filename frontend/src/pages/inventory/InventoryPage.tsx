import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Boxes, History, Layers, PackageX, Pencil, Search, SlidersHorizontal } from "lucide-react";
import { inventoryApi, type InventoryFilters } from "../../api/inventoryApi";
import { categoryApi } from "../../api/categoryApi";
import { productApi } from "../../api/productApi";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { ChartCardSkeleton } from "../../components/common/ChartCardSkeleton";
import { Badge } from "../../components/common/Badge";
import { Pagination } from "../../components/common/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableSkeletonRows,
} from "../../components/tables/Table";
import { StatCard, StatCardSkeleton } from "../../components/dashboard/StatCard";
import { InventoryByCategoryChart } from "../../components/inventory/InventoryByCategoryChart";
import { StockStatusChart } from "../../components/inventory/StockStatusChart";
import { formatRelativeDateTime, formatDateTime } from "../../services/formatters";
import { useAuth } from "../../hooks/useAuth";
import { useNotification } from "../../hooks/useNotification";
import { StockAdjustmentModal } from "./StockAdjustmentModal";
import { ReorderLevelModal } from "./ReorderLevelModal";
import { MovementHistoryDrawer } from "./MovementHistoryDrawer";
import type { Inventory, StockStatus } from "../../types";
import type { ReorderLevelFormValues, StockAdjustmentFormValues } from "./inventorySchema";

const MANAGER_ROLES = ["COMPANY_ADMIN", "SUPER_ADMIN"];
const PAGE_SIZE = 10;
const TABLE_COLUMN_COUNT = 11;

const STATUS_TONE: Record<StockStatus, "success" | "warning" | "danger"> = {
  IN_STOCK: "success",
  LOW_STOCK: "warning",
  OUT_OF_STOCK: "danger",
};

const STATUS_LABEL: Record<StockStatus, string> = {
  IN_STOCK: "In Stock",
  LOW_STOCK: "Low Stock",
  OUT_OF_STOCK: "Out of Stock",
};

// "recent" is the one sort field whose bare form means descending (newest first),
// unlike every other field where the bare form means ascending — so direction is parameterized.
function sortDirFor(sort: string | undefined, field: string, bareIsDesc = false): "asc" | "desc" | undefined {
  if (sort === field) return bareIsDesc ? "desc" : "asc";
  if (sort === `-${field}`) return bareIsDesc ? "asc" : "desc";
  return undefined;
}

function toggleSort(sort: string | undefined, field: string): string {
  return sort === field ? `-${field}` : field;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;
  if (!error.response) {
    return "Inventory API is not reachable. Start the backend server and try again.";
  }
  const data = error.response.data as { detail?: unknown } | undefined;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    const firstMessage = (data.detail[0] as { msg?: unknown })?.msg;
    if (typeof firstMessage === "string") return firstMessage;
  }
  return fallback;
}

export function InventoryPage() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const canManage = !!user && MANAGER_ROLES.includes(user.role);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [stockStatus, setStockStatus] = useState<InventoryFilters["stockStatus"]>("");
  const [sort, setSort] = useState<InventoryFilters["sort"]>("recent");
  const [page, setPage] = useState(1);
  const [adjusting, setAdjusting] = useState<Inventory | null>(null);
  const [editingReorderLevel, setEditingReorderLevel] = useState<Inventory | null>(null);
  const [historyFor, setHistoryFor] = useState<Inventory | null>(null);

  const filters: InventoryFilters = {
    search: search || undefined,
    categoryId: categoryId || undefined,
    brand: brand || undefined,
    stockStatus: stockStatus || undefined,
    sort,
    page,
    pageSize: PAGE_SIZE,
  };

  const inventoryQuery = useQuery({
    queryKey: ["inventory", filters],
    queryFn: () => inventoryApi.listInventory(filters),
  });
  const summaryQuery = useQuery({ queryKey: ["inventory-summary"], queryFn: () => inventoryApi.getSummary() });
  const chartsQuery = useQuery({ queryKey: ["inventory-charts"], queryFn: () => inventoryApi.getCharts() });
  const categoriesQuery = useQuery({
    queryKey: ["categories", { pageSize: 200 }],
    queryFn: () => categoryApi.listCategories({ pageSize: 200 }),
  });
  const brandsQuery = useQuery({
    queryKey: ["product-brands"],
    queryFn: () => productApi.listBrands(),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: StockAdjustmentFormValues }) =>
      inventoryApi.adjustStock(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-charts"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      notify("Stock adjustment recorded");
      setAdjusting(null);
    },
    onError: (error) => {
      notify(getApiErrorMessage(error, "Could not record the adjustment. Please try again."), "error");
    },
  });

  const reorderLevelMutation = useMutation({
    mutationFn: ({ id, reorderLevel }: { id: string; reorderLevel: number }) =>
      inventoryApi.updateReorderLevel(id, reorderLevel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-charts"] });
      notify("Reorder level updated");
      setEditingReorderLevel(null);
    },
    onError: (error) => {
      notify(getApiErrorMessage(error, "Could not update the reorder level. Please try again."), "error");
    },
  });

  const items = inventoryQuery.data?.items ?? [];
  const categories = categoriesQuery.data?.categories ?? [];
  const brands = brandsQuery.data?.brands ?? [];
  const summary = summaryQuery.data;
  const charts = chartsQuery.data;
  const lastUpdatedAt = items.reduce<string | null>((latest, item) => {
    if (!item.updated_at) return latest;
    if (!latest || new Date(item.updated_at) > new Date(latest)) return item.updated_at;
    return latest;
  }, null);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Inventory</h1>
        <p className="text-sm text-content-muted">Monitor stock levels and record movements across your catalog.</p>
      </div>

      {summaryQuery.isLoading ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : summaryQuery.isError ? (
        <div className="mb-6">
          <ErrorState
            title="Couldn't load inventory summary"
            description={getApiErrorMessage(summaryQuery.error, "Please try again.")}
            onRetry={() => summaryQuery.refetch()}
          />
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Products" value={String(summary!.totalProducts)} icon={<Boxes className="h-5 w-5" />} />
          <StatCard label="Total Inventory Quantity" value={String(summary!.totalInventoryQuantity)} icon={<Layers className="h-5 w-5" />} />
          <StatCard label="Low Stock Products" value={String(summary!.lowStockProducts)} icon={<SlidersHorizontal className="h-5 w-5" />} />
          <StatCard label="Out of Stock Products" value={String(summary!.outOfStockProducts)} icon={<PackageX className="h-5 w-5" />} />
        </div>
      )}

      {chartsQuery.isLoading ? (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>
      ) : chartsQuery.isError ? (
        <div className="mb-6">
          <ErrorState
            title="Couldn't load inventory charts"
            description={getApiErrorMessage(chartsQuery.error, "Please try again.")}
            onRetry={() => chartsQuery.refetch()}
          />
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <InventoryByCategoryChart data={charts!.byCategory} />
          <StockStatusChart data={charts!.byStatus} />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-wrap sm:flex-row">
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by product name or SKU"
            className="w-full rounded-lg border border-border/25 bg-surface py-2.5 pl-9 pr-3.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
          />
        </div>
        <select
          value={categoryId}
          onChange={(event) => {
            setCategoryId(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-border/25 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          value={brand}
          onChange={(event) => {
            setBrand(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-border/25 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
        >
          <option value="">All Brands</option>
          {brands.map((brandName) => (
            <option key={brandName} value={brandName}>
              {brandName}
            </option>
          ))}
        </select>
        <select
          value={stockStatus}
          onChange={(event) => {
            setStockStatus(event.target.value as InventoryFilters["stockStatus"]);
            setPage(1);
          }}
          className="rounded-lg border border-border/25 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
        >
          <option value="">All Statuses</option>
          <option value="IN_STOCK">In Stock</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
        </select>
        <select
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as InventoryFilters["sort"]);
            setPage(1);
          }}
          className="rounded-lg border border-border/25 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
        >
          <option value="recent">Recently Updated</option>
          <option value="name">Name (A-Z)</option>
          <option value="-name">Name (Z-A)</option>
          <option value="-stock">Current Stock (High-Low)</option>
          <option value="stock">Current Stock (Low-High)</option>
        </select>
      </div>

      {inventoryQuery.isError ? (
        <ErrorState
          title="Unable to load inventory."
          description={getApiErrorMessage(inventoryQuery.error, "Please try again.")}
          onRetry={() => inventoryQuery.refetch()}
        />
      ) : !inventoryQuery.isLoading && items.length === 0 ? (
        <EmptyState icon={<Boxes className="h-10 w-10" />} title="No inventory records found" />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell
                sortDirection={sortDirFor(sort, "name")}
                onSort={() => {
                  setSort(toggleSort(sort, "name") as InventoryFilters["sort"]);
                  setPage(1);
                }}
              >
                Product
              </TableHeaderCell>
              <TableHeaderCell>SKU</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Brand</TableHeaderCell>
              <TableHeaderCell
                sortDirection={sortDirFor(sort, "stock")}
                onSort={() => {
                  setSort(toggleSort(sort, "stock") as InventoryFilters["sort"]);
                  setPage(1);
                }}
              >
                Current
              </TableHeaderCell>
              <TableHeaderCell>Reserved</TableHeaderCell>
              <TableHeaderCell>Available</TableHeaderCell>
              <TableHeaderCell>Reorder Level</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell
                sortDirection={sortDirFor(sort, "recent", true)}
                onSort={() => {
                  setSort(toggleSort(sort, "recent") as InventoryFilters["sort"]);
                  setPage(1);
                }}
              >
                Updated
              </TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {inventoryQuery.isLoading ? (
              <TableSkeletonRows rows={PAGE_SIZE} columns={TABLE_COLUMN_COUNT} />
            ) : (
              items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-semibold">{item.product_name}</TableCell>
                <TableCell className="font-mono text-xs text-content-muted">{item.sku}</TableCell>
                <TableCell className="text-content-muted">{item.category_name ?? "Uncategorized"}</TableCell>
                <TableCell className="text-content-muted">{item.brand ?? "-"}</TableCell>
                <TableCell>{item.current_stock}</TableCell>
                <TableCell className="text-content-muted">{item.reserved_stock}</TableCell>
                <TableCell>{item.available_stock}</TableCell>
                <TableCell className="text-content-muted">{item.reorder_level}</TableCell>
                <TableCell>
                  <Badge tone={STATUS_TONE[item.stock_status]}>{STATUS_LABEL[item.stock_status]}</Badge>
                </TableCell>
                <TableCell className="text-content-muted" title={formatDateTime(item.updated_at)}>
                  {formatRelativeDateTime(item.updated_at)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setHistoryFor(item)}
                      className="icon-action-btn rounded-lg p-2 text-content-muted hover:bg-surface-elevated hover:text-content"
                      title="View movement history"
                    >
                      <History className="h-4 w-4" />
                    </button>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setEditingReorderLevel(item)}
                        className="icon-action-btn rounded-lg p-2 text-content-muted hover:bg-surface-elevated hover:text-content"
                        title="Update reorder level"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setAdjusting(item)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-content-muted hover:bg-surface-elevated hover:text-content"
                      >
                        Adjust Stock
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {inventoryQuery.data && (
        <Pagination page={page} pageSize={inventoryQuery.data.pageSize} total={inventoryQuery.data.total} onPageChange={setPage} />
      )}

      {lastUpdatedAt && (
        <p className="mt-3 text-xs text-content-muted" title={formatDateTime(lastUpdatedAt)}>
          Last updated {formatRelativeDateTime(lastUpdatedAt)}
        </p>
      )}

      <StockAdjustmentModal
        open={!!adjusting}
        onClose={() => setAdjusting(null)}
        inventory={adjusting}
        isSubmitting={adjustMutation.isPending}
        onSubmit={(values) => adjusting && adjustMutation.mutate({ id: adjusting.id, payload: values })}
      />

      <MovementHistoryDrawer
        open={!!historyFor}
        onClose={() => setHistoryFor(null)}
        productId={historyFor?.product_id ?? null}
        productName={historyFor?.product_name}
      />

      <ReorderLevelModal
        open={!!editingReorderLevel}
        onClose={() => setEditingReorderLevel(null)}
        inventory={editingReorderLevel}
        isSubmitting={reorderLevelMutation.isPending}
        onSubmit={(values: ReorderLevelFormValues) =>
          editingReorderLevel && reorderLevelMutation.mutate({ id: editingReorderLevel.id, reorderLevel: values.reorderLevel })
        }
      />
    </div>
  );
}
