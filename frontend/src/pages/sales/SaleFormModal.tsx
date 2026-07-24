import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "../../components/common/Modal";
import { Button } from "../../components/common/Button";
import { FormTextField } from "../../components/forms/FormTextField";
import { FormSelect } from "../../components/forms/FormSelect";
import { formatCurrency } from "../../services/formatters";
import { saleSchema, type SaleFormInput, type SaleFormValues } from "./saleSchema";
import type { Product, Sale } from "../../types";

interface SaleFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: SaleFormValues) => void;
  isSubmitting: boolean;
  products: Product[];
  initial?: Sale | null;
}

function toLocalInputDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function defaultValues(initial?: Sale | null): SaleFormInput {
  return {
    customerName: initial?.customer_name ?? "",
    saleDate: toLocalInputDate(initial?.sale_date),
    salesChannel: initial?.sales_channel ?? "RETAIL_STORE",
    paymentMethod: initial?.payment_method ?? "CASH",
    items: initial?.items.length
      ? initial.items.map((item) => ({
          productId: item.product_id,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          discount: item.discount,
          tax: item.tax,
        }))
      : [{ productId: "", quantity: 1, unitPrice: 0, discount: 0, tax: 0 }],
  };
}

export function SaleFormModal({ open, onClose, onSubmit, isSubmitting, products, initial }: SaleFormModalProps) {
  const { control, handleSubmit, reset, setValue } = useForm<SaleFormInput, unknown, SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: defaultValues(initial),
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" });

  useEffect(() => {
    if (open) reset(defaultValues(initial));
  }, [initial, open, reset]);

  useEffect(() => {
    (items ?? []).forEach((item, index) => {
      if (!item.productId || Number(item.unitPrice) > 0) return;
      const product = products.find((candidate) => candidate.id === item.productId);
      if (product) setValue(`items.${index}.unitPrice`, product.unit_price);
    });
  }, [items, products, setValue]);

  const total = (items ?? []).reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const discount = Number(item.discount) || 0;
    const tax = Number(item.tax) || 0;
    return sum + Math.max(unitPrice * quantity - discount + tax, 0);
  }, 0);

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit Sale" : "New Sale"} maxWidthClassName="max-w-4xl">
      <form
        onSubmit={handleSubmit((values) => {
          onSubmit(values);
        })}
        noValidate
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormTextField name="customerName" control={control} label="Customer Name" />
          <FormTextField name="saleDate" control={control} label="Sale Date & Time" type="datetime-local" />
          <FormSelect name="salesChannel" control={control} label="Sales Channel">
            <option value="RETAIL_STORE">Retail Store</option>
            <option value="ONLINE_STORE">Online Store</option>
            <option value="MARKETPLACE">Marketplace</option>
          </FormSelect>
          <FormSelect name="paymentMethod" control={control} label="Payment Method">
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </FormSelect>
        </div>

        <p className="mb-2 text-sm font-medium text-content-muted">Items</p>
        <div className="space-y-3">
          {fields.map((field, index) => {
            const selected = products.find((product) => product.id === items?.[index]?.productId);
            const quantity = Number(items?.[index]?.quantity) || 0;
            const availableStock = selected ? selected.stock_quantity + (initial?.items.find((item) => item.product_id === selected.id)?.quantity ?? 0) : 0;
            const exceedsStock = selected && quantity > availableStock;

            return (
              <div key={field.id} className="rounded-lg border border-border/15 p-3">
                <div className="grid gap-2 md:grid-cols-[minmax(180px,1.5fr)_90px_120px_110px_110px_40px]">
                  <FormSelect name={`items.${index}.productId`} control={control} label="Product">
                    <option value="" disabled>
                      Select a product
                    </option>
                    {products.map((product) => {
                      const editingQuantity = initial?.items.find((item) => item.product_id === product.id)?.quantity ?? 0;
                      const stock = product.stock_quantity + editingQuantity;
                      return (
                        <option
                          key={product.id}
                          value={product.id}
                          disabled={stock === 0}
                        >
                          {product.name} - {product.category_name ?? "Uncategorized"} - {stock} in stock
                        </option>
                      );
                    })}
                  </FormSelect>
                  <FormTextField name={`items.${index}.quantity`} control={control} label="Qty" type="number" min={1} />
                  <FormTextField name={`items.${index}.unitPrice`} control={control} label="Unit Price" type="number" min={0} step="0.01" />
                  <FormTextField name={`items.${index}.discount`} control={control} label="Discount" type="number" min={0} step="0.01" />
                  <FormTextField name={`items.${index}.tax`} control={control} label="Tax" type="number" min={0} step="0.01" />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className="mt-7 rounded-lg p-2.5 text-content-muted hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40"
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {selected && (
                  <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-content-muted">
                    <span>Category: {selected.category_name ?? "Uncategorized"}</span>
                    <span className={exceedsStock ? "font-semibold text-red-500" : ""}>
                      Available after edit context: {availableStock}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => append({ productId: "", quantity: 1, unitPrice: 0, discount: 0, tax: 0 })}
          className="mb-4 mt-3 flex items-center gap-1.5 text-sm font-semibold text-brand-teal hover:underline"
        >
          <Plus className="h-4 w-4" /> Add Item
        </button>

        <div className="mb-4 flex items-center justify-between rounded-lg bg-surface-elevated px-4 py-3">
          <span className="text-sm font-semibold text-content-muted">Total Amount</span>
          <span className="text-lg font-extrabold text-brand-teal">{formatCurrency(total)}</span>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {initial ? "Update Sale" : "Complete Sale"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
