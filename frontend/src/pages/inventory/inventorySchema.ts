import { z } from "zod";

export const stockAdjustmentSchema = z
  .object({
    adjustmentType: z.enum(["STOCK_IN", "STOCK_OUT", "MANUAL_ADJUSTMENT"]),
    direction: z.enum(["INCREASE", "DECREASE"]).optional(),
    quantity: z.coerce.number().int().positive("Quantity must be greater than zero"),
    reason: z.string().min(1, "Reason is required").max(500),
    remarks: z.string().max(1000).optional().or(z.literal("")),
  })
  .refine((values) => values.adjustmentType !== "MANUAL_ADJUSTMENT" || !!values.direction, {
    message: "Direction is required for a manual adjustment",
    path: ["direction"],
  });

export type StockAdjustmentFormInput = z.input<typeof stockAdjustmentSchema>;
export type StockAdjustmentFormValues = z.output<typeof stockAdjustmentSchema>;

export const reorderLevelSchema = z.object({
  // Kept as a string at the input boundary (rather than z.coerce.number()) so an empty
  // field is rejected as "required" instead of silently coercing "" -> 0.
  reorderLevel: z
    .string()
    .trim()
    .min(1, "Reorder level is required")
    .regex(/^\d+$/, "Reorder level must be a whole number")
    .transform(Number)
    .pipe(z.number().int().min(0, "Reorder level cannot be negative")),
});

export type ReorderLevelFormInput = z.input<typeof reorderLevelSchema>;
export type ReorderLevelFormValues = z.output<typeof reorderLevelSchema>;
