import { z } from "zod";
import { InventoryTransactionType } from "@prisma/client";

export const createInventoryTransactionSchema = z.object({
  productId: z.string().uuid(),
  type: z.nativeEnum(InventoryTransactionType),
  quantity: z.number().int().positive(),
  note: z.string().trim().max(500).optional(),
});

export type CreateInventoryTransactionInput = z.infer<typeof createInventoryTransactionSchema>;
