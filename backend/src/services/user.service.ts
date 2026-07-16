import { AuditAction, type UserRole } from "@prisma/client";
import { HttpError } from "../utils/httpError.js";
import { hashPassword } from "../utils/security.js";
import { userRepository } from "../repositories/user.repository.js";
import { writeAuditLog } from "./audit.service.js";
import type { InviteUserInput, UpdateUserInput } from "../validators/user.validators.js";

export function listUsers(companyId: string) {
  return userRepository.findManyByCompany(companyId);
}

export async function getUser(companyId: string, id: string) {
  const user = await userRepository.findById(id);
  if (!user || user.companyId !== companyId) throw new HttpError(404, "User not found");
  return user;
}

export async function inviteUser(
  companyId: string,
  invitedBy: string,
  payload: InviteUserInput,
) {
  const email = payload.email.toLowerCase();
  const existing = await userRepository.findByEmail(email);
  if (existing) throw new HttpError(409, "A user with this email already exists");

  const passwordHash = await hashPassword(payload.password);
  const user = await userRepository.create({
    company: { connect: { id: companyId } },
    name: payload.name.trim(),
    email,
    passwordHash,
    role: payload.role as UserRole,
  });

  await writeAuditLog({ action: AuditAction.USER_INVITED, companyId, userId: invitedBy });
  return user;
}

export async function updateUser(
  companyId: string,
  actorId: string,
  id: string,
  payload: UpdateUserInput,
) {
  const target = await getUser(companyId, id);
  const user = await userRepository.update(target.id, payload);
  await writeAuditLog({ action: AuditAction.USER_UPDATED, companyId, userId: actorId });
  return user;
}

export async function deactivateUser(companyId: string, actorId: string, id: string) {
  const target = await getUser(companyId, id);
  if (target.id === actorId) throw new HttpError(400, "You cannot deactivate your own account");
  const user = await userRepository.update(target.id, { status: "INACTIVE" });
  await writeAuditLog({ action: AuditAction.USER_DEACTIVATED, companyId, userId: actorId });
  return user;
}

export async function getProfile(userId: string) {
  const user = await userRepository.findById(userId);
  if (!user) throw new HttpError(404, "User not found");
  return user;
}

export async function updateProfile(userId: string, payload: { name?: string }) {
  return userRepository.update(userId, payload);
}
