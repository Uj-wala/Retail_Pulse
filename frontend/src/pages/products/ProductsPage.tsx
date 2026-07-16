import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Package, Search } from "lucide-react";
import { productApi, type ProductPayload } from "../../api/productApi";
import { categoryApi } from "../../api/categoryApi";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Spinner } from "../../components/common/Spinner";
import { Badge } from "../../components/common/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../../components/tables/Table";
import { formatCurrency } from "../../services/formatters";
import { useAuth } from "../../hooks/useAuth";
import { useNotification } from "../../hooks/useNotification";
import { ProductFormModal } from "./ProductFormModal";
import type { Product } from "../../types";
import type { ProductFormValues } from "./productSchema";

const MANAGER_ROLES = ["COMPANY_ADMIN", "SUPER_ADMIN", "ANALYST"];

function toPayload(values: ProductFormValues): ProductPayload {
  return {
    categoryId: values.categoryId || null,
    sku: values.sku,
    name: values.name,
    description: values.description,
    price: values.price,
    cost: values.cost,
    stockQuantity: values.stockQuantity,
    reorderLevel: values.reorderLevel,
    isActive: values.isActive,
  };
}

export function ProductsPage() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const canManage = !!user && MANAGER_ROLES.includes(user.role);

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const productsQuery = useQuery({
    queryKey: ["products", search],
    queryFn: () => productApi.listProducts({ search: search || undefined }),
  });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: categoryApi.listCategories });

  const createMutation = useMutation({
    mutationFn: productApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notify("Product created");
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProductPayload }) =>
      productApi.updateProduct(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notify("Product updated");
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notify("Product deleted");
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

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or SKU"
          className="w-full rounded-lg border border-border/25 bg-surface py-2.5 pl-9 pr-3.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
        />
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
              <TableHeaderCell>Price</TableHeaderCell>
              <TableHeaderCell>Stock</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              {canManage && <TableHeaderCell className="text-right">Actions</TableHeaderCell>}
            </tr>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-mono text-xs text-content-muted">{product.sku}</TableCell>
                <TableCell className="font-semibold">{product.name}</TableCell>
                <TableCell className="text-content-muted">{product.category_name ?? "Uncategorized"}</TableCell>
                <TableCell>{formatCurrency(product.price)}</TableCell>
                <TableCell>
                  <span className={product.low_stock ? "font-bold text-amber-500" : ""}>
                    {product.stock_quantity}
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
                {canManage && (
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(product);
                          setFormOpen(true);
                        }}
                        className="rounded-lg p-2 text-content-muted hover:bg-surface-elevated hover:text-content"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(product)}
                        className="rounded-lg p-2 text-content-muted hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

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
