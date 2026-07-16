import { z } from "zod";

export const inventoryTransactionSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  type: z.enum(["RESTOCK", "ADJUSTMENT"]),
  quantity: z.coerce.number().int().positive("Quantity must be greater than zero"),
  note: z.string().max(500).optional().or(z.literal("")),
});

export type InventoryTransactionFormInput = z.input<typeof inventoryTransactionSchema>;
export type InventoryTransactionFormValues = z.output<typeof inventoryTransactionSchema>;
