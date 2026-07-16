import { Router } from "express";
import { UserRole } from "@prisma/client";
import * as userController from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRoles } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validation.middleware.js";
import { inviteUserSchema, updateUserSchema } from "../validators/user.validators.js";

export const usersRouter = Router();

const adminOnly = requireRoles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN);

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List users in the current company (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserListResponse'
 *       401:
 *         description: Missing or invalid access token
 *       403:
 *         description: Admin role required
 */
usersRouter.get("/", requireAuth, adminOnly, userController.listUsers);

/**
 * @swagger
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get the current authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Missing or invalid access token
 */
usersRouter.get("/me", requireAuth, userController.getCurrentUser);

/**
 * @swagger
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Invite a new user (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InviteUserRequest'
 *     responses:
 *       201:
 *         description: Invited user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Missing or invalid access token
 *       403:
 *         description: Admin role required
 */
usersRouter.post("/", requireAuth, adminOnly, validateBody(inviteUserSchema), userController.inviteUser);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user by id (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Missing or invalid access token
 *       403:
 *         description: Admin role required
 *       404:
 *         description: User not found
 */
usersRouter.get("/:id", requireAuth, adminOnly, userController.getUser);

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update a user (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       200:
 *         description: Updated user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Missing or invalid access token
 *       403:
 *         description: Admin role required
 *       404:
 *         description: User not found
 */
usersRouter.patch(
  "/:id",
  requireAuth,
  adminOnly,
  validateBody(updateUserSchema),
  userController.updateUser,
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Deactivate a user (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Missing or invalid access token
 *       403:
 *         description: Admin role required
 *       404:
 *         description: User not found
 */
usersRouter.delete("/:id", requireAuth, adminOnly, userController.deactivateUser);
