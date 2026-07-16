import { z } from "zod";

export const createProductSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).optional(),
  price: z.number().nonnegative(),
  cost: z.number().nonnegative().default(0),
  stockQuantity: z.number().int().nonnegative().default(0),
  reorderLevel: z.number().int().nonnegative().default(10),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
