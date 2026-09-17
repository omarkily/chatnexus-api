import { Router } from "express";
import { UserController } from "../controllers/userController";
import { authenticate, requireScope, requireAdmin } from "../middlewares/authMiddleware";
import { SCOPES } from "../utils/constants";
import { ApplicationService } from "../services/applicationService";

const router = Router();
const applicationService = new ApplicationService();
const userController = new UserController();

/**
 * @route GET /api/users
 * @desc Get all users
 * @access Private - requires users.read scope
 */
router.get("/", authenticate(applicationService), requireScope([SCOPES.USERS.READ]), userController.getUsers.bind(userController));

/**
 * @route GET /api/users/:id
 * @desc Get user by ID
 * @access Private - requires users.read scope
 */
router.get("/:id", authenticate(applicationService), requireScope([SCOPES.USERS.READ]), userController.getUserById.bind(userController));

/**
 * @route GET /api/users/:id/integrations
 * @desc Get user with their integrations
 * @access Private - requires users.read scope
 */
router.get("/:id/integrations", authenticate(applicationService), requireScope([SCOPES.USERS.READ]), userController.getUserWithIntegrations.bind(userController));

/**
 * @route POST /api/users
 * @desc Create new user
 * @access Private - requires users.write scope
 */
router.post("/", authenticate(applicationService), requireScope([SCOPES.USERS.WRITE]), userController.createUser.bind(userController));

/**
 * @route PATCH /api/users/:id
 * @desc Update user
 * @access Private - requires users.update scope
 */
router.patch("/:id", authenticate(applicationService), requireScope([SCOPES.USERS.UPDATE]), userController.updateUser.bind(userController));

/**
 * @route DELETE /api/users/:id
 * @desc Delete user
 * @access Private - requires users.delete scope
 */
router.delete("/:id", authenticate(applicationService), requireScope([SCOPES.USERS.DELETE]), userController.deleteUser.bind(userController));

/**
 * @route PATCH /api/users/:id/admin
 * @desc Set or unset a user as admin
 * @access Private - requires admin privileges
 */
router.patch("/:id/admin", authenticate(applicationService), requireAdmin(), userController.setAdminStatus.bind(userController));

export default router;
