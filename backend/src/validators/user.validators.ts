import { z } from "zod";
import { UserRole, UserStatus } from "@prisma/client";

export const inviteUserSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  role: z.nativeEnum(UserRole).default(UserRole.VIEWER),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
