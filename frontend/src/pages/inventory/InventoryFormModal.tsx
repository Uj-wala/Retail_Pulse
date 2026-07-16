import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Modal } from "../../components/common/Modal";
import { Button } from "../../components/common/Button";
import { FormTextField } from "../../components/forms/FormTextField";
import { FormSelect } from "../../components/forms/FormSelect";
import {
  inventoryTransactionSchema,
  type InventoryTransactionFormInput,
  type InventoryTransactionFormValues,
} from "./inventorySchema";
import type { Product } from "../../types";

interface InventoryFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: InventoryTransactionFormValues) => void;
  isSubmitting: boolean;
  products: Product[];
}

export function InventoryFormModal({ open, onClose, onSubmit, isSubmitting, products }: InventoryFormModalProps) {
  const { control, handleSubmit, reset } = useForm<
    InventoryTransactionFormInput,
    unknown,
    InventoryTransactionFormValues
  >({
    resolver: zodResolver(inventoryTransactionSchema),
    defaultValues: { productId: "", type: "RESTOCK", quantity: 1, note: "" },
  });

  return (
    <Modal open={open} onClose={onClose} title="Record Inventory Movement">
      <form
        onSubmit={handleSubmit((values) => {
          onSubmit(values);
          reset();
        })}
        noValidate
      >
        <FormSelect name="productId" control={control} label="Product">
          <option value="" disabled>
            Select a product
          </option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.stock_quantity} in stock)
            </option>
          ))}
        </FormSelect>
        <FormSelect name="type" control={control} label="Movement Type">
          <option value="RESTOCK">Restock (add stock)</option>
          <option value="ADJUSTMENT">Adjustment (remove stock)</option>
        </FormSelect>
        <FormTextField name="quantity" control={control} label="Quantity" type="number" />
        <FormTextField name="note" control={control} label="Note (optional)" />

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Record Movement
          </Button>
        </div>
      </form>
    </Modal>
  );
}
