import { Router } from "express";
import * as analyticsController from "../controllers/analytics.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const analyticsRouter = Router();

/**
 * @swagger
 * /analytics/summary:
 *   get:
 *     tags: [Analytics]
 *     summary: Get dashboard summary metrics
 *     responses:
 *       200:
 *         description: Summary metrics
 */
analyticsRouter.get("/summary", requireAuth, analyticsController.getSummary);

/**
 * @swagger
 * /analytics/revenue:
 *   get:
 *     tags: [Analytics]
 *     summary: Get revenue over time
 *     responses:
 *       200:
 *         description: Revenue time series
 */
analyticsRouter.get("/revenue", requireAuth, analyticsController.getRevenueOverTime);

/**
 * @swagger
 * /analytics/top-products:
 *   get:
 *     tags: [Analytics]
 *     summary: Get top-selling products
 *     responses:
 *       200:
 *         description: List of top products
 */
analyticsRouter.get("/top-products", requireAuth, analyticsController.getTopProducts);

/**
 * @swagger
 * /analytics/sales-by-category:
 *   get:
 *     tags: [Analytics]
 *     summary: Get sales breakdown by category
 *     responses:
 *       200:
 *         description: Sales by category
 */
analyticsRouter.get("/sales-by-category", requireAuth, analyticsController.getSalesByCategory);
