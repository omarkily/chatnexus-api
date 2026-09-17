import { Request, Response } from 'express';
import { ChannelService } from '../services/channelService';
import { ValidationError, NotFoundError, DatabaseError, AuthorizationError } from '../utils/errors';
import { successResponse, createdResponse, noContentResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';

export class ChannelController {
  private channelService: ChannelService;

  constructor() {
    this.channelService = new ChannelService();
  }

  // GET /api/channels
  getChannels = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Get query parameters
    const userId = req.query.userId as string;
    const includeUser = req.query.includeUser === 'true';

    let channels;
    
    // If userId is provided, get channels for that specific user
    if (userId) {
      // Only allow users to access their own channels or admins to access any channels
      if (req.user?.id !== userId && !req.user?.isAdmin) {
        throw new AuthorizationError('You can only access your own channels');
      }
      
      channels = await this.channelService.getChannelsByUserId(userId);
    } else {
      // If no userId provided, get all channels (admin only) or user's own channels
      if (req.user?.isAdmin) {
        channels = await this.channelService.getAllChannels();
      } else {
        // Regular users can only see their own channels
        if (!req.user?.id) {
          throw new AuthorizationError('User ID is required');
        }
        channels = await this.channelService.getChannelsByUserId(req.user.id);
      }
    }

    successResponse(res, channels);
  });

  // GET /api/channels/:id
  getChannelById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const channelId = req.params.id;
    if (!channelId) {
      throw new ValidationError('Channel ID is required');
    }

    const includeUser = req.query.includeUser === 'true';
    const channel = await this.channelService.getChannelById(channelId, includeUser);
    
    if (!channel) {
      throw new NotFoundError('Channel not found');
    }

    // Only allow users to access their own channels or admins to access any channel
    if (req.user?.id !== channel.user_id.toString() && !req.user?.isAdmin) {
      throw new AuthorizationError('You can only access your own channels');
    }

    successResponse(res, channel);
  });

  // POST /api/channels
  createChannel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, type, data } = req.body;

    // Validate required fields
    if (!name) {
      throw new ValidationError('Channel name is required');
    }

    if (!type) {
      throw new ValidationError('Channel type is required');
    }

    // Get user_id from authentication
    if (!req.user?.id) {
      throw new AuthorizationError('User ID is required');
    }

    const newChannel = await this.channelService.createChannel(
      name,
      type,
      data || {},
      req.user.id
    );

    createdResponse(res, newChannel);
  });

  // PATCH /api/channels/:id
  updateChannel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const channelId = req.params.id;
    if (!channelId) {
      throw new ValidationError('Channel ID is required');
    }

    // Check if channel exists and get ownership info
    const existingChannel = await this.channelService.getChannelById(channelId);
    if (!existingChannel) {
      throw new NotFoundError('Channel not found');
    }

    // Only allow users to update their own channels or admins to update any channel
    if (req.user?.id !== existingChannel.user_id.toString() && !req.user?.isAdmin) {
      throw new AuthorizationError('You can only update your own channels');
    }

    // Extract update data from request body
    const { name, type, data, status } = req.body;
    const updateData = {
      ...(name && { name }),
      ...(type && { type }),
      ...(data !== undefined && { data }),
      ...(status && { status })
    };

    // If no update data provided
    if (Object.keys(updateData).length === 0) {
      throw new ValidationError('At least one field must be provided for update');
    }

    const updatedChannel = await this.channelService.updateChannel(channelId, updateData);
    successResponse(res, updatedChannel);
  });

  // DELETE /api/channels/:id
  deleteChannel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const channelId = req.params.id;
    if (!channelId) {
      throw new ValidationError('Channel ID is required');
    }

    // Check if channel exists and get ownership info
    const existingChannel = await this.channelService.getChannelById(channelId);
    if (!existingChannel) {
      throw new NotFoundError('Channel not found');
    }

    // Only allow users to delete their own channels or admins to delete any channel
    if (req.user?.id !== existingChannel.user_id.toString() && !req.user?.isAdmin) {
      throw new AuthorizationError('You can only delete your own channels');
    }

    await this.channelService.deleteChannel(channelId);
    noContentResponse(res);
  });


} 