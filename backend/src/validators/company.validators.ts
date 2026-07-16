import { z } from "zod";

export const updateCompanySchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  industry: z.string().trim().min(1).max(100).optional(),
  address: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).max(50).optional(),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
