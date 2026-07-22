import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Plus, Pencil, Trash2, Package, Search, Eye } from "lucide-react";
import { productApi, type ProductFilters, type ProductPayload } from "../../api/productApi";
import { categoryApi } from "../../api/categoryApi";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Spinner } from "../../components/common/Spinner";
import { Badge } from "../../components/common/Badge";
import { Pagination } from "../../components/common/Pagination";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../../components/tables/Table";
import { formatCurrency } from "../../services/formatters";
import { useAuth } from "../../hooks/useAuth";
import { useNotification } from "../../hooks/useNotification";
import { ProductFormModal } from "./ProductFormModal";
import { ProductDetailsDrawer } from "./ProductDetailsDrawer";
import type { Product } from "../../types";
import type { ProductFormValues } from "./productSchema";

const MANAGER_ROLES = ["COMPANY_ADMIN", "SUPER_ADMIN"];
const PAGE_SIZE = 10;

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;
  if (!error.response) {
    return "Products API is not reachable. Start the backend server and try again.";
  }
  const data = error.response.data as { detail?: unknown } | undefined;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    const firstMessage = (data.detail[0] as { msg?: unknown })?.msg;
    if (typeof firstMessage === "string") return firstMessage;
  }
  return fallback;
}

function toPayload(values: ProductFormValues): ProductPayload {
  return {
    categoryId: values.categoryId,
    sku: values.sku,
    name: values.name,
    brand: values.brand,
    description: values.description,
    price: values.price,
    cost: values.cost,
    stockQuantity: values.stockQuantity,
    reorderLevel: values.reorderLevel,
    unitOfMeasure: values.unitOfMeasure,
    isActive: values.isActive,
  };
}

export function ProductsPage() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const canManage = !!user && MANAGER_ROLES.includes(user.role);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [brand, setBrand] = useState("");
  const [sort, setSort] = useState<ProductFilters["sort"]>("recent");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [viewing, setViewing] = useState<Product | null>(null);

  const filters: ProductFilters = {
    search: search || undefined,
    categoryId: categoryId || undefined,
    isActive: statusFilter === "" ? undefined : statusFilter === "active",
    brand: brand || undefined,
    sort,
    page,
    pageSize: PAGE_SIZE,
  };

  const productsQuery = useQuery({
    queryKey: ["products", filters],
    queryFn: () => productApi.listProducts(filters),
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories", { pageSize: 200 }],
    queryFn: () => categoryApi.listCategories({ pageSize: 200 }),
  });

  const createMutation = useMutation({
    mutationFn: productApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "summary"] });
      notify("Product created");
      setFormOpen(false);
    },
    onError: (error) => {
      notify(getApiErrorMessage(error, "Could not create product. Please try again."), "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProductPayload }) =>
      productApi.updateProduct(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "summary"] });
      notify("Product updated");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (error) => {
      notify(getApiErrorMessage(error, "Could not update product. Please try again."), "error");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => productApi.setProductStatus(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "summary"] });
      notify(variables.isActive ? "Product activated" : "Product deactivated");
    },
    onError: (error) => {
      notify(getApiErrorMessage(error, "Could not update product status. Please try again."), "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "summary"] });
      notify("Product deleted");
      setDeleting(null);
    },
    onError: (error) => {
      notify(getApiErrorMessage(error, "Could not delete product. Please try again."), "error");
      setDeleting(null);
    },
  });

  const products = productsQuery.data?.products ?? [];
  const categories = categoriesQuery.data?.categories ?? [];

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold">Products</h1>
          <p className="text-sm text-content-muted">Manage your product catalog and pricing.</p>
        </div>
        {canManage && (
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add Product
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-wrap sm:flex-row">
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by name, SKU, or brand"
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
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-border/25 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <input
          value={brand}
          onChange={(event) => {
            setBrand(event.target.value);
            setPage(1);
          }}
          placeholder="Filter by brand"
          className="w-full rounded-lg border border-border/25 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 sm:w-40"
        />
        <select
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as ProductFilters["sort"]);
            setPage(1);
          }}
          className="rounded-lg border border-border/25 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
        >
          <option value="recent">Recently Added</option>
          <option value="name">Name (A-Z)</option>
          <option value="-name">Name (Z-A)</option>
          <option value="price">Price (Low-High)</option>
          <option value="-price">Price (High-Low)</option>
        </select>
      </div>

      {productsQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : products.length === 0 ? (
        <EmptyState icon={<Package className="h-10 w-10" />} title="No products found" description="Add your first product to start tracking inventory and sales." />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>SKU</TableHeaderCell>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Brand</TableHeaderCell>
              <TableHeaderCell>Price</TableHeaderCell>
              <TableHeaderCell>Stock</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-mono text-xs text-content-muted">{product.sku}</TableCell>
                <TableCell className="font-semibold">{product.name}</TableCell>
                <TableCell className="text-content-muted">{product.category_name ?? "Uncategorized"}</TableCell>
                <TableCell className="text-content-muted">{product.brand ?? "—"}</TableCell>
                <TableCell>{formatCurrency(product.price)}</TableCell>
                <TableCell>
                  <span className={product.low_stock ? "font-bold text-amber-500" : ""}>
                    {product.stock_quantity} {product.unit_of_measure}
                  </span>
                </TableCell>
                <TableCell>
                  {!product.is_active ? (
                    <Badge tone="neutral">Inactive</Badge>
                  ) : product.low_stock ? (
                    <Badge tone="warning">Low Stock</Badge>
                  ) : (
                    <Badge tone="success">In Stock</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setViewing(product)}
                      className="icon-action-btn rounded-lg p-2 text-content-muted hover:bg-surface-elevated hover:text-content"
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            statusMutation.mutate({ id: product.id, isActive: !product.is_active })
                          }
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-content-muted hover:bg-surface-elevated hover:text-content"
                          title={product.is_active ? "Deactivate" : "Activate"}
                        >
                          {product.is_active ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(product);
                            setFormOpen(true);
                          }}
                          className="icon-action-btn rounded-lg p-2 text-content-muted hover:bg-surface-elevated hover:text-content"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(product)}
                          className="icon-action-btn rounded-lg p-2 text-content-muted hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {productsQuery.data && (
        <Pagination
          page={page}
          pageSize={productsQuery.data.pageSize}
          total={productsQuery.data.total}
          onPageChange={setPage}
        />
      )}

      <ProductDetailsDrawer open={!!viewing} onClose={() => setViewing(null)} product={viewing} />

      <ProductFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        initial={editing}
        categories={categories}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={(values) => {
          const payload = toPayload(values);
          if (editing) {
            updateMutation.mutate({ id: editing.id, payload });
          } else {
            createMutation.mutate(payload);
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}
