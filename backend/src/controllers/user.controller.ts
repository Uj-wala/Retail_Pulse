import type { Request, Response, NextFunction } from "express";
import { serializeUser } from "../utils/serializers.js";
import { param } from "../utils/request.js";
import * as userService from "../services/user.service.js";

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await userService.listUsers(req.user!.companyId);
    return res.json({ users: users.map(serializeUser), total: users.length });
  } catch (error) {
    return next(error);
  }
}

export async function getCurrentUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getProfile(req.user!.id);
    return res.json({ user: serializeUser(user) });
  } catch (error) {
    return next(error);
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUser(req.user!.companyId, param(req, "id"));
    return res.json({ user: serializeUser(user) });
  } catch (error) {
    return next(error);
  }
}

export async function inviteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.inviteUser(req.user!.companyId, req.user!.id, req.body);
    return res.status(201).json({ user: serializeUser(user) });
  } catch (error) {
    return next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.updateUser(
      req.user!.companyId,
      req.user!.id,
      param(req, "id"),
      req.body,
    );
    return res.json({ user: serializeUser(user) });
  } catch (error) {
    return next(error);
  }
}

export async function deactivateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.deactivateUser(req.user!.companyId, req.user!.id, param(req, "id"));
    return res.json({ user: serializeUser(user) });
  } catch (error) {
    return next(error);
  }
}
