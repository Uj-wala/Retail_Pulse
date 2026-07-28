import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "../../components/common/Modal";
import { Button } from "../../components/common/Button";
import { FormTextField } from "../../components/forms/FormTextField";
import { reorderLevelSchema, type ReorderLevelFormInput, type ReorderLevelFormValues } from "./inventorySchema";
import type { Inventory } from "../../types";

interface ReorderLevelModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ReorderLevelFormValues) => void;
  isSubmitting: boolean;
  inventory: Inventory | null;
}

export function ReorderLevelModal({ open, onClose, onSubmit, isSubmitting, inventory }: ReorderLevelModalProps) {
  const { control, handleSubmit, reset } = useForm<ReorderLevelFormInput, unknown, ReorderLevelFormValues>({
    resolver: zodResolver(reorderLevelSchema),
    defaultValues: { reorderLevel: String(inventory?.reorder_level ?? 0) },
  });

  useEffect(() => {
    if (open) reset({ reorderLevel: String(inventory?.reorder_level ?? 0) });
  }, [open, inventory, reset]);

  return (
    <Modal open={open} onClose={onClose} title="Update Reorder Level">
      {inventory && (
        <div className="mb-4 rounded-lg border border-border/20 bg-surface-elevated/50 px-3.5 py-2.5 text-sm">
          <p className="font-semibold text-content">{inventory.product_name}</p>
          <p className="mt-0.5 text-content-muted">
            Current Reorder Level: <span className="font-semibold text-content">{inventory.reorder_level}</span>
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit((values) => onSubmit(values))} noValidate aria-label="Update reorder level form">
        <FormTextField
          name="reorderLevel"
          control={control}
          label="New Reorder Level"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          disabled={isSubmitting}
          autoFocus
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
