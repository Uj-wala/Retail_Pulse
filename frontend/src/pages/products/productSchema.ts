import { z } from "zod";

export const productSchema = z.object({
  categoryId: z.string(),
  sku: z.string().min(1, "SKU is required").max(64),
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(2000).optional().or(z.literal("")),
  price: z.coerce.number().nonnegative("Price must be zero or more"),
  cost: z.coerce.number().nonnegative("Cost must be zero or more"),
  stockQuantity: z.coerce.number().int().nonnegative("Stock must be zero or more"),
  reorderLevel: z.coerce.number().int().nonnegative("Reorder level must be zero or more"),
  isActive: z.boolean(),
});

export type ProductFormInput = z.input<typeof productSchema>;
export type ProductFormValues = z.output<typeof productSchema>;
