import { z } from "zod";

export const createSaleSchema = z.object({
  customerName: z.string().trim().max(255).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1, "At least one item is required"),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
