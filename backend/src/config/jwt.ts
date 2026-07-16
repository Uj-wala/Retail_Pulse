import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import { config } from "./env.js";

export interface AccessTokenPayload {
  sub: string;
  company_id: string;
  role: UserRole;
  type: "access";
}

export function createAccessToken(payload: Omit<AccessTokenPayload, "type">) {
  return jwt.sign({ ...payload, type: "access" }, config.jwtSecret, {
    expiresIn: `${config.accessTokenMinutes}m`,
  });
}

export function decodeAccessToken(token: string) {
  const payload = jwt.verify(token, config.jwtSecret) as AccessTokenPayload;
  if (payload.type !== "access") throw new Error("Invalid token type");
  return payload;
}
