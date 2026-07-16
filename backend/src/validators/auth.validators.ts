import { z } from "zod";

export const registerSchema = z
  .object({
    company_name: z.string().trim().min(1).max(255),
    industry: z.string().trim().min(1).max(100),
    company_email: z.string().trim().email(),
    company_address: z.string().trim().min(1),
    company_phone: z.string().trim().min(1).max(50),
    owner_name: z.string().trim().min(1).max(255),
    owner_email: z.string().trim().email(),
    password: z.string().min(8).max(72),
    confirm_password: z.string().min(8).max(72),
  })
  .refine((value) => value.password === value.confirm_password, {
    path: ["confirm_password"],
    message: "Password and confirm password do not match",
  });

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1),
    new_password: z.string().min(8).max(72),
    confirm_new_password: z.string().min(8).max(72),
  })
  .refine((value) => value.new_password === value.confirm_new_password, {
    path: ["confirm_new_password"],
    message: "New password and confirm password do not match",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
