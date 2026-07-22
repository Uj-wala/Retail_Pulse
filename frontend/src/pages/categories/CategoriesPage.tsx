import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Plus, Pencil, Trash2, Tags, Search, AlertTriangle, RotateCw } from "lucide-react";
import { categoryApi } from "../../api/categoryApi";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Spinner } from "../../components/common/Spinner";
import { Badge } from "../../components/common/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../../components/tables/Table";
import { Pagination } from "../../components/common/Pagination";
import { formatDate } from "../../services/formatters";
import { useAuth } from "../../hooks/useAuth";
import { useNotification } from "../../hooks/useNotification";
import { CategoryFormModal } from "./CategoryFormModal";
import type { Category } from "../../types";
import type { CategoryFormValues } from "./categorySchema";

const MANAGER_ROLES = ["COMPANY_ADMIN", "SUPER_ADMIN"];
const PAGE_SIZE = 10;

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;
  if (!error.response) {
    return "Categories API is not reachable. Start the backend server and try again.";
  }
  const data = error.response.data as { detail?: unknown } | undefined;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    const firstMessage = (data.detail[0] as { msg?: unknown })?.msg;
    if (typeof firstMessage === "string") return firstMessage;
  }
  return fallback;
}

export function CategoriesPage() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const canManage = !!user && MANAGER_ROLES.includes(user.role);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ["categories", search, statusFilter, page],
    queryFn: () =>
      categoryApi.listCategories({
        search: search || undefined,
        isActive: statusFilter === "" ? undefined : statusFilter === "active",
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const createMutation = useMutation({
    mutationFn: categoryApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "summary"] });
      notify("Category created");
      setFormOpen(false);
    },
    onError: (error) => {
      notify(getApiErrorMessage(error, "Could not create category. Please try again."), "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoryFormValues }) =>
      categoryApi.updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "summary"] });
      notify("Category updated");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (error) => {
      notify(getApiErrorMessage(error, "Could not update category. Please try again."), "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoryApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "summary"] });
      notify("Category deleted");
      setDeleting(null);
    },
    onError: (error) => {
      notify(getApiErrorMessage(error, "Could not delete category. Remove its products first."), "error");
      setDeleting(null);
    },
  });

  const categories = categoriesQuery.data?.categories ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Categories</h1>
          <p className="text-sm text-content-muted">Organize your products into categories.</p>
        </div>
        {canManage && (
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add Category
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by category name"
            className="w-full rounded-lg border border-border/25 bg-surface py-2.5 pl-9 pr-3.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
          />
        </div>
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
      </div>

      {categoriesQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : categoriesQuery.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 py-16 text-center">
          <AlertTriangle className="h-10 w-10 text-red-500" />
          <div>
            <p className="font-semibold text-content">Could not load categories</p>
            <p className="text-sm text-content-muted">
              {getApiErrorMessage(categoriesQuery.error, "Something went wrong. Please try again.")}
            </p>
          </div>
          <Button variant="outline" icon={<RotateCw className="h-4 w-4" />} onClick={() => categoriesQuery.refetch()}>
            Retry
          </Button>
        </div>
      ) : categories.length === 0 ? (
        <EmptyState icon={<Tags className="h-10 w-10" />} title="No categories found" description="Create your first category to start organizing products." />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Description</TableHeaderCell>
              <TableHeaderCell>Products</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Created</TableHeaderCell>
              {canManage && <TableHeaderCell className="text-right">Actions</TableHeaderCell>}
            </tr>
          </TableHead>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-semibold">{category.name}</TableCell>
                <TableCell className="text-content-muted">{category.description || "—"}</TableCell>
                <TableCell className="text-content-muted">{category.product_count}</TableCell>
                <TableCell>
                  {category.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}
                </TableCell>
                <TableCell className="text-content-muted">{formatDate(category.created_at)}</TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(category);
                          setFormOpen(true);
                        }}
                        className="icon-action-btn rounded-lg p-2 text-content-muted hover:bg-surface-elevated hover:text-content"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(category)}
                        className="icon-action-btn rounded-lg p-2 text-content-muted hover:bg-red-500/10 hover:text-red-500"
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

      {categoriesQuery.data && (
        <Pagination
          page={page}
          pageSize={categoriesQuery.data.pageSize}
          total={categoriesQuery.data.total}
          onPageChange={setPage}
        />
      )}

      <CategoryFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        initial={editing}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={(values) => {
          if (editing) {
            updateMutation.mutate({ id: editing.id, payload: values });
          } else {
            createMutation.mutate(values);
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}
