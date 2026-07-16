import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { categoryApi } from "../../api/categoryApi";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Spinner } from "../../components/common/Spinner";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../../components/tables/Table";
import { formatDate } from "../../services/formatters";
import { useAuth } from "../../hooks/useAuth";
import { useNotification } from "../../hooks/useNotification";
import { CategoryFormModal } from "./CategoryFormModal";
import type { Category } from "../../types";
import type { CategoryFormValues } from "./categorySchema";

const MANAGER_ROLES = ["COMPANY_ADMIN", "SUPER_ADMIN", "ANALYST"];

export function CategoriesPage() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const canManage = !!user && MANAGER_ROLES.includes(user.role);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: categoryApi.listCategories });

  const createMutation = useMutation({
    mutationFn: categoryApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      notify("Category created");
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoryFormValues }) =>
      categoryApi.updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      notify("Category updated");
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoryApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      notify("Category deleted");
      setDeleting(null);
    },
    onError: () => {
      notify("Could not delete category. Remove its products first.", "error");
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

      {categoriesQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : categories.length === 0 ? (
        <EmptyState icon={<Tags className="h-10 w-10" />} title="No categories yet" description="Create your first category to start organizing products." />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Description</TableHeaderCell>
              <TableHeaderCell>Created</TableHeaderCell>
              {canManage && <TableHeaderCell className="text-right">Actions</TableHeaderCell>}
            </tr>
          </TableHead>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-semibold">{category.name}</TableCell>
                <TableCell className="text-content-muted">{category.description || "—"}</TableCell>
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
                        className="rounded-lg p-2 text-content-muted hover:bg-surface-elevated hover:text-content"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(category)}
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
