import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Modal } from "../../components/common/Modal";
import { Button } from "../../components/common/Button";
import { FormTextField } from "../../components/forms/FormTextField";
import { FormSelect } from "../../components/forms/FormSelect";
import { FormTextArea } from "../../components/forms/FormTextArea";
import {
  stockAdjustmentSchema,
  type StockAdjustmentFormInput,
  type StockAdjustmentFormValues,
} from "./inventorySchema";
import type { Inventory } from "../../types";

interface StockAdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: StockAdjustmentFormValues) => void;
  isSubmitting: boolean;
  inventory: Inventory | null;
}

const DEFAULT_VALUES: StockAdjustmentFormInput = {
  adjustmentType: "STOCK_IN",
  direction: "INCREASE",
  quantity: 1,
  reason: "",
  remarks: "",
};

export function StockAdjustmentModal({ open, onClose, onSubmit, isSubmitting, inventory }: StockAdjustmentModalProps) {
  const { control, handleSubmit, reset } = useForm<StockAdjustmentFormInput, unknown, StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) reset(DEFAULT_VALUES);
  }, [open, reset]);

  const adjustmentType = useWatch({ control, name: "adjustmentType" });

  return (
    <Modal open={open} onClose={onClose} title="Adjust Stock">
      {inventory && (
        <p className="mb-4 text-sm text-content-muted">
          <span className="font-semibold text-content">{inventory.product_name}</span> —{" "}
          {inventory.available_stock} unit{inventory.available_stock === 1 ? "" : "s"} available
        </p>
      )}
      <form onSubmit={handleSubmit((values) => onSubmit(values))} noValidate>
        <FormSelect name="adjustmentType" control={control} label="Adjustment Type">
          <option value="STOCK_IN">Stock In</option>
          <option value="STOCK_OUT">Stock Out</option>
          <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
        </FormSelect>
        {adjustmentType === "MANUAL_ADJUSTMENT" && (
          <FormSelect name="direction" control={control} label="Direction">
            <option value="INCREASE">Increase</option>
            <option value="DECREASE">Decrease</option>
          </FormSelect>
        )}
        <FormTextField name="quantity" control={control} label="Quantity" type="number" min={1} />
        <FormTextField name="reason" control={control} label="Reason" placeholder="e.g. Purchase order #4521" />
        <FormTextArea name="remarks" control={control} label="Remarks (optional)" />

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
