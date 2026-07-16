import { Router } from "express";
import { UserRole } from "@prisma/client";
import * as categoryController from "../controllers/category.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRoles } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validation.middleware.js";
import { createCategorySchema, updateCategorySchema } from "../validators/category.validators.js";

export const categoryRouter = Router();

const canManage = requireRoles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN, UserRole.ANALYST);

/**
 * @swagger
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: List categories
 *     responses:
 *       200:
 *         description: List of categories
 */
categoryRouter.get("/", requireAuth, categoryController.listCategories);

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     tags: [Categories]
 *     summary: Get a category by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category details
 */
categoryRouter.get("/:id", requireAuth, categoryController.getCategory);

/**
 * @swagger
 * /categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a category
 *     responses:
 *       201:
 *         description: Created category
 */
categoryRouter.post(
  "/",
  requireAuth,
  canManage,
  validateBody(createCategorySchema),
  categoryController.createCategory,
);

/**
 * @swagger
 * /categories/{id}:
 *   patch:
 *     tags: [Categories]
 *     summary: Update a category
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated category
 */
categoryRouter.patch(
  "/:id",
  requireAuth,
  canManage,
  validateBody(updateCategorySchema),
  categoryController.updateCategory,
);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category
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
categoryRouter.delete("/:id", requireAuth, canManage, categoryController.deleteCategory);
