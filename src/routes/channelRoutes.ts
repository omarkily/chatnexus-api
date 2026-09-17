import { Router } from "express";
import { ChannelController } from "../controllers/channelController";
import { authenticate, requireScope } from "../middlewares/authMiddleware";
import { SCOPES } from "../utils/constants";
import { ApplicationService } from "../services/applicationService";

const router = Router();
const applicationService = new ApplicationService();
const channelController = new ChannelController();

/**
 * @route GET /api/channels
 * @desc Get all channels (admin) or user's own channels
 * @access Private - requires channels.read scope
 * @query userId - Optional: Get channels for specific user (admin or own channels only)
 * @query includeUser - Optional: Include user information in response
 */
router.get("/", authenticate(applicationService), requireScope([SCOPES.CHANNELS.READ]), channelController.getChannels.bind(channelController));

/**
 * @route GET /api/channels/:id
 * @desc Get channel by ID
 * @access Private - requires channels.read scope
 * @query includeUser - Optional: Include user information in response
 */
router.get("/:id", authenticate(applicationService), requireScope([SCOPES.CHANNELS.READ]), channelController.getChannelById.bind(channelController));

/**
 * @route POST /api/channels
 * @desc Create new channel
 * @access Private - requires channels.write scope
 * @body name - Channel name (required)
 * @body type - Channel type (required)
 * @body data - Channel data JSON object (optional)
 */
router.post("/", authenticate(applicationService), requireScope([SCOPES.CHANNELS.WRITE]), channelController.createChannel.bind(channelController));

/**
 * @route PATCH /api/channels/:id
 * @desc Update channel
 * @access Private - requires channels.update scope
 * @body name - Channel name (optional)
 * @body type - Channel type (optional)
 * @body data - Channel data JSON object (optional)
 * @body status - Channel status (optional)
 */
router.patch("/:id", authenticate(applicationService), requireScope([SCOPES.CHANNELS.UPDATE]), channelController.updateChannel.bind(channelController));

/**
 * @route DELETE /api/channels/:id
 * @desc Delete channel
 * @access Private - requires channels.delete scope
 */
router.delete("/:id", authenticate(applicationService), requireScope([SCOPES.CHANNELS.DELETE]), channelController.deleteChannel.bind(channelController));



export default router; 