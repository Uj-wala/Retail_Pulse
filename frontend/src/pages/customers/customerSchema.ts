import { z } from "zod";

export const customerSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(255),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .max(32)
    .regex(/^[0-9+()\-\s]+$/, "Phone number can only contain digits, spaces, and + ( ) -"),
  customerType: z.enum(["RETAIL", "WHOLESALE", "CORPORATE"], { message: "Customer type is required" }),
  dateOfBirth: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || new Date(value) <= new Date(), "Date of birth cannot be in the future"),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional().or(z.literal("")),
  address: z.string().min(1, "Address is required").max(1000),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(100),
  country: z.string().min(1, "Country is required").max(100),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  preferredChannel: z.enum(["RETAIL_STORE", "ONLINE_STORE", "MARKETPLACE"]).optional().or(z.literal("")),
  isActive: z.boolean(),
});

export type CustomerFormInput = z.input<typeof customerSchema>;
export type CustomerFormValues = z.output<typeof customerSchema>;
