import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
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
      brand: initial?.brand ?? "",
      description: initial?.description ?? "",
      price: initial?.price ?? 0,
      cost: initial?.cost ?? 0,
      stockQuantity: initial?.stock_quantity ?? 0,
      reorderLevel: initial?.reorder_level ?? 10,
      unitOfMeasure: initial?.unit_of_measure ?? "unit",
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
        {categories.length === 0 && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-500">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              You don&apos;t have any categories yet. Every product needs one —{" "}
              <Link to="/categories" onClick={onClose} className="font-semibold underline">
                create a category first
              </Link>
              .
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <FormTextField name="sku" control={control} label="SKU" placeholder="RTL-10001" />
          <FormTextField name="name" control={control} label="Product Name" />
          <FormSelect name="categoryId" control={control} label="Category">
            <option value="" disabled>
              {categories.length === 0 ? "No categories available" : "Select a category"}
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </FormSelect>
          <FormTextField name="brand" control={control} label="Brand" />
          <FormTextField name="price" control={control} label="Unit Price" type="number" step="0.01" />
          <FormTextField name="cost" control={control} label="Cost Price" type="number" step="0.01" />
          <FormTextField name="stockQuantity" control={control} label="Initial Stock Quantity" type="number" />
          <FormTextField name="unitOfMeasure" control={control} label="Unit of Measure" placeholder="pcs, kg, box" />
          <FormTextField name="reorderLevel" control={control} label="Reorder Level" type="number" />
        </div>
        <FormTextArea name="description" control={control} label="Product Description" />

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
          <Button type="submit" isLoading={isSubmitting} disabled={categories.length === 0}>
            {initial ? "Save Changes" : "Create Product"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
