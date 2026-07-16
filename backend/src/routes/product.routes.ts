import { Router } from "express";
import { UserRole } from "@prisma/client";
import * as productController from "../controllers/product.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRoles } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validation.middleware.js";
import { createProductSchema, updateProductSchema } from "../validators/product.validators.js";

export const productRouter = Router();

const canManage = requireRoles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.ANALYST);

/**
 * @swagger
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: List products
 *     responses:
 *       200:
 *         description: List of products
 */
productRouter.get("/", requireAuth, productController.listProducts);

/**
 * @swagger
 * /products/low-stock:
 *   get:
 *     tags: [Products]
 *     summary: List products below their reorder threshold
 *     responses:
 *       200:
 *         description: List of low-stock products
 */
productRouter.get("/low-stock", requireAuth, productController.listLowStock);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get a product by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 */
productRouter.get("/:id", requireAuth, productController.getProduct);

/**
 * @swagger
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Create a product
 *     responses:
 *       201:
 *         description: Created product
 */
productRouter.post(
  "/",
  requireAuth,
  canManage,
  validateBody(createProductSchema),
  productController.createProduct,
);

/**
 * @swagger
 * /products/{id}:
 *   patch:
 *     tags: [Products]
 *     summary: Update a product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated product
 */
productRouter.patch(
  "/:id",
  requireAuth,
  canManage,
  validateBody(updateProductSchema),
  productController.updateProduct,
);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
productRouter.delete("/:id", requireAuth, canManage, productController.deleteProduct);
