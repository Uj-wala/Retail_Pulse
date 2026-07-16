import { z } from "zod";

export const registerSchema = z
  .object({
    companyName: z.string().min(1, "Company name is required"),
    industry: z.string().min(1, "Industry is required"),
    companyEmail: z.string().min(1, "Company email is required").email("Enter a valid email address"),
    companyAddress: z.string().min(1, "Company address is required"),
    companyPhone: z.string().min(1, "Company phone number is required"),
    ownerName: z.string().min(1, "Owner name is required"),
    ownerEmail: z.string().min(1, "Owner email is required").email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be 72 characters or fewer"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
