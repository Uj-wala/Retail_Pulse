import { Router } from "express";
import { UserRole } from "@prisma/client";
import * as saleController from "../controllers/sale.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRoles } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validation.middleware.js";
import { createSaleSchema } from "../validators/sale.validators.js";

export const saleRouter = Router();

const canManage = requireRoles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.ANALYST);

/**
 * @swagger
 * /sales:
 *   get:
 *     tags: [Sales]
 *     summary: List sales
 *     responses:
 *       200:
 *         description: List of sales
 */
saleRouter.get("/", requireAuth, saleController.listSales);

/**
 * @swagger
 * /sales/{id}:
 *   get:
 *     tags: [Sales]
 *     summary: Get a sale by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sale details
 */
saleRouter.get("/:id", requireAuth, saleController.getSale);

/**
 * @swagger
 * /sales:
 *   post:
 *     tags: [Sales]
 *     summary: Record a sale
 *     responses:
 *       201:
 *         description: Created sale
 */
saleRouter.post("/", requireAuth, canManage, validateBody(createSaleSchema), saleController.createSale);

/**
 * @swagger
 * /sales/{id}/refund:
 *   post:
 *     tags: [Sales]
 *     summary: Refund a sale
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Refunded sale
 */
saleRouter.post("/:id/refund", requireAuth, canManage, saleController.refundSale);
