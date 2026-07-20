import { z } from "zod";

export const productSchema = z
  .object({
    categoryId: z.string().min(1, "Category is required"),
    sku: z.string().min(1, "SKU is required").max(64),
    name: z.string().min(1, "Name is required").max(255),
    brand: z.string().max(100).optional().or(z.literal("")),
    description: z.string().max(2000).optional().or(z.literal("")),
    price: z.coerce.number().positive("Unit price must be greater than zero"),
    cost: z.coerce.number().nonnegative("Cost price must be zero or more"),
    stockQuantity: z.coerce.number().int().nonnegative("Stock must be zero or more"),
    reorderLevel: z.coerce.number().int().nonnegative("Reorder level must be zero or more"),
    unitOfMeasure: z.string().min(1, "Unit of measure is required").max(32),
    isActive: z.boolean(),
  })
  .refine((values) => values.cost <= values.price, {
    message: "Cost Price cannot exceed Unit Price",
    path: ["cost"],
  });

export type ProductFormInput = z.input<typeof productSchema>;
export type ProductFormValues = z.output<typeof productSchema>;
