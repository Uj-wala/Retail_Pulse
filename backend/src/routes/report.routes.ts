import { Router } from "express";
import * as reportController from "../controllers/report.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const reportRouter = Router();

/**
 * @swagger
 * /reports/sales:
 *   get:
 *     tags: [Reports]
 *     summary: Get the sales report
 *     responses:
 *       200:
 *         description: Sales report
 */
reportRouter.get("/sales", requireAuth, reportController.getSalesReport);

/**
 * @swagger
 * /reports/inventory:
 *   get:
 *     tags: [Reports]
 *     summary: Get the inventory report
 *     responses:
 *       200:
 *         description: Inventory report
 */
reportRouter.get("/inventory", requireAuth, reportController.getInventoryReport);
