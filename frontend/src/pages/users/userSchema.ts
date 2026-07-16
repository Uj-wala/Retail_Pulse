import { z } from "zod";

export const inviteUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  role: z.enum(["COMPANY_ADMIN", "ANALYST", "VIEWER"]),
});

export type InviteUserFormValues = z.infer<typeof inviteUserSchema>;

export const editUserSchema = z.object({
  role: z.enum(["SUPER_ADMIN", "COMPANY_ADMIN", "ANALYST", "VIEWER"]),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

export type EditUserFormValues = z.infer<typeof editUserSchema>;
