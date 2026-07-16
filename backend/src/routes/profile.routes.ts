import { Router } from "express";
import * as profileController from "../controllers/profile.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validation.middleware.js";
import { updateProfileSchema } from "../validators/user.validators.js";

export const profileRouter = Router();

/**
 * @swagger
 * /profile:
 *   get:
 *     tags: [Profile]
 *     summary: Get the current user's profile
 *     responses:
 *       200:
 *         description: Profile details
 */
profileRouter.get("/", requireAuth, profileController.getProfile);

/**
 * @swagger
 * /profile:
 *   patch:
 *     tags: [Profile]
 *     summary: Update the current user's profile
 *     responses:
 *       200:
 *         description: Updated profile
 */
profileRouter.patch("/", requireAuth, validateBody(updateProfileSchema), profileController.updateProfile);
