import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { config } from "../config/env.js";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function generateRefreshToken() {
  const rawToken = crypto.randomBytes(64).toString("base64url");
  return { rawToken, tokenHash: hashRefreshToken(rawToken) };
}

export function hashRefreshToken(rawToken: string) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function refreshTokenExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.refreshTokenDays);
  return expiresAt;
}
