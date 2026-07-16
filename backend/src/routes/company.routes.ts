import { Router } from "express";
import { UserRole } from "@prisma/client";
import * as companyController from "../controllers/company.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRoles } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validation.middleware.js";
import { updateCompanySchema } from "../validators/company.validators.js";

export const companyRouter = Router();

/**
 * @swagger
 * /company:
 *   get:
 *     tags: [Company]
 *     summary: Get the current company
 *     responses:
 *       200:
 *         description: Company details
 */
companyRouter.get("/", requireAuth, companyController.getCompany);

/**
 * @swagger
 * /company:
 *   patch:
 *     tags: [Company]
 *     summary: Update the current company (admin only)
 *     responses:
 *       200:
 *         description: Updated company
 */
companyRouter.patch(
  "/",
  requireAuth,
  requireRoles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN),
  validateBody(updateCompanySchema),
  companyController.updateCompany,
);
