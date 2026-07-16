import { Router } from "express";
import { UserRole } from "@prisma/client";
import * as inventoryController from "../controllers/inventory.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRoles } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validation.middleware.js";
import { createInventoryTransactionSchema } from "../validators/inventory.validators.js";

export const inventoryRouter = Router();

const canManage = requireRoles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.ANALYST);

/**
 * @swagger
 * /inventory:
 *   get:
 *     tags: [Inventory]
 *     summary: List inventory transactions
 *     responses:
 *       200:
 *         description: List of inventory transactions
 */
inventoryRouter.get("/", requireAuth, inventoryController.listTransactions);

/**
 * @swagger
 * /inventory:
 *   post:
 *     tags: [Inventory]
 *     summary: Record an inventory transaction
 *     responses:
 *       201:
 *         description: Created transaction
 */
inventoryRouter.post(
  "/",
  requireAuth,
  canManage,
  validateBody(createInventoryTransactionSchema),
  inventoryController.createTransaction,
);
