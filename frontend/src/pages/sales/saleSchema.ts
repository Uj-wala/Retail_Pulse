import { z } from "zod";

export const saleSchema = z.object({
  customerName: z.string().max(255).optional().or(z.literal("")),
  customerId: z.string().optional().or(z.literal("")),
  saleDate: z.string().optional().or(z.literal("")),
  salesChannel: z.enum(["RETAIL_STORE", "ONLINE_STORE", "MARKETPLACE"]),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER"]),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Select a product"),
        quantity: z.coerce.number().int().positive("Quantity must be greater than zero"),
        unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
        discount: z.coerce.number().min(0, "Discount cannot be negative"),
        tax: z.coerce.number().min(0, "Tax cannot be negative"),
      }),
    )
    .min(1, "Add at least one item"),
}).superRefine((values, ctx) => {
  values.items.forEach((item, index) => {
    if (item.discount > item.unitPrice * item.quantity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items", index, "discount"],
        message: "Discount cannot exceed product value",
      });
    }
  });
});

export type SaleFormInput = z.input<typeof saleSchema>;
export type SaleFormValues = z.output<typeof saleSchema>;
