import { AuditAction, UserRole, UserStatus, type User } from "@prisma/client";
import { prisma } from "../config/database.js";
import { HttpError } from "../utils/httpError.js";
import { hashPassword, verifyPassword, generateRefreshToken, hashRefreshToken, refreshTokenExpiry } from "../utils/security.js";
import { createAccessToken } from "../config/jwt.js";
import { companyRepository } from "../repositories/company.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { refreshTokenRepository } from "../repositories/refreshToken.repository.js";
import { writeAuditLog } from "./audit.service.js";
import type { RegisterInput, LoginInput, ChangePasswordInput } from "../validators/auth.validators.js";

interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

async function issueTokenPair(user: Pick<User, "id" | "companyId" | "role">) {
  const accessToken = createAccessToken({
    sub: user.id,
    company_id: user.companyId,
    role: user.role,
  });
  const { rawToken, tokenHash } = generateRefreshToken();
  await refreshTokenRepository.create({
    user: { connect: { id: user.id } },
    tokenHash,
    expiresAt: refreshTokenExpiry(),
  });
  return { accessToken, refreshToken: rawToken };
}

export async function register(payload: RegisterInput, meta: RequestMeta) {
  const companyEmail = payload.company_email.toLowerCase();
  const ownerEmail = payload.owner_email.toLowerCase();
  const companyName = payload.company_name.trim();

  const existingCompany = await companyRepository.findByEmailOrName(companyEmail, companyName);
  if (existingCompany) {
    throw new HttpError(409, "A company with this name or email is already registered");
  }

  const existingUser = await userRepository.findByEmail(ownerEmail);
  if (existingUser) {
    throw new HttpError(409, "A user with this email already exists");
  }

  const passwordHash = await hashPassword(payload.password);
  const result = await prisma.$transaction(async (tx) => {
    const company = await companyRepository.create(
      {
        name: companyName,
        industry: payload.industry.trim(),
        email: companyEmail,
        address: payload.company_address.trim(),
        phone: payload.company_phone.trim(),
      },
      tx,
    );
    const user = await userRepository.create(
      {
        company: { connect: { id: company.id } },
        name: payload.owner_name.trim(),
        email: ownerEmail,
        passwordHash,
        role: UserRole.COMPANY_ADMIN,
        status: UserStatus.ACTIVE,
      },
      tx,
    );
    await writeAuditLog(
      {
        action: AuditAction.COMPANY_REGISTERED,
        companyId: company.id,
        userId: user.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
      tx,
    );
    return { company, user };
  });

  return result;
}

export async function login(payload: LoginInput, meta: RequestMeta) {
  const email = payload.email.toLowerCase();
  let user = await userRepository.findByEmail(email);

  if (!user) {
    const company = await companyRepository.findByEmailOrName(email, "__no_match__");
    if (company) {
      user = await userRepository.findFirstAdminForCompany(company.id);
    }
  }

  if (!user || !(await verifyPassword(payload.password, user.passwordHash))) {
    await writeAuditLog({
      action: AuditAction.LOGIN_FAILED,
      companyId: user?.companyId,
      userId: user?.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    throw new HttpError(401, "Invalid email or password");
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new HttpError(403, "Account is not active");
  }

  const updatedUser = await userRepository.update(user.id, { lastLogin: new Date() });
  const tokens = await issueTokenPair(updatedUser);

  await writeAuditLog({
    action: AuditAction.USER_LOGIN,
    companyId: updatedUser.companyId,
    userId: updatedUser.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return { tokens, user: updatedUser };
}

export async function refresh(rawRefreshToken: string) {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const tokenRow = await refreshTokenRepository.findByHash(tokenHash);

  if (!tokenRow) throw new HttpError(401, "Invalid refresh token");
  if (tokenRow.revoked) {
    await refreshTokenRepository.revokeAllForUser(tokenRow.userId);
    throw new HttpError(401, "Refresh token has already been used; all sessions revoked");
  }
  if (tokenRow.expiresAt < new Date()) throw new HttpError(401, "Refresh token expired");
  if (tokenRow.user.status !== UserStatus.ACTIVE) throw new HttpError(401, "User is not active");

  await refreshTokenRepository.revoke(tokenRow.id);
  return issueTokenPair(tokenRow.user);
}

export async function logout(rawRefreshToken: string) {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const tokenRow = await refreshTokenRepository.findByHash(tokenHash);

  if (!tokenRow) throw new HttpError(401, "Invalid refresh token");
  if (tokenRow.revoked) return;

  await refreshTokenRepository.revoke(tokenRow.id);
}

export async function forgotPassword(email: string) {
  // Intentionally does not reveal whether the account exists, and does not send
  // an email yet (no email provider is wired up) - this is a placeholder that
  // keeps the request/response contract stable for when one is added.
  await userRepository.findByEmail(email.toLowerCase());
}

export async function changePassword(userId: string, payload: ChangePasswordInput, meta: RequestMeta) {
  const user = await userRepository.findById(userId);
  if (!user || !(await verifyPassword(payload.current_password, user.passwordHash))) {
    throw new HttpError(401, "Current password is incorrect");
  }

  await userRepository.update(user.id, { passwordHash: await hashPassword(payload.new_password) });
  await refreshTokenRepository.revokeAllForUser(user.id);
  await writeAuditLog({
    action: AuditAction.PASSWORD_CHANGED,
    companyId: user.companyId,
    userId: user.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
}
