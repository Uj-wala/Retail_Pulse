import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "../../components/common/Modal";
import { Button } from "../../components/common/Button";
import { FormTextField } from "../../components/forms/FormTextField";
import { FormSelect } from "../../components/forms/FormSelect";
import { formatCurrency } from "../../services/formatters";
import { saleSchema, type SaleFormInput, type SaleFormValues } from "./saleSchema";
import type { Product } from "../../types";

interface SaleFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: SaleFormValues) => void;
  isSubmitting: boolean;
  products: Product[];
}

export function SaleFormModal({ open, onClose, onSubmit, isSubmitting, products }: SaleFormModalProps) {
  const { control, handleSubmit, reset } = useForm<SaleFormInput, unknown, SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: { customerName: "", items: [{ productId: "", quantity: 1 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" });

  const total = (items ?? []).reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    return sum + (product ? product.price * (Number(item.quantity) || 0) : 0);
  }, 0);

  return (
    <Modal open={open} onClose={onClose} title="New Sale" maxWidthClassName="max-w-2xl">
      <form
        onSubmit={handleSubmit((values) => {
          onSubmit(values);
          reset();
        })}
        noValidate
      >
        <FormTextField name="customerName" control={control} label="Customer Name (optional)" />

        <p className="mb-2 text-sm font-medium text-content-muted">Items</p>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2">
              <div className="flex-1">
                <FormSelect name={`items.${index}.productId`} control={control} label="">
                  <option value="" disabled>
                    Select a product
                  </option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id} disabled={product.stock_quantity === 0}>
                      {product.name} — {formatCurrency(product.price)} ({product.stock_quantity} in stock)
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div className="w-24">
                <FormTextField name={`items.${index}.quantity`} control={control} label="" type="number" />
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                className="mt-1 rounded-lg p-2.5 text-content-muted hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => append({ productId: "", quantity: 1 })}
          className="mb-4 mt-1 flex items-center gap-1.5 text-sm font-semibold text-brand-teal hover:underline"
        >
          <Plus className="h-4 w-4" /> Add Item
        </button>

        <div className="mb-4 flex items-center justify-between rounded-lg bg-surface-elevated px-4 py-3">
          <span className="text-sm font-semibold text-content-muted">Total</span>
          <span className="text-lg font-extrabold text-brand-teal">{formatCurrency(total)}</span>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Complete Sale
          </Button>
        </div>
      </form>
    </Modal>
  );
}
