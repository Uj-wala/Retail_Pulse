import type { Request, Response, NextFunction } from "express";
import { serializeCompany, serializeUser } from "../utils/serializers.js";
import * as authService from "../services/auth.service.js";
import { forgotPasswordSchema, refreshSchema } from "../validators/auth.validators.js";

function requestMeta(req: Request) {
  return {
    ipAddress: req.ip || req.socket.remoteAddress || null,
    userAgent: req.header("user-agent") ?? null,
  };
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body, requestMeta(req));
    return res.status(201).json({
      company: serializeCompany(result.company),
      user: serializeUser(result.user),
      message: "Company registered successfully",
    });
  } catch (error) {
    return next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { tokens, user } = await authService.login(req.body, requestMeta(req));
    return res.json({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: "bearer",
      user: serializeUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = refreshSchema.parse(req.body);
    const tokens = await authService.refresh(payload.refresh_token);
    return res.json({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: "bearer",
    });
  } catch (error) {
    return next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = refreshSchema.parse(req.body);
    await authService.logout(payload.refresh_token);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(payload.email);
    return res.json({
      message: "If an account exists for this email, password reset instructions have been sent.",
    });
  } catch (error) {
    return next(error);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.changePassword(req.user!.id, req.body, requestMeta(req));
    return res.json({ message: "Password changed successfully" });
  } catch (error) {
    return next(error);
  }
}
