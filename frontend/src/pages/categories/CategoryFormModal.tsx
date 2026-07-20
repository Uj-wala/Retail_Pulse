import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Modal } from "../../components/common/Modal";
import { Button } from "../../components/common/Button";
import { FormTextField } from "../../components/forms/FormTextField";
import { FormTextArea } from "../../components/forms/FormTextArea";
import { categorySchema, type CategoryFormValues } from "./categorySchema";
import type { Category } from "../../types";

interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CategoryFormValues) => void;
  isSubmitting: boolean;
  initial?: Category | null;
}

export function CategoryFormModal({ open, onClose, onSubmit, isSubmitting, initial }: CategoryFormModalProps) {
  const { control, handleSubmit, reset } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    values: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      isActive: initial?.is_active ?? true,
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit Category" : "Add Category"}>
      <form
        onSubmit={handleSubmit((values) => {
          onSubmit(values);
          reset();
        })}
        noValidate
      >
        <FormTextField name="name" control={control} label="Category Name" />
        <FormTextArea name="description" control={control} label="Description" />

        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <label className="mb-4 flex items-center gap-2 text-sm font-medium text-content-muted">
              <input
                type="checkbox"
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
                className="h-4 w-4 rounded border-border/40 accent-brand-teal"
              />
              Active
            </label>
          )}
        />

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {initial ? "Save Changes" : "Create Category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
