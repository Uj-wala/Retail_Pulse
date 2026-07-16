import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Modal } from "../../components/common/Modal";
import { Button } from "../../components/common/Button";
import { FormTextField } from "../../components/forms/FormTextField";
import { FormTextArea } from "../../components/forms/FormTextArea";
import { FormSelect } from "../../components/forms/FormSelect";
import { productSchema, type ProductFormInput, type ProductFormValues } from "./productSchema";
import type { Category, Product } from "../../types";

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ProductFormValues) => void;
  isSubmitting: boolean;
  categories: Category[];
  initial?: Product | null;
}

export function ProductFormModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  categories,
  initial,
}: ProductFormModalProps) {
  const { control, handleSubmit, reset } = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    values: {
      categoryId: initial?.category_id ?? "",
      sku: initial?.sku ?? "",
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      price: initial?.price ?? 0,
      cost: initial?.cost ?? 0,
      stockQuantity: initial?.stock_quantity ?? 0,
      reorderLevel: initial?.reorder_level ?? 10,
      isActive: initial?.is_active ?? true,
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit Product" : "Add Product"} maxWidthClassName="max-w-2xl">
      <form
        onSubmit={handleSubmit((values) => {
          onSubmit(values);
          reset();
        })}
        noValidate
      >
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <FormTextField name="sku" control={control} label="SKU" />
          <FormTextField name="name" control={control} label="Name" />
          <FormSelect name="categoryId" control={control} label="Category">
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </FormSelect>
          <FormTextField name="price" control={control} label="Price" type="number" step="0.01" />
          <FormTextField name="cost" control={control} label="Cost" type="number" step="0.01" />
          <FormTextField name="stockQuantity" control={control} label="Stock Quantity" type="number" />
          <FormTextField name="reorderLevel" control={control} label="Reorder Level" type="number" />
        </div>
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
              Active (available for sale)
            </label>
          )}
        />

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {initial ? "Save Changes" : "Create Product"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
