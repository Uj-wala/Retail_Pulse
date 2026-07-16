import { z } from "zod";

export const saleSchema = z.object({
  customerName: z.string().max(255).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Select a product"),
        quantity: z.coerce.number().int().positive("Quantity must be greater than zero"),
      }),
    )
    .min(1, "Add at least one item"),
});

export type SaleFormInput = z.input<typeof saleSchema>;
export type SaleFormValues = z.output<typeof saleSchema>;
